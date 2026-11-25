// Supabase Edge Function "resident". Deploy with JWT verification OFF so people can try it before signing in.
// Secrets: ANTHROPIC_API_KEY (required). Optional: BILLING_LIVE=true, FREE_DAILY, PRO_DAILY, PRO_MONTHLY, EARLY_DAILY, MODEL_QUICK, MODEL_DEFAULT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-sr-used, x-sr-limit, x-sr-plan",
};
const LIVE = (Deno.env.get("BILLING_LIVE") ?? "") === "true";
const FREE_DAILY = Number(Deno.env.get("FREE_DAILY") ?? 5);
const ANON_DAILY = Number(Deno.env.get("ANON_DAILY") ?? 3);   // signed out, per network: the app allows one try per browser. Kept above 1 because a whole hospital can share one address
const PRO_DAILY = Number(Deno.env.get("PRO_DAILY") ?? 40);
const PRO_MONTHLY = Number(Deno.env.get("PRO_MONTHLY") ?? 600);
const CHIEF_DAILY = Number(Deno.env.get("CHIEF_DAILY") ?? 150);   // "unlimited" for one person; fair-use ceiling
const CHIEF_MONTHLY = Number(Deno.env.get("CHIEF_MONTHLY") ?? 1800);
const EARLY_DAILY = Number(Deno.env.get("EARLY_DAILY") ?? 150);
const MODELS: Record<string, string> = {
  quick: Deno.env.get("MODEL_QUICK") ?? "claude-haiku-5-5",
  default: Deno.env.get("MODEL_DEFAULT") ?? "claude-sonnet-5-5",
};

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
const fail = (status: number, msg: string, extra: Record<string, string> = {}) =>
  new Response(msg, { status, headers: { ...CORS, ...extra } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // who is calling, and on which plan
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
    const { data } = await admin.auth.getUser(token);
    userId = data?.user?.id ?? null;
  }
  let plan = "free";
  if (userId && LIVE) {
    const { data } = await admin.from("sr_profiles").select("plan,current_period_end").eq("user_id", userId).maybeSingle();
    if (["pro", "chief", "trial"].includes(data?.plan) && (!data.current_period_end || new Date(data.current_period_end) > new Date())) plan = data.plan === "chief" ? "chief" : "pro";
  }
  let who: string;
  if (userId) who = "u:" + userId;
  else {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    who = "g:" + await sha(ip);
  }

  let body: any;
  try { body = await req.json(); } catch { return fail(400, "bad json"); }
  const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
  for (const im of images) {
    if (typeof im?.data !== "string" || im.data.length > 3_500_000) return fail(413, "image too large");
  }
  let turns: { role: string; content: any }[];
  if (typeof body.input === "string") turns = [{ role: "user", content: body.input.slice(0, 30000) }];
  else if (Array.isArray(body.input)) {
    turns = body.input.slice(-20).map((t: any) => ({
      role: t.role === "assistant" ? "assistant" : "user",
      content: String(t.content ?? "").slice(0, 30000),
    }));
  } else return fail(400, "bad input");
  if (!turns.length || turns[turns.length - 1].role !== "user") return fail(400, "bad input");
  if (images.length) {
    const t = turns[turns.findIndex((x) => x.role === "user")];
    t.content = [
      ...images.map((im: any) => ({ type: "image", source: { type: "base64", media_type: im.media_type || "image/jpeg", data: im.data } })),
      { type: "text", text: t.content },
    ];
  }

  // allowance: a new question counts once. Follow-ups, checks and retries share a generous side bucket.
  const isQuestion = body.kind === "coach";
  const qLimit = !userId ? ANON_DAILY : !LIVE ? EARLY_DAILY : (plan === "chief" ? CHIEF_DAILY : plan === "pro" ? PRO_DAILY : FREE_DAILY);
  const limit = isQuestion ? qLimit : qLimit * 12;
  const { data: n, error } = await admin.rpc("bump_usage", { k: (isQuestion ? "srq:" : "sra:") + who });
  if (error) return fail(500, "usage");
  const meter = { "x-sr-used": String(n), "x-sr-limit": String(limit), "x-sr-plan": LIVE ? plan : "pro" };
  if ((n as number) > limit) return fail(429, "limit", meter);
  if (isQuestion && LIVE && (plan === "pro" || plan === "chief")) {
    // monthly fair-use ceiling so one account cannot cost more than it pays
    const first = new Date(); first.setUTCDate(1);
    const { data: rows } = await admin.from("usage").select("n").eq("key", "srq:" + who).gte("day", first.toISOString().slice(0, 10));
    const month = (rows ?? []).reduce((a: number, r: any) => a + (r.n ?? 0), 0);
    if (month > (plan === "chief" ? CHIEF_MONTHLY : PRO_MONTHLY)) return fail(429, "limit", meter);
  }

  const up = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODELS[body.tier as string] ?? MODELS.default, max_tokens: 16000, stream: true, messages: turns }),
  });
  if (!up.ok || !up.body) return fail(502, "upstream " + up.status, meter);

  // pass the raw stream through untouched
  return new Response(up.body, { headers: { ...CORS, ...meter, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" } });
});
