import { NextRequest } from "next/server";
import webpush from "web-push";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { fetchMidMarketRate, computeProviderRates } from "@/lib/rates";
import { getCorridorBySlug } from "@/lib/corridors";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // this loops over every active alert — give it room on slower runs

// This route is meant to be called ONLY by Vercel Cron (configured in
// vercel.json), not by users. We gate it with a shared secret rather than
// auth, since cron invocations have no logged-in user.
function isAuthorizedCronRequest(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed if the secret isn't configured at all
  return auth === `Bearer ${expected}`;
}

let webpushConfigured = false;
function ensureWebPushConfigured() {
  if (webpushConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails("mailto:support@nritransfer.com", publicKey, privateKey);
  webpushConfigured = true;
}

interface AlertRow {
  id: string;
  user_id: string;
  type: string;
  label: string;
  threshold_rate: number | null;
  active: boolean;
  last_triggered_at: string | null;
  notify_push: boolean;
  notify_email: boolean;
  corridor_slug: string;
  source_currency: string;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client — this route runs with no logged-in user, so it
  // needs to read across all users' alerts, which RLS would otherwise block.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: "Supabase service role not configured" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  ensureWebPushConfigured();
  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;

  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("active", true)
    .eq("type", "rate");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Group alerts by corridor+currency so we only fetch each rate once,
  // not once per alert — there could be many alerts on the same corridor.
  const byCorridor = new Map<string, AlertRow[]>();
  for (const alert of (alerts || []) as AlertRow[]) {
    const key = `${alert.corridor_slug}_${alert.source_currency}`;
    if (!byCorridor.has(key)) byCorridor.set(key, []);
    byCorridor.get(key)!.push(alert);
  }

  let triggeredCount = 0;
  let pushSent = 0;
  let emailSent = 0;
  const errors: string[] = [];

  for (const [key, alertGroup] of byCorridor) {
    const corridorSlug = alertGroup[0].corridor_slug;
    const sourceCurrency = alertGroup[0].source_currency;
    const corridor = getCorridorBySlug(corridorSlug);

    let rate: number;
    try {
      const { rate: midMarket } = await fetchMidMarketRate(sourceCurrency);
      const providers = computeProviderRates(midMarket, 1000);
      rate = providers[0]?.rate ?? midMarket; // best provider's effective rate, matching what the UI shows as "Best gets"
    } catch (err) {
      errors.push(`Rate fetch failed for ${key}: ${String(err)}`);
      continue;
    }

    for (const alert of alertGroup) {
      if (alert.threshold_rate == null || rate < alert.threshold_rate) continue;

      // Avoid re-notifying for the same trigger every single day once a rate
      // has crossed the threshold — only fire again if it dipped back below
      // and crossed again, OR it's been a while since we last told them.
      if (alert.last_triggered_at) {
        const hoursSinceLastTrigger = (Date.now() - new Date(alert.last_triggered_at).getTime()) / 36e5;
        if (hoursSinceLastTrigger < 20) continue; // already notified within the last day
      }

      triggeredCount++;
      const title = "Rate alert triggered";
      const body = `${corridor?.countryName || "Your"} corridor: ${sourceCurrency} rate is now ${rate.toFixed(2)} — your alert was "${alert.label}".`;
      const url = `/send-money/${corridorSlug}?currency=${sourceCurrency}`;

      if (alert.notify_push) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", alert.user_id);

        for (const sub of subs || []) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth_key },
              },
              JSON.stringify({ title, body, url, tag: `alert-${alert.id}` })
            );
            pushSent++;
            await supabase.from("notification_log").insert({
              alert_id: alert.id, user_id: alert.user_id, channel: "push", rate_at_send: rate, success: true,
            });
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            // 404/410 means the subscription is dead (user cleared site data,
            // uninstalled, etc.) — clean it up so we stop trying forever.
            if (status === 404 || status === 410) {
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
            await supabase.from("notification_log").insert({
              alert_id: alert.id, user_id: alert.user_id, channel: "push", rate_at_send: rate, success: false, error: String(err),
            });
          }
        }
      }

      if (alert.notify_email && resend) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(alert.user_id);
          const email = userData?.user?.email;
          if (email) {
            await resend.emails.send({
              from: "NRI Transfer <alerts@nritransfer.com>",
              to: email,
              subject: title,
              html: `<p>${body}</p><p><a href="https://nritransfer.com${url}">View live rates →</a></p>`,
            });
            emailSent++;
            await supabase.from("notification_log").insert({
              alert_id: alert.id, user_id: alert.user_id, channel: "email", rate_at_send: rate, success: true,
            });
          }
        } catch (err) {
          await supabase.from("notification_log").insert({
            alert_id: alert.id, user_id: alert.user_id, channel: "email", rate_at_send: rate, success: false, error: String(err),
          });
        }
      }

      await supabase.from("alerts").update({ last_triggered_at: new Date().toISOString() }).eq("id", alert.id);
    }
  }

  return Response.json({ ok: true, triggeredCount, pushSent, emailSent, errors });
}
