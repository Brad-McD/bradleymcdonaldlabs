"use strict";

/* =========================================================
   EDIT ME: project phases (update statuses as you progress)
   status: "done" | "progress" | "live"
   ========================================================= */
const PHASES = [
  { title: "a local llm", status: "done", text: "vllm serving mistral-7b instruct (fp8) on an rtx 5070 inside wsl2/ubuntu." },
  { title: "gateway & access control", status: "done", text: "litellm proxy backed by postgres: master key, scoped demo keys and rate limiting." },
  { title: "perimeter", status: "done", text: "cloudflare tunnel with tls and no inbound ports, plus lab network segmentation." },
  { title: "red-team the guardrails", status: "done", text: "prompt-injection and abuse testing from a separate kali attacker box." },
  { title: "detection & monitoring", status: "progress", text: "wazuh collecting gateway and host logs, with alerts on suspicious activity." },
  { title: "this website", status: "live", text: "cloudflare pages, with a server-side function standing between you and the model." },
];
const BADGE_TEXT = { done: "complete", progress: "in progress", live: "live" };

/* Pre-written answers, used when the home lab is offline */
const OFFLINE_ANSWERS = [
  { match: /secur|protect|safe|key/i, text: "Your browser never sees an API key. Messages go to a Cloudflare server-side function, which adds a scoped, rate-limited LiteLLM key and sends them through a Cloudflare Tunnel to Brad's home lab. Wazuh monitors the whole thing." },
  { match: /project|built|how|stack|work/i, text: "It's a self-hosted LLM (Mistral-7B on vLLM) behind a LiteLLM gateway, exposed safely through Cloudflare Tunnel and monitored with Wazuh. Brad built it in six phases. The build log is just above." },
  { match: /hire|brad|why|who/i, text: "Brad is CompTIA Security+ certified with Level 3 qualifications in Cybersecurity and Networking. He's after IT Support, Help Desk or SOC L1 roles around Manchester. He learns by building real systems, like this one, and writing up what breaks." },
  { match: /ignore|system prompt|instruction|jailbreak/i, text: "Nice try. Prompt-injection testing is part of this project. When the live model is online, its system prompt is enforced server-side, so you can't overwrite it from here." },
];

/* ---------- Helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text; // textContent = no HTML injection
  return n;
};
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Footer ---------- */
$("#year").textContent = new Date().getFullYear();
$("#updated").textContent = new Date(document.lastModified)
  .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toLowerCase();

/* ---------- Polaroid: hide gracefully until me.jpg exists ---------- */
const photo = document.querySelector(".polaroid img");
const hidePhoto = () => photo.replaceWith(el("div", "photo-ph mono", "[ your photo here ]"));
if (photo) {
  if (photo.complete && photo.naturalWidth === 0) hidePhoto();
  else photo.addEventListener("error", hidePhoto);
}

/* ---------- Phases ---------- */
const phaseList = $("#phases");
PHASES.forEach((p, i) => {
  const li = el("li", "phase");
  li.append(
    el("span", "phase-num", String(i + 1).padStart(2, "0")),
    el("span", `badge ${p.status}`, BADGE_TEXT[p.status]),
    el("h4", null, p.title),
    el("p", null, p.text)
  );
  phaseList.append(li);
});

/* ---------- "Decrypt" scramble effect ---------- */
const GLYPHS = "█▓▒░<>/\\#$%&*+=01";
function scramble(node) {
  if (node.dataset.done) return;
  node.dataset.done = "1";
  const final = node.textContent;
  if (reducedMotion) return;
  node.setAttribute("aria-label", final);
  let frame = 0;
  const totalFrames = Math.min(48, 18 + final.length * 2);
  const tick = () => {
    const progress = frame / totalFrames;
    node.textContent = [...final].map((ch, i) => {
      if (ch === " ") return " ";
      return i / final.length < progress ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }).join("");
    if (frame++ < totalFrames) requestAnimationFrame(() => setTimeout(tick, 28));
    else node.textContent = final;
  };
  tick();
}

/* ---------- Scroll reveal (+ scramble headings as they appear) ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("visible");
    e.target.querySelectorAll("[data-scramble]").forEach(scramble);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((n) => io.observe(n));
document.querySelectorAll(".hero [data-scramble]").forEach(scramble);

/* ---------- Chat ---------- */
const log = $("#chat-log");
const form = $("#chat-form");
const input = $("#chat-input");
const sendBtn = $("#send-btn");
const counter = $("#counter");
const MAX_HISTORY = 10;
let history = [];
let online = false;

function addMsg(role, text, opts = {}) {
  const m = el("div", `msg ${role}${opts.error ? " error" : ""}`);
  if (opts.tag) m.append(el("span", "tag", opts.tag));
  m.append(document.createTextNode(text));
  log.append(m);
  log.scrollTop = log.scrollHeight;
  return m;
}

function showTyping() {
  const m = el("div", "msg bot typing");
  m.append(el("span"), el("span"), el("span"));
  log.append(m);
  log.scrollTop = log.scrollHeight;
  return m;
}

function setStatus(isOnline) {
  online = isOnline;
  const s = $("#status");
  s.classList.toggle("online", isOnline);
  s.classList.toggle("offline", !isOnline);
  $("#status-text").textContent = isOnline ? "online" : "offline · pre-written answers";
}

async function checkHealth() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    const d = await r.json();
    setStatus(Boolean(d.online));
  } catch {
    setStatus(false);
  }
}

function offlineAnswer(q) {
  const hit = OFFLINE_ANSWERS.find((a) => a.match.test(q));
  return hit ? hit.text : "The live model is offline right now (Brad's PC is probably off). Try asking about the project, how it's secured, or why you should hire Brad.";
}

async function send(text) {
  text = text.trim().slice(0, 500);
  if (!text) return;
  addMsg("user", text);
  input.value = "";
  counter.textContent = "0/500";
  sendBtn.disabled = true;
  const typing = showTyping();

  if (!online) {
    await new Promise((r) => setTimeout(r, 600));
    typing.remove();
    addMsg("bot", offlineAnswer(text), { tag: "pre-written answer (model offline)" });
    sendBtn.disabled = false;
    return;
  }

  history.push({ role: "user", content: text });
  history = history.slice(-MAX_HISTORY);
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const d = await r.json().catch(() => ({}));
    typing.remove();
    if (!r.ok) throw new Error(d.error || "Something went wrong.");
    history.push({ role: "assistant", content: d.reply });
    addMsg("bot", d.reply);
  } catch (err) {
    typing.remove();
    history.pop(); // keep user/assistant turns alternating
    addMsg("bot", err.message, { error: true });
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
input.addEventListener("input", () => { counter.textContent = `${input.value.length}/500`; });
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => send(c.textContent)));

addMsg("bot", "Hi! I'm BradBot, Brad's self-hosted AI. I run on his own GPU, behind everything described above. Ask me about Brad or the project, or try to trick me.");
checkHealth();
