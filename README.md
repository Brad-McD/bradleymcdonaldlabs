# BradleymcdonaldLabs.com

Source for my portfolio site, [bradleymcdonaldlabs.com](https://bradleymcdonaldlabs.com).

I'm Bradley McDonald, an entry-level IT and cybersecurity professional in Greater Manchester, UK. I hold CompTIA Security+ (SY0-701) and Level 3 qualifications in Cybersecurity and Networking, and I'm looking for IT Support, Help Desk or SOC L1 roles.

The site is static HTML, CSS and JavaScript with no framework, no build step and no trackers. Its main feature is **BradBot**, a chat assistant answered by a language model running on my own hardware at home.

## The home-lab project behind BradBot

BradBot is the front end of a self-hosted LLM project I built and secured in six phases:

| Phase | What I built | Status |
| --- | --- | --- |
| 1. Local LLM | vLLM serving Mistral-7B Instruct (FP8) on an RTX 5070 under WSL2 / Ubuntu | Complete |
| 2. Gateway and access control | LiteLLM proxy backed by PostgreSQL, with a master key, scoped demo keys and rate limiting | Complete |
| 3. Perimeter | Cloudflare Tunnel with TLS and no inbound ports, plus lab network segmentation | Complete |
| 4. Red-teaming the guardrails | Prompt-injection and abuse testing from a separate Kali Linux machine | In progress |
| 5. Detection and monitoring | Wazuh collecting gateway and host logs, with alerts on suspicious activity | Complete |
| 6. This website | Cloudflare Pages, with a server-side function between visitors and the model | Live |

### How a message travels

```
Browser ──► /api/chat (Cloudflare Pages Function, adds the API key server-side)
        ──► Cloudflare Tunnel (TLS, no open ports on my router)
        ──► LiteLLM gateway (scoped key, rate limit) ──► vLLM (Mistral-7B)
```

### Security design

- **No secrets in the browser.** The API key lives only in Cloudflare's encrypted environment variables and is added by the server-side function.
- **Least privilege.** The website uses its own scoped LiteLLM key, limited to one model and rate-limited, separate from the master key.
- **Origin check and input limits.** The function only accepts requests from this site, caps message length and history, and returns generic errors that never leak upstream details.
- **Hardened headers.** A strict Content-Security-Policy, HSTS, `X-Frame-Options: DENY` and a locked-down Permissions-Policy (see [`_headers`](_headers)).
- **Graceful fallback.** When my home lab is offline, the site shows an offline badge and BradBot answers from pre-written replies.
- **Monitored.** Gateway and host logs feed into Wazuh for alerting.

## Repository layout

```
├── index.html          page content
├── styles.css          theme and layout
├── script.js           build-log phases, typing effect and chat logic
├── _headers            security headers for Cloudflare Pages
└── functions/api/
    ├── chat.js         POST /api/chat   → forwards chat to the LiteLLM gateway
    └── health.js       GET  /api/health → powers the online/offline badge
```

## Running it locally

```bash
npx wrangler pages dev .
```

Then open http://localhost:8788. Without the environment variables below, BradBot runs in offline demo mode.

The chat function reads `LITELLM_URL`, `LITELLM_KEY`, `MODEL_NAME` and `ALLOWED_ORIGIN`, plus optional `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` when the tunnel sits behind Cloudflare Access. These are set as Cloudflare Pages environment variables and are never committed.

## Contact

- Email: [11mcdonaldbradley@gmail.com](mailto:11mcdonaldbradley@gmail.com)
- LinkedIn: [bradley-mcdonald](https://www.linkedin.com/in/bradley-mcdonald-334509354/)
- GitHub: [Brad-McD](https://github.com/Brad-McD)
- TryHackMe: [brad.mc](https://tryhackme.com/p/brad.mc)
