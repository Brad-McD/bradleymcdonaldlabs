# Bradley McDonald — Portfolio Site

Static site + Cloudflare Pages Functions. No build step, no framework, no trackers.

```
portfolio/
├── index.html            # page content (edit text here)
├── styles.css            # theme / layout
├── script.js             # typing effect, phases, chat logic (edit PHASES at the top)
├── _headers              # security headers (CSP, HSTS, etc.)
├── cv.pdf                # ← add your CV here
└── functions/api/
    ├── chat.js           # POST /api/chat → LiteLLM (holds the secret key)
    └── health.js         # GET  /api/health → online/offline badge
```

## How the chatbot connects

```
Browser ──► /api/chat (Cloudflare Pages Function, adds secret key)
        ──► https://llm.<your-domain> (cloudflared tunnel)
        ──► LiteLLM :4000 (scoped key + rate limit) ──► vLLM :8000
```
The browser never sees `LITELLM_KEY`. That's the main security point to explain to recruiters.

---

## Step 1: Personalise the content
1. `index.html`: replace the placeholders:
   - `you@example.com`, LinkedIn URL, GitHub URL
   - The two `[Level 3 qualification]` cards
2. `script.js`: check the `PHASES` statuses (`done` / `progress` / `live`) match where you are.
3. Drop your CV in the folder as `cv.pdf` (or remove that button).

## Step 2: Preview locally
```bash
cd portfolio
npx wrangler pages dev .
```
Open http://localhost:8788. The chat will show **offline · demo mode** until Step 4 is done. That's expected.

## Step 3: Create a dedicated demo key in LiteLLM
Use a **separate** key just for the website (not your master key):
```bash
curl -X POST http://localhost:4000/key/generate \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"models":["<your-model-alias>"],"rpm_limit":10,"tpm_limit":20000,"max_budget":0,"key_alias":"portfolio-site"}'
```
📸 Screenshot: the key creation (redact the key) for your write-up.

## Step 4: Expose LiteLLM through your tunnel
In your cloudflared config, add a public hostname (e.g. `llm.<your-domain>`) → `http://localhost:4000`.
**Recommended:** protect that hostname with **Cloudflare Access → Service Auth**, create a Service Token,
and put its ID/secret in the env vars below. Then only your Pages Function can reach LiteLLM.

## Step 5: Deploy to Cloudflare Pages
1. Push the `portfolio/` folder to a GitHub repo.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build command: *(leave empty)* · Output directory: `/`
4. **Settings → Variables and Secrets** (Production):

| Name | Value | Type |
|---|---|---|
| `LITELLM_URL` | `https://llm.<your-domain>` | Text |
| `LITELLM_KEY` | key from Step 3 | **Secret** |
| `MODEL_NAME` | your LiteLLM model alias | Text |
| `ALLOWED_ORIGIN` | `https://<your-domain>` | Text |
| `CF_ACCESS_CLIENT_ID` | service token ID (if using Access) | Text |
| `CF_ACCESS_CLIENT_SECRET` | service token secret | **Secret** |

5. Redeploy → **Custom domains** → add your domain.

## Step 6: Extra hardening (worth adding)
- **WAF rate-limit rule** on `/api/chat` (e.g. 20 requests/min per IP). Security → WAF → Rate limiting rules.
- **Wazuh**: alert on LiteLLM 401/429 spikes from the `portfolio-site` key.
- Run your Phase 4 prompt-injection tests against the **live** URL and document the results.

## Step 7: Verify
- https://securityheaders.com → aim for an **A**
- DevTools → Sources: confirm no key or tunnel hostname appears anywhere
- Turn your PC off → badge should switch to *offline · demo mode*

## Troubleshooting
- **"Conversation roles must alternate"** or a system-role error from Mistral: your vLLM chat template
  may not accept a `system` message. Fix by enforcing the system prompt in LiteLLM instead, or by
  prepending `SYSTEM_PROMPT` to the first user message in `chat.js`.
- **403 from /api/chat**: `ALLOWED_ORIGIN` must match exactly (https, no trailing slash).
- **Always offline**: check `curl https://llm.<your-domain>/health/liveliness` works with the Access headers.
