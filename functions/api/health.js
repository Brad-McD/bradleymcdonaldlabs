// Cloudflare Pages Function: GET /api/health
// Tells the site whether the home-lab model is reachable (drives the online/offline badge).

export async function onRequestGet({ env }) {
  let online = false;
  try {
    const headers = { Authorization: `Bearer ${env.LITELLM_KEY}` };
    if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
      headers["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
      headers["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
    }
    const r = await fetch(`${env.LITELLM_URL}/health/liveliness`, {
      headers,
      signal: AbortSignal.timeout(4000),
    });
    online = r.ok;
  } catch {
    online = false;
  }
  return new Response(JSON.stringify({ online }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
