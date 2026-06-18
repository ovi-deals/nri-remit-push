import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("transfer_history")
    .select("*, providers(name, color, bg_color, initial)")
    .eq("user_id", user.id)
    .order("clicked_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ history: data });
}

// Logs a click-through to a provider's affiliate link. Call this right
// before window.open() fires so you have a record even if the user never
// comes back to confirm the transfer.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await request.json();
  const { provider_id, amount_sent, rate_used } = body;

  if (!provider_id || !amount_sent) {
    return Response.json({ error: "provider_id and amount_sent are required" }, { status: 400 });
  }

  // Log the click for analytics even if the user isn't signed in (anonymous click tracking)
  await supabase.from("affiliate_clicks").insert({
    user_id: user?.id ?? null,
    provider_id,
    amount_aud: amount_sent,
    rate_at_click: rate_used ?? null,
  });

  if (!user) {
    // Anonymous users still get to click through, just no personal history saved
    return Response.json({ logged: "anonymous" }, { status: 201 });
  }

  const { data, error } = await supabase
    .from("transfer_history")
    .insert({
      user_id: user.id,
      provider_id,
      amount_sent,
      rate_used: rate_used ?? null,
      status: "clicked",
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ history: data }, { status: 201 });
}
