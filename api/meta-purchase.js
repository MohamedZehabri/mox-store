"use strict";
// Sends the Purchase event ONLY when an order reached "تم التسليم", and at most once per order.
// A DB trigger (see meta_setup.sql) creates one row per delivered order in public.meta_events
// (unique on order_id + event_name). This function claims that row, sends it, and records the result.
//   POST  (admin JWT)  : process one order (body.order_id) or sweep pending rows
//   GET   (CRON_SECRET): retry sweep for pending/failed rows (Vercel Cron)
const { DELIVERED, MAX_ATTEMPTS, STALE_SENDING_MS, sha256, r2, hashPhoneDZ, redact, sendToMeta, sb, adminFromJwt } = require("./_lib");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function candidates(orderId, limit) {
  let q = `meta_events?select=*&event_name=eq.Purchase&status=in.(pending,failed,sending)&attempts=lt.${MAX_ATTEMPTS}&order=created_at.asc&limit=${limit}`;
  if (orderId) q += `&order_id=eq.${orderId}`;
  const rows = (await sb(q)) || [];
  const staleBefore = Date.now() - STALE_SENDING_MS;
  return rows.filter((r) => r.status !== "sending" || Date.parse(r.updated_at) < staleBefore);
}

// Optimistic claim: only one concurrent caller can move the row to "sending" for a given attempts value.
async function claim(row) {
  const got = await sb(
    `meta_events?id=eq.${row.id}&attempts=eq.${row.attempts}&status=eq.${row.status}`,
    { method: "PATCH", prefer: "return=representation",
      body: { status: "sending", attempts: row.attempts + 1, updated_at: new Date().toISOString() } }
  );
  return Array.isArray(got) && got.length === 1;
}

function buildPurchase(order, row, host) {
  const items = Array.isArray(order.items) ? order.items : [];
  const contents = items
    .filter((i) => i && i.product_id)
    .map((i) => ({
      id: String(i.product_id),
      quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
      item_price: Math.max(0, r2(Number(i.price) || 0)),
    }));
  const value = r2(contents.reduce((s, c) => s + c.item_price * c.quantity, 0));
  const ph = hashPhoneDZ(order.phone);
  const ud = { country: [sha256("dz")] };
  if (ph) ud.ph = [ph];
  if (order.meta_fbp) ud.fbp = order.meta_fbp;
  if (order.meta_fbc) ud.fbc = order.meta_fbc;
  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: row.event_id,
    user_data: ud,
    custom_data: {
      currency: "DZD",
      value,
      content_type: "product",
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: contents.reduce((s, c) => s + c.quantity, 0),
      order_id: String(order.id),
    },
  };
  if (order.meta_ua) {
    // Order was placed after the tracking upgrade: we have the browser context captured at checkout.
    event.action_source = "website";
    event.event_source_url = `https://${host}/`;
    ud.client_user_agent = order.meta_ua;
  } else {
    // Legacy order without browser context: "website" would be rejected (needs client_user_agent).
    event.action_source = "other";
  }
  return { event, value };
}

async function finish(row, patch) {
  await sb(`meta_events?id=eq.${row.id}`, { method: "PATCH", prefer: "return=minimal",
    body: { ...patch, updated_at: new Date().toISOString() } });
}

async function processRow(row, host) {
  if (!(await claim(row))) return { order_id: row.order_id, result: "claimed_elsewhere" };
  try {
    const orders = await sb(`orders?id=eq.${row.order_id}&select=id,status,phone,items,meta_fbp,meta_fbc,meta_ua&limit=1`);
    const order = Array.isArray(orders) && orders[0];
    if (!order) {
      await finish(row, { status: "failed", last_error: "order not found" });
      return { order_id: row.order_id, result: "failed", error: "order not found" };
    }
    if (order.status !== DELIVERED) {
      // Status was changed back before we sent: put the row back, do not burn an attempt.
      await finish(row, { status: row.status === "sending" ? "pending" : row.status, attempts: row.attempts });
      return { order_id: row.order_id, result: "not_delivered" };
    }
    const { event, value } = buildPurchase(order, row, host);
    if (!(value > 0)) {
      await finish(row, { status: "failed", last_error: "order value is 0: nothing to report" });
      return { order_id: row.order_id, result: "failed", error: "zero value" };
    }
    const r = await sendToMeta([event]);
    if (r.ok) {
      await finish(row, { status: "sent", sent_at: new Date().toISOString(), fbtrace_id: r.fbtrace_id, last_error: null });
      return { order_id: row.order_id, result: "sent" };
    }
    await finish(row, { status: "failed", last_error: redact(r.error), fbtrace_id: r.fbtrace_id || null });
    return { order_id: row.order_id, result: "failed", error: redact(r.error) };
  } catch (e) {
    // Leave a recoverable state: stale "sending" rows are picked up again by the next sweep.
    try { await finish(row, { status: "failed", last_error: redact(e && e.message) }); } catch (_) {}
    return { order_id: row.order_id, result: "failed", error: redact(e && e.message) };
  }
}

module.exports = async (req, res) => {
  try {
    const host = req.headers.host;
    if (req.method === "GET") {
      const secret = process.env.CRON_SECRET;
      if (!secret || (req.headers.authorization || "") !== `Bearer ${secret}`) return res.status(401).json({ ok: false });
      const rows = await candidates(null, 10);
      const results = [];
      for (const row of rows) results.push(await processRow(row, host));
      return res.status(200).json({ ok: true, results });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false });
    const adminId = await adminFromJwt(req.headers.authorization);
    if (!adminId) return res.status(401).json({ ok: false });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const orderId = typeof body.order_id === "string" && UUID.test(body.order_id) ? body.order_id.toLowerCase() : null;
    const rows = await candidates(orderId, orderId ? 1 : 5);
    const results = [];
    for (const row of rows) results.push(await processRow(row, host));
    if (orderId && !results.length) results.push({ order_id: orderId, result: "no_pending_row" });
    return res.status(200).json({ ok: true, results });
  } catch (e) {
    console.error("meta-purchase error:", redact(e && e.message));
    return res.status(500).json({ ok: false });
  }
};
