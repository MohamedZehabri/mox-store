// Meta Pixel + Conversions API bridge (browser side).
// - Pixel ID comes from /api/meta-config (env var META_PIXEL_ID). No secrets live in the browser.
// - Every event gets ONE event_id, sent to the Pixel (eventID) and to /api/meta-event (CAPI) => deduplication.
// - Personal data: only the phone number, SHA-256 hashed in the browser, and only for Lead.
const CURRENCY = "DZD";
let ready = null;
const seenProducts = new Set();

const getCookie = (n) => {
  const m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
};
function getFbc() {
  const c = getCookie("_fbc");
  if (c) return c;
  try {
    const id = new URLSearchParams(location.search).get("fbclid");
    if (!id) return "";
    const k = "mox_fbc";
    let v = sessionStorage.getItem(k);
    if (!v) { v = `fb.1.${Date.now()}.${id}`; sessionStorage.setItem(k, v); }
    return v;
  } catch (_) { return ""; }
}
const waitFbp = async () => {
  for (let i = 0; i < 15; i++) { const v = getCookie("_fbp"); if (v) return v; await new Promise((r) => setTimeout(r, 100)); }
  return "";
};

// MUST stay identical to normalizePhoneDZ in api/_lib.js
export function normalizePhoneDZ(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("213")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return "213" + d;
}
export async function hashPhone(raw) {
  const n = normalizePhoneDZ(raw);
  if (n.length < 11 || !(globalThis.crypto && crypto.subtle)) return undefined;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(n));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const newEventId = (name) => {
  const u = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  return `${name}_${u}`;
};

function loadPixel() {
  if (window.fbq) return;
  const n = (window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
  if (!window._fbq) window._fbq = n;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  const s = document.createElement("script");
  s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
}

function init() {
  if (ready) return ready;
  ready = fetch("/api/meta-config", { credentials: "omit" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !j.pixel_id) return false;
      loadPixel();
      window.fbq("init", j.pixel_id); // no automatic advanced matching: no PII goes to the browser pixel
      return true;
    })
    .catch(() => false);
  return ready;
}

async function send(name, customData, ph) {
  try {
    if (!(await init())) return;
    const event_id = newEventId(name);
    if (customData) window.fbq("track", name, customData, { eventID: event_id });
    else window.fbq("track", name, {}, { eventID: event_id });
    const fbp = await waitFbp();
    await fetch("/api/meta-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name: name,
        event_id,
        event_source_url: location.href.split("#")[0],
        custom_data: customData || undefined,
        user_data: { fbp: fbp || undefined, fbc: getFbc() || undefined, ph: ph || undefined },
      }),
    });
  } catch (_) { /* tracking must never break the store */ }
}

const contentsOf = (lines) => lines.map((x) => ({ id: String(x.id), quantity: x.qty, item_price: Number(x.unit) }));
const common = (lines, value) => ({
  content_type: "product",
  content_ids: lines.map((x) => String(x.id)),
  contents: contentsOf(lines),
  num_items: lines.reduce((s, x) => s + x.qty, 0),
  value: Number(value),
  currency: CURRENCY,
});

export const trackPageView = () => send("PageView");

export function trackViewContent(p) {
  const id = String(p.id);
  if (seenProducts.has(id)) return; // once per product per page load
  seenProducts.add(id);
  send("ViewContent", {
    content_type: "product", content_ids: [id], content_name: p.name,
    contents: [{ id, quantity: 1, item_price: Number(p.price) }],
    value: Number(p.price), currency: CURRENCY,
  });
}

export function trackAddToCart(p, qty) {
  const id = String(p.id), v = Number(p.price) * qty;
  send("AddToCart", {
    content_type: "product", content_ids: [id], content_name: p.name,
    contents: [{ id, quantity: qty, item_price: Number(p.price) }],
    value: Math.round(v * 100) / 100, currency: CURRENCY,
  });
}

export const trackInitiateCheckout = (lines, subtotal) => send("InitiateCheckout", common(lines, subtotal));

export async function trackLead(lines, value, phone) {
  const ph = await hashPhone(phone);
  return send("Lead", common(lines, value), ph);
}

// Browser context stored with the order so the delivery-time Purchase can be matched to the ad click.
export function getOrderMeta() {
  return {
    meta_fbp: getCookie("_fbp") || null,
    meta_fbc: getFbc() || null,
    meta_ua: (navigator.userAgent || "").slice(0, 500) || null,
  };
}
