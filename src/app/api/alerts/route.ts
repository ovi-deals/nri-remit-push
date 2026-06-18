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
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ alerts: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { type, label, threshold_rate, recurring_day, recurring_amount } = body;

  if (!type || !label) {
    return Response.json({ error: "type and label are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      type,
      label,
      threshold_rate: threshold_rate ?? null,
      recurring_day: recurring_day ?? null,
      recurring_amount: recurring_amount ?? null,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ alert: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { id, active } = body;

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ alert: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id query param is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
