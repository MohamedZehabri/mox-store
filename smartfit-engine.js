// MOX SMART FIT: محرّك قواعد إحصائي (ليس ذكاءً اصطناعياً). دالة نقية بلا اعتماد على المتصفح.
export const LIMITS = { hMin: 140, hMax: 210, wMin: 35, wMax: 180, bmiMin: 15, bmiMax: 45 };
// نموذج تقريبي لمحيط الصدر (سم) من الطول والوزن. افتراض نمذجة (معايَر لأجسام رجال بالغين)، وليس معياراً طبياً.
export const MODEL = { sigma: 4, band: 4, ease: { slim: 4, regular: 8, oversized: 16 }, stretch: { none: 0, low: 2, high: 5 }, prefShift: 4, maxConfidence: 90, standardCap: 60 };
export const estimateChest = (h, w) => 58.3 + 1.58 * (w / ((h / 100) ** 2)) + 0.45 * (h - 175);
const erf = (x) => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
const cdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const r1 = (n) => Math.round(n * 10) / 10;

// chart: [{size, chest_cm}] (عرض الصدر مسطحاً)، available: مقاسات المنتج المتوفرة، opts: {fit, stretch, pref}
export function recommend({ height, weight, chart, available, fit, stretch, pref }) {
  const h = Number(height), w = Number(weight);
  if (!(h >= LIMITS.hMin && h <= LIMITS.hMax) || !(w >= LIMITS.wMin && w <= LIMITS.wMax)) return { status: "invalid_input" };
  const bmi = w / ((h / 100) ** 2);
  if (bmi < LIMITS.bmiMin || bmi > LIMITS.bmiMax) return { status: "invalid_input" };
  const sizes = (available || []).filter(Boolean);
  const byS = Object.fromEntries((chart || []).map((r) => [String(r.size), Number(r.chest_cm)]));
  const std = sizes.some((s) => (chart || []).some((r) => String(r.size) === s && r.source === "standard"));
  const missing = sizes.filter((s) => !(byS[s] > 0));
  if (!sizes.length || missing.length) return { status: "incomplete", missing };
  const f = MODEL.ease[fit] != null ? fit : "regular", st = MODEL.stretch[stretch] != null ? stretch : "none";
  const shift = pref === "snug" ? -MODEL.prefShift : pref === "relaxed" ? MODEL.prefShift : 0;
  const target = MODEL.ease[f] + shift, credit = MODEL.stretch[st];
  const lo = target - credit - MODEL.band, hi = target + MODEL.band;
  const body = estimateChest(h, w);
  const rows = sizes.map((s) => { const g = 2 * byS[s], ease = g - body;
    const p = cdf((hi - ease) / MODEL.sigma) - cdf((lo - ease) / MODEL.sigma);
    return { size: s, garment: g, ease: r1(ease), p }; }).sort((a, b) => b.p - a.p);
  const best = rows[0], second = rows[1];
  if (best.p < 0.2) return { status: "no_fit", body: r1(body), closest: best.size, ease: best.ease };
  const needsQuestion = !pref && second && second.p > 0 && best.p - second.p < 0.08;
  const alt = second && second.p >= 0.15 ? second : null;
  return { status: needsQuestion ? "ask" : "ok", body: r1(body), size: best.size, garment: r1(best.garment), ease: best.ease, target,
    confidence: Math.min(std ? MODEL.standardCap : MODEL.maxConfidence, Math.round(best.p * 100)), standard: std,
    alt: alt ? { size: alt.size, ease: alt.ease } : null,
    altSide: alt ? (byS[alt.size] > byS[best.size] ? "looser" : "snugger") : null, fit: f, stretch: st };
}
