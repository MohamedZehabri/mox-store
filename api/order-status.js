// api/order-status.js
// MOX AI: order tracking verified by phone number only.
// The phone number is entered in a dedicated form field in the chat UI and sent
// directly to this endpoint. It never passes through Gemini.
//
// Server-only env vars (Vercel):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (never expose in frontend code)

import { createClient } from '@supabase/supabase-js';

// ---------- CONFIG: adjust to the real schema of your `orders` table ----------
const TABLE = 'orders';
const COL = {
  phone: 'phone',            // customer phone column
  id: 'id',                  // order id or order number
  status: 'status',          // order status
  createdAt: 'created_at',   // order date
  total: 'total',            // order total (DZD), remove if absent
  items: 'items',            // products summary (json/text), remove if absent
};
const MAX_ORDERS = 3; // only the latest orders are returned
// ------------------------------------------------------------------------------

// Safe public labels. Unknown statuses fall back to the raw value.
const STATUS_LABELS = {
  pending: 'قيد المراجعة',
  confirmed: 'تم التأكيد',
  processing: 'قيد التحضير',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------- Rate limiting (best effort, in memory per serverless instance) ----------
// For strict limits across instances use Upstash Redis or a Supabase table.
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear(); // avoid unbounded growth
  return arr.length > max;
}

// ---------- Algerian phone normalization ----------
// Accepts 0555123456, 555123456, +213555123456, 00213555123456, 213555123456.
// Returns canonical local form "0555123456" or null.
function normalizePhone(input) {
  if (typeof input !== 'string' || input.length > 30) return null;
  let d = input.replace(/[\s\-().]/g, '');
  // Arabic-Indic digits to Latin
  d = d.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
  d = d.replace(/^\+/, '').replace(/^00/, '');
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith('213')) d = d.slice(3);
  if (!d.startsWith('0')) d = '0' + d;
  return /^0[567]\d{8}$/.test(d) ? d : null;
}

// Formats the phone might have been stored in.
function phoneVariants(local) {
  const bare = local.slice(1);
  return [local, bare, `213${bare}`, `+213${bare}`, `00213${bare}`];
}

function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  return (typeof xf === 'string' ? xf.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Request size / shape validation
  const body = req.body;
  if (!body || typeof body !== 'object' || JSON.stringify(body).length > 500) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return res.status(400).json({
      error: 'invalid_phone',
      message: 'رقم الهاتف غير صحيح. مثال: 0555123456',
    });
  }

  // Limits: per IP and per phone number (stops enumeration and harassment)
  if (limited(`ip:${getIp(req)}`, 8, 10 * 60 * 1000) || limited(`ph:${phone}`, 5, 60 * 60 * 1000)) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'محاولات كثيرة. يرجى المحاولة لاحقاً أو التواصل مع الدعم.',
    });
  }

  try {
    const cols = Object.values(COL).join(',');
    const { data, error } = await supabase
      .from(TABLE)
      .select(cols)
      .in(COL.phone, phoneVariants(phone))
      .order(COL.createdAt, { ascending: false })
      .limit(MAX_ORDERS);

    if (error) throw error;

    // Return only safe fields. No address, no full name, no phone echoed back.
    const orders = (data || []).map((o) => ({
      id: o[COL.id],
      status: STATUS_LABELS[o[COL.status]] || o[COL.status],
      date: o[COL.createdAt],
      total: o[COL.total] ?? null,
      items: o[COL.items] ?? null,
    }));

    return res.status(200).json({ orders });
  } catch (err) {
    // Log without personal data or secrets
    console.error('order-status error:', err?.message || 'unknown');
    return res.status(500).json({
      error: 'server_error',
      message: 'تعذر جلب الطلبات حالياً. حاول لاحقاً.',
    });
  }
}
