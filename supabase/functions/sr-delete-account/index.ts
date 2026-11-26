// Supabase Edge Function "sr-delete-account". Deploy with JWT verification ON.
// Deletes the signed-in person's account (Apple requires in-app deletion): cancels any Stripe
// subscription at once, then deletes the auth user (sr_profiles rows cascade).
// Secrets: STRIPE_SECRET_KEY (optional; skipped if missing).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("method", { status: 405, headers: CORS });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data } = await admin.auth.getUser(token);
  const user = data?.user;
  if (!user) return new Response("not signed in", { status: 401, headers: CORS });

  const { data: prof } = await admin.from("sr_profiles").select("stripe_sub").eq("user_id", user.id).maybeSingle();
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (key && prof?.stripe_sub) {
    await fetch("https://api.stripe.com/v1/subscriptions/" + encodeURIComponent(prof.stripe_sub), {
      method: "DELETE", headers: { authorization: "Bearer " + key },
    }).catch(() => {});
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return new Response("delete failed", { status: 500, headers: CORS });
  return new Response(JSON.stringify({ deleted: true }), { headers: { ...CORS, "content-type": "application/json" } });
});
