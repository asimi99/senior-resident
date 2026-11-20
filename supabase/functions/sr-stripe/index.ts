// Supabase Edge Function "sr-stripe": the Stripe webhook that turns a payment into a Pro plan.
// Deploy with JWT verification OFF. Secret: STRIPE_WEBHOOK_SECRET (from the webhook you add in Stripe).
// In Stripe, send these events to .../functions/v1/sr-stripe:
//   checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

async function verify(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(parts.t + "." + payload));
  const hex = [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
  if (hex.length !== parts.v1.length) return false;
  let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const payload = await req.text();
  if (!secret || !(await verify(payload, req.headers.get("stripe-signature") ?? "", secret))) return new Response("bad signature", { status: 400 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ev = JSON.parse(payload), o = ev.data?.object ?? {};
  const now = new Date().toISOString();

  if (ev.type === "checkout.session.completed" && o.client_reference_id) {
    const { error } = await admin.from("sr_profiles").upsert({
      user_id: o.client_reference_id, plan: "pro", stripe_customer: o.customer ?? null, stripe_sub: o.subscription ?? null,
      current_period_end: null, updated_at: now,
    });
    if (error) return new Response("db", { status: 500 });
  } else if (ev.type === "customer.subscription.created" || ev.type === "customer.subscription.updated" || ev.type === "customer.subscription.deleted") {
    const active = ev.type !== "customer.subscription.deleted" && ["active", "trialing", "past_due"].includes(o.status);
    const end = o.current_period_end ?? o.items?.data?.[0]?.current_period_end;
    const { error } = await admin.from("sr_profiles").update({
      plan: !active ? "free" : (o.status === "trialing" ? "trial" : "pro"), stripe_sub: o.id,
      current_period_end: active && end ? new Date((Number(end) + 3 * 86400) * 1000).toISOString() : null, updated_at: now,
    }).eq("stripe_customer", o.customer);
    if (error) return new Response("db", { status: 500 });
  }
  return new Response("ok");
});
