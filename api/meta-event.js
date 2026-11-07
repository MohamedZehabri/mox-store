"use strict";
// Mirrors browser Pixel events to the Conversions API with the SAME event_id (deduplication).
// Purchase is intentionally NOT accepted here: it is only sent from meta-purchase.js.
const { sha256, r2, clientIp, sendToMeta, logEventError } = require("./_lib");

const ALLOWED = new Set(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Lead"]);
const EVENT_ID = /^[A-Za-z0-9_.:-]{8,80}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const FBP = /^fb\.[0-2]\.\d{10,16}\.\d{1,20}$/;
const FBC = /^fb\.[0-2]\.\d{10,16}\.[A-Za-z0-9_-]{1,300}$/;

// Best-effort per-instance rate limit (serverless instances are ephemeral).
const hits = new Map();
function limited(ip) {
  const now = Date.now(), w = hits.get(ip) || [];
  const recent = w.filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 120;
}

function cleanCustomData(cd, name) {
  if (!cd || typeof cd !== "object" || name === "PageView") return undefined;
  const out = { currency: "DZD" };
  const v = Number(cd.value);
  if (Number.isFinite(v) && v >= 0 && v <= 10000000) out.value = r2(v);
  if (Array.isArray(cd.content_ids)) {
    out.content_ids = cd.content_ids.slice(0, 50).map((x) => String(x).slice(0, 64));
  }
  if (Array.isArray(cd.contents)) {
    out.contents = cd.contents.slice(0, 50).map((c) => ({
      id: String((c && c.id) || "").slice(0, 64),
      quantity: Math.min(1000, Math.max(1, parseInt(c && c.quantity, 10) || 1)),
      item_price: Math.max(0, r2(Number(c && c.item_price) || 0)),
    })).filter((c) => c.id);
  }
  if (out.content_ids || out.contents) out.content_type = "product";
  if (typeof cd.content_name === "string") out.content_name = cd.content_name.slice(0, 200);
  const n = parseInt(cd.num_items, 10);
  if (n >= 1 && n <= 1000) out.num_items = n;
  return out;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false });
    const host = req.headers.host;
    if (req.headers.origin) {
      let oh = "";
      try { oh = new URL(req.headers.origin).host; } catch (_) {}
      if (oh !== host) return res.status(403).json({ ok: false });
    }
    const ip = clientIp(req);
    if (limited(ip)) return res.status(429).json({ ok: false });

    const b = req.body && typeof req.body === "object" ? req.body : {};
    if (!ALLOWED.has(b.event_name) || !EVENT_ID.test(String(b.event_id || ""))) {
      return res.status(400).json({ ok: false, error: "invalid event" });
    }

    let url = `https://${host}/`;
    try {
      const u = new URL(String(b.event_source_url || ""));
      if (u.host === host) { u.hash = ""; url = u.toString().slice(0, 500); }
    } catch (_) {}

    const ud = {
      client_ip_address: ip || undefined,
      client_user_agent: String(req.headers["user-agent"] || "").slice(0, 500),
      country: [sha256("dz")],
    };
    const u = b.user_data || {};
    if (FBP.test(String(u.fbp || ""))) ud.fbp = u.fbp;
    if (FBC.test(String(u.fbc || ""))) ud.fbc = u.fbc;
    if (HEX64.test(String(u.ph || ""))) ud.ph = [u.ph]; // already SHA-256 hashed in the browser

    const event = {
      event_name: b.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: b.event_id,
      event_source_url: url,
      action_source: "website",
      user_data: ud,
    };
    const cd = cleanCustomData(b.custom_data, b.event_name);
    if (cd) event.custom_data = cd;

    const r = await sendToMeta([event]);
    if (!r.ok) {
      console.error("meta-event failed:", b.event_name, r.error);
      await logEventError(b.event_name, b.event_id, r.error);
      return res.status(502).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("meta-event error:", e && e.message);
    return res.status(500).json({ ok: false });
  }
};
