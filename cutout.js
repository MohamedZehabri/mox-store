// MOX Cutout: يحذف الخلفية الموحدة (أبيض/رمادي استوديو) من صورة القطعة ويحوّلها إلى PNG شفاف.
// الطريقة: تعبئة فيضية من حواف الصورة تتوقف عند حدود القطعة، مع تنعيم حافة بسيط.
// آمنة: إن كانت الخلفية غير موحدة (صورة بمحيط، أو القطعة بلون الخلفية) تُرجع null فتبقى الصورة الأصلية كما هي.
const done = new Map();   // url -> blob url الجاهز
const jobs = new Map();   // url -> Promise
let chain = Promise.resolve();
window.MOX_CUT = { done };
const tints = new Map();  // base|hex -> Promise<blob url|null>

const load = (src) => new Promise((res, rej) => {
  const im = new Image();
  const remote = typeof src === "string" && /^https?:/i.test(src);
  if (remote) im.crossOrigin = "anonymous";
  im.onload = () => res(im); im.onerror = () => rej(new Error("load"));
  im.src = typeof src === "string" ? src : URL.createObjectURL(src);
});

function process(im, max) {
  const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(im, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h), px = img.data;   // يرمي SecurityError إن كانت الصورة بلا CORS

  // لون الخلفية من الحواف
  const edge = [];
  for (let x = 0; x < w; x++) { edge.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { edge.push(y * w, y * w + w - 1); }
  let r = 0, g = 0, b = 0;
  edge.forEach((i) => { r += px[i * 4]; g += px[i * 4 + 1]; b += px[i * 4 + 2]; });
  r /= edge.length; g /= edge.length; b /= edge.length;
  if (edge.some((i) => px[i * 4 + 3] < 250)) return null;           // شفافة أصلاً
  const dist = (i) => Math.max(Math.abs(px[i * 4] - r), Math.abs(px[i * 4 + 1] - g), Math.abs(px[i * 4 + 2] - b));
  const avg = edge.reduce((a, i) => a + dist(i), 0) / edge.length;
  if (avg > 24) return null;                                       // خلفية غير موحدة
  const T = Math.min(30, Math.max(12, avg * 3 + 10));

  const seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
  let sp = 0, removed = 0;
  edge.forEach((i) => { if (!seen[i] && dist(i) <= T) { seen[i] = 1; stack[sp++] = i; } });
  while (sp) {
    const i = stack[--sp], x = i % w, y = (i / w) | 0;
    removed++;
    if (x > 0 && !seen[i - 1] && dist(i - 1) <= T) { seen[i - 1] = 1; stack[sp++] = i - 1; }
    if (x < w - 1 && !seen[i + 1] && dist(i + 1) <= T) { seen[i + 1] = 1; stack[sp++] = i + 1; }
    if (y > 0 && !seen[i - w] && dist(i - w) <= T) { seen[i - w] = 1; stack[sp++] = i - w; }
    if (y < h - 1 && !seen[i + w] && dist(i + w) <= T) { seen[i + w] = 1; stack[sp++] = i + w; }
  }
  const ratio = removed / (w * h);
  if (ratio < 0.03 || ratio > 0.9) return null;                    // لم تُحذف خلفية، أو التهمنا القطعة نفسها

  for (let i = 0; i < w * h; i++) if (seen[i]) px[i * 4 + 3] = 0;
  // تنعيم الحافة: بكسلات القطعة المجاورة للخلفية تأخذ شفافية جزئية حسب بعدها عن لون الخلفية
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (seen[i]) continue;
    if (seen[i - 1] || seen[i + 1] || seen[i - w] || seen[i + w]) {
      const a = Math.min(1, Math.max(0, (dist(i) - T) / 22));
      px[i * 4 + 3] = Math.round(255 * (0.35 + 0.65 * a));
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// src: رابط أو File. يرجع { url, blob } أو null. المعالجة تتم واحدة بعد الأخرى حتى لا تتجمد الصفحة.
export function cutout(src, { max = 900 } = {}) {
  const key = typeof src === "string" ? src : null;
  if (key && jobs.has(key)) return jobs.get(key);
  const job = (chain = chain.then(async () => {
    try {
      const im = await load(src), cv = process(im, max);
      if (!cv) return null;
      const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
      const url = URL.createObjectURL(blob);
      if (key) done.set(key, url);
      return { url, blob };
    } catch (e) { return null; }
  }));
  if (key) jobs.set(key, job);
  return job;
}

// ===== تلوين القطعة تلقائياً =====
// يستبدل لون القماش بلون جديد مع الحفاظ على ظلال الطيّات، ويترك الشعارات والطبعات والأزرار بألوانها (لأنها بعيدة عن لون القماش السائد).
const parseHex = (h) => { h = String(h).trim().replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : null; };
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function tint(im, hex) {
  const C = parseHex(hex); if (!C) return null;
  const w = im.naturalWidth, h = im.naturalHeight;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(im, 0, 0);
  const img = ctx.getImageData(0, 0, w, h), px = img.data;
  // لون القماش السائد: أكثر خانة لونية تكراراً بين البكسلات المعتمة
  const bins = new Map();
  for (let i = 0; i < px.length; i += 16) {
    if (px[i + 3] < 220) continue;
    const k = (px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | (px[i + 2] >> 4);
    const e = bins.get(k) || [0, 0, 0, 0]; e[0]++; e[1] += px[i]; e[2] += px[i + 1]; e[3] += px[i + 2]; bins.set(k, e);
  }
  let best = null; bins.forEach((e) => { if (!best || e[0] > best[0]) best = e; });
  if (!best || best[0] < 30) return null;
  const br = best[1] / best[0], bg = best[2] / best[0], bb = best[3] / best[0], Lm = lum(br, bg, bb);
  const wC = clamp(lum(C[0], C[1], C[2]) / 255);
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3]; if (a < 8) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2], L = lum(r, g, b), d = L - Lm;
    const cd = Math.max(Math.abs((r - L) - (br - Lm)), Math.abs((g - L) - (bg - Lm)), Math.abs((b - L) - (bb - Lm)));
    const wt = clamp(1 - (cd - 28) / 16) * clamp(1 - (Math.abs(d) - 70) / 30);   // 1 = قماش، 0 = طبعة/شعار
    if (wt <= 0) continue;
    const f = clamp(1 + d / Math.max(Lm, 90), 0.4, 1.4);
    for (let k = 0; k < 3; k++) {
      const mult = C[k] * (wC > 0.6 ? 0.94 : 1) * f, add = C[k] + d * 0.9;
      const nv = clamp((mult * wC + add * (1 - wC)) / 255) * 255, o = px[i + k];
      px[i + k] = Math.round(o + (nv - o) * wt);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// base: رابط الصورة الأصلية. يرجع blob url للقطعة بعد حذف خلفيتها وتلوينها، أو null إن تعذّر (خلفية غير موحدة، لون غير معروف...)
export function tinted(base, hex) {
  const key = base + "|" + hex;
  if (tints.has(key)) return tints.get(key);
  const job = cutout(base).then(async (r) => {
    if (!r) return null;
    try {
      const cv = tint(await load(r.url), hex); if (!cv) return null;
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      return URL.createObjectURL(blob);
    } catch (e) { return null; }
  });
  tints.set(key, job);
  return job;
}
window.MOX_CUT.tint = tinted;
