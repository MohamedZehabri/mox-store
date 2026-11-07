"use strict";
// Shared helpers for the Meta Conversions API functions.
// Files starting with "_" are NOT exposed as routes by Vercel.
const crypto = require("crypto");

const DELIVERED = "تم التسليم";
const MAX_ATTEMPTS = 5;
const STALE_SENDING_MS = 5 * 60 * 1000;

const graphVersion = () => process.env.META_GRAPH_VERSION || "v25.0";
const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
const r2 = (n) => Math.round(Number(n) * 100) / 100;

// Algerian numbers -> E.164 digits without "+" (e.g. 0555 12 34 56 -> 213555123456).
// MUST stay identical to normalizePhoneDZ in meta.js (browser).
function normalizePhoneDZ(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("213")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return "213" + d;
}
function hashPhoneDZ(raw) {
  const n = normalizePhoneDZ(raw);
  return n.length >= 11 ? sha256(n) : null;
}

// Remove secrets from any text before it is logged or stored.
function redact(text) {
  let s = String(text == null ? "" : text);
  for (const k of ["META_ACCESS_TOKEN", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"]) {
    const v = process.env[k];
    if (v) s = s.split(v).join("***");
  }
  return s.slice(0, 500);
}

function clientIp(req) {
  const xf = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xf || String(req.headers["x-real-ip"] || "") || (req.socket && req.socket.remoteAddress) || "";
}

// ---- Meta Conversions API ----
async function sendToMeta(events) {
  const pixel = process.env.META_PIXEL_ID, token = process.env.META_ACCESS_TOKEN;
  if (!pixel || !token) return { ok: false, error: "META_PIXEL_ID / META_ACCESS_TOKEN not configured" };
  const body = { data: events, access_token: token };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(pixel)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    let j = null;
    try { j = await r.json(); } catch (_) {}
    if (r.ok && j && Number(j.events_received) >= events.length) {
      return { ok: true, received: j.events_received, fbtrace_id: j.fbtrace_id || null };
    }
    const e = (j && j.error) || {};
    return { ok: false, error: redact(`meta ${r.status} code=${e.code || ""} ${e.message || "unexpected response"}`), fbtrace_id: (j && (j.fbtrace_id || e.fbtrace_id)) || null };
  } catch (err) {
    return { ok: false, error: redact(`meta request failed: ${err && err.name === "AbortError" ? "timeout" : err && err.message}`) };
  } finally {
    clearTimeout(timer);
  }
}

// ---- Supabase REST (service role, server only) ----
function serviceHeaders(extra) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const h = { apikey: key, "Content-Type": "application/json", ...(extra || {}) };
  // New-style secret keys (sb_secret_...) are not JWTs: send them in apikey only.
  if (key && !key.startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  return h;
}
async function sb(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: serviceHeaders(prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = text; }
  if (!r.ok) {
    const err = new Error(redact(`supabase ${r.status} ${typeof json === "object" && json ? json.message || "" : ""}`));
    err.status = r.status;
    throw err;
  }
  return json;
}

// Returns the Supabase user id for a valid JWT whose owner is listed in public.admins, else null.
async function adminFromJwt(authorization) {
  const m = /^Bearer\s+(.+)$/i.exec(authorization || "");
  if (!m) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY || "", Authorization: `Bearer ${m[1]}` },
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  if (!u || !u.id) return null;
  const rows = await sb(`admins?user_id=eq.${encodeURIComponent(u.id)}&select=user_id&limit=1`);
  return Array.isArray(rows) && rows.length ? u.id : null;
}

// Best-effort error log (never throws, never stores PII or secrets).
async function logEventError(event_name, event_id, error) {
  try {
    await sb("meta_event_errors", {
      method: "POST",
      prefer: "return=minimal",
      body: { event_name: String(event_name).slice(0, 50), event_id: String(event_id).slice(0, 100), error: redact(error) },
    });
  } catch (_) {}
}

module.exports = {
  DELIVERED, MAX_ATTEMPTS, STALE_SENDING_MS,
  sha256, r2, normalizePhoneDZ, hashPhoneDZ, redact, clientIp,
  sendToMeta, sb, adminFromJwt, logEventError,
};
