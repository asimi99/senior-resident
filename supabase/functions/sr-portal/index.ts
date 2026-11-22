// Supabase Edge Function "sr-portal": opens Stripe's customer portal for the signed-in user,
// where they cancel, switch between Resident and Chief, change card, and see invoices.
// Deploy with JWT verification ON. Secrets: STRIPE_SECRET_KEY (needs write access to billing portal sessions).
// Optional secret: PORTAL_RETURN_URL (defaults to the web app).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: who } = await admin.auth.getUser(jwt);
  if (!who?.user) return json({ error: "signin" }, 401);
  const { data: prof } = await admin.from("sr_profiles").select("stripe_customer").eq("user_id", who.user.id).maybeSingle();
  if (!prof?.stripe_customer) return json({ error: "nosub" }, 404);
  const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: { authorization: "Bearer " + (Deno.env.get("STRIPE_SECRET_KEY") ?? ""), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ customer: prof.stripe_customer, return_url: Deno.env.get("PORTAL_RETURN_URL") ?? "https://asimi99.github.io/senior-resident/app/" }),
  });
  const s = await r.json();
  if (!r.ok || !s.url) return json({ error: "stripe" }, 502);
  return json({ url: s.url });
});
