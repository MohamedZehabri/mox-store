// MOX SMART FIT v2: ورقة سفلية بتبويبين: "دليل المقاسات" (مثل Temu) و"توصية المقاس". المنطق في smartfit-engine.js (قواعد، وليس ذكاءً اصطناعياً).
import { recommend, LIMITS } from "./smartfit-engine.js";
const KEY = "mox_smartfit_v1", ORG = "#e8871e";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const saved = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); return j && j.h && j.w ? j : null; } catch { return null; } };
const num = (v) => (v == null || v === "" ? null : Number(v));
const rng = (a, b) => (num(a) != null && num(b) != null ? `${num(a)}-${num(b)}` : num(a) != null ? String(num(a)) : "");
// مراكز محيط الصدر العالمي العام (مرجع تقريبي، وليس خاصاً بالمنتج)
const GEN = { XS: 84, S: 92, M: 100, L: 108, XL: 116, XXL: 124, "2XL": 124, "3XL": 132 };

export async function loadCharts(sb) {
  try { const { data, error } = await sb.from("size_charts").select("*");
    if (error || !data) return {}; const m = {}; data.forEach((r) => (m[r.product_id] ||= []).push(r)); return m; } catch { return {}; }
}

const css = `.sf-bd{position:fixed;inset:0;background:#0d0d0dcc;z-index:50;display:grid;place-items:end center;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}.sf-bd.show{opacity:1;visibility:visible}
.sf-m{background:#fff;width:min(500px,100%);height:min(94vh,780px);border-radius:22px 22px 0 0;display:flex;flex-direction:column;transform:translateY(40px);transition:transform .4s cubic-bezier(.2,.8,.2,1);overflow:hidden}.sf-bd.show .sf-m{transform:none}
@media(min-width:700px){.sf-bd{place-items:center}.sf-m{border-radius:22px}}
.sf-top{display:flex;align-items:center;gap:6px;padding:12px 14px 0;border-bottom:1px solid #eee}.sf-x{border:0;background:none;font-size:20px;cursor:pointer;padding:6px 10px}
.sf-tabs{display:flex;flex:1;justify-content:space-around}.sf-tab{border:0;background:none;padding:10px 6px 12px;font:inherit;font-size:15px;font-weight:700;color:#8a8a8a;cursor:pointer;position:relative}.sf-tab.on{color:#000}.sf-tab.on:after{content:"";position:absolute;left:25%;right:25%;bottom:0;height:3px;background:#000;border-radius:3px}
.sf-c{flex:1;overflow:auto;padding:18px;text-align:center}.sf-pane{display:none}.sf-pane.on{display:block}
.sf-eye{color:#9a7957;font-size:11px;letter-spacing:2.5px;font-weight:700}.sf-c h3{margin:6px 0 4px;font-size:22px;font-weight:800}.sf-sub{color:#77736d;font-size:12px;line-height:1.9;margin:0 0 16px}
.sf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:right}.sf-row label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700}.sf-row input{border:1px solid #e8e3dc;border-radius:12px;padding:14px;font-size:18px;text-align:center;outline:none}.sf-row input:focus{border-color:#000}
.sf-chk{display:flex;gap:9px;align-items:flex-start;text-align:right;font-size:11px;color:#77736d;line-height:1.8;margin:16px 0}.sf-btn{width:100%;border:0;background:#000;color:#fff;padding:15px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer}.sf-btn.alt{background:#f2eee6;color:#111;margin-top:9px}
.sf-size{font-size:96px;font-weight:800;line-height:1.1;margin:6px 0;letter-spacing:2px}.sf-bar{height:6px;background:#eee;border-radius:6px;overflow:hidden;margin:6px auto 4px;width:70%}.sf-bar i{display:block;height:100%;background:${ORG};border-radius:6px;transition:width .8s .2s}.sf-conf{font-size:12px;color:#59564f}
.sf-why{background:#f7f5f1;border-radius:12px;padding:14px;font-size:12px;line-height:2;color:#3b3833;margin:16px 0;text-align:right}.sf-alt{font-size:12px;color:#77736d;margin:0 0 14px}.sf-note{font-size:10.5px;color:#9b968d;line-height:1.8;margin-top:12px}
.sf-q{display:flex;gap:10px;margin-top:14px}.sf-q button{flex:1}.sf-link{background:none;border:0;color:#77736d;font-size:11px;text-decoration:underline;cursor:pointer;margin-top:10px}.fit-link{display:block;width:100%;margin:4px 0;padding:9px;border:1px dashed #9a7957;background:#fbf8f3;color:#6f5539;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer}
.sf-fig{display:flex;justify-content:center;gap:6px;margin:0 -6px}.sf-fig svg{width:50%;height:auto}.sf-disc{display:flex;gap:8px;align-items:flex-start;text-align:right;font-size:12px;color:#6b6b6b;line-height:1.8;margin:6px 0 14px}
.sf-sub2{display:flex;border-top:8px solid #f3f3f3;margin:0 -18px}.sf-sub2 button{flex:1;border:0;background:none;padding:14px 6px 12px;font:inherit;font-size:15px;font-weight:700;color:#8a8a8a;cursor:pointer;position:relative}.sf-sub2 button.on{color:#000}.sf-sub2 button.on:after{content:"";position:absolute;left:30%;right:30%;bottom:0;height:3px;background:#000;border-radius:3px}
.sf-tbl{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #e8e8e8;border-radius:10px;overflow:hidden;margin-top:14px;font-size:14px}.sf-tbl th{background:#f6f6f6;padding:13px 6px;font-weight:600;font-size:13px}.sf-tbl td{padding:15px 6px;border-top:1px solid #eee}.sf-tbl td:first-child,.sf-tbl th:first-child{background:#f6f6f6;font-weight:800}.sf-tbl tr.hl td{background:#fdeee2}.sf-tbl tr.hl td:first-child{background:#fbe2cd}
.sf-scroll{overflow-x:auto}.sf-empty{background:#f7f5f1;border-radius:12px;padding:18px;font-size:12px;line-height:2;color:#59564f;margin-top:14px}.sf-model{display:flex;gap:12px;align-items:center;border-top:8px solid #f3f3f3;margin:16px -18px 0;padding:14px 18px;text-align:right;font-size:13px;line-height:1.9;color:#444}
`;
let root;
function ensure() {
  if (root) return; const st = document.createElement("style"); st.textContent = css; document.head.append(st);
  root = document.createElement("div"); root.className = "sf-bd";
  root.innerHTML = '<div class="sf-m" role="dialog" aria-modal="true"><div class="sf-top"><button class="sf-x" aria-label="إغلاق">✕</button><div class="sf-tabs"><button class="sf-tab" data-t="guide">دليل المقاسات</button><button class="sf-tab" data-t="rec">توصية المقاس</button></div></div><div class="sf-c"><div class="sf-pane" id="sf-guide"></div><div class="sf-pane" id="sf-rec"></div></div></div>';
  document.body.append(root); root.addEventListener("click", (e) => { if (e.target === root || e.target.closest(".sf-x")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
const close = () => root && root.classList.remove("show");

const pill = (x, y, t) => { const w = String(t).length * 8 + 20; return `<g><rect x="${x - w / 2}" y="${y - 12}" width="${w}" height="24" rx="12" fill="#fff" stroke="${ORG}" stroke-width="2"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="#111">${esc(t)}</text></g>`; };
function bodySvg(b) {
  const v = (t, d) => (t ? t : d);
  return `<svg viewBox="0 0 190 300"><g fill="none" stroke="#9a9a9a" stroke-width="1.4"><circle cx="85" cy="24" r="14"/><path d="M58 52 Q85 42 112 52 L108 150 L62 150Z"/><path d="M58 52 L40 130 M112 52 L130 130"/><path d="M64 150 L58 280 M106 150 L112 280 M85 150 L85 280"/></g>
  <g fill="none" stroke="${ORG}" stroke-width="2.4"><ellipse cx="85" cy="78" rx="30" ry="7"/><ellipse cx="85" cy="108" rx="24" ry="6"/><ellipse cx="85" cy="138" rx="28" ry="7"/><path d="M160 10 V290" stroke-dasharray="0"/></g>
  ${pill(32, 78, v(b.chest, "الصدر"))}${pill(36, 108, v(b.waist, "الخصر"))}${pill(30, 140, v(b.hip, "الورك"))}${pill(160, 150, v(b.height, "الطول"))}</svg>`;
}
function garmentSvg(g) {
  const v = (t, d) => (t ? t : d);
  return `<svg viewBox="0 0 190 300"><g fill="#fafafa" stroke="#9a9a9a" stroke-width="1.4"><path d="M62 62 L92 54 Q100 64 108 54 L138 62 L172 128 L152 138 L132 100 L132 232 L68 232 L68 100 L48 138 L28 128Z"/></g>
  <g fill="none" stroke="${ORG}" stroke-width="2.4"><path d="M62 62 L138 62"/><path d="M68 150 L132 150"/><path d="M158 56 V232"/></g>
  ${pill(100, 40, v(g.shoulder, "الكتف"))}${pill(100, 170, v(g.chest, "الصدر"))}${pill(158, 144, v(g.length, "الطول"))}</svg>`;
}

export function openSmartFit({ product: p, chart, card, supabase, tab = "guide" }) {
  ensure(); const log = (event, extra) => { try { supabase && supabase.from("size_feedback").insert({ product_id: p.id, event, ...extra }).then(() => {}, () => {}); } catch {} };
  const available = p.sizes || [], byS = Object.fromEntries((chart || []).map((r) => [String(r.size), r]));
  let pref = null, input = saved(), recSize = null, sub = "product", recInit = false;
  const run = () => recommend({ height: input.h, weight: input.w, chart, available, fit: p.fit_type, stretch: p.stretch, pref });
  const rec = () => root.querySelector("#sf-rec"), guide = () => root.querySelector("#sf-guide");
  const isStd = available.some((s) => byS[s] && byS[s].source === "standard");
  const rows = available.map((s) => ({ size: s, ...(byS[s] || {}) }));
  const anyAlt = rows.some((r) => r.alt_label);

  function setTab(t) {
    root.querySelectorAll(".sf-tab").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
    guide().classList.toggle("on", t === "guide"); rec().classList.toggle("on", t === "rec");
    if (t === "guide") renderGuide(); else if (!recInit) { recInit = true; if (input) { const r0 = run(); r0.status === "invalid_input" ? form() : show(r0); } else form(); }
    root.querySelector(".sf-c").scrollTop = 0;
  }
  root.querySelectorAll(".sf-tab").forEach((b) => (b.onclick = () => setTab(b.dataset.t)));

  function table(head, body) { return `<div class="sf-scroll"><table class="sf-tbl"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.join("")}</tbody></table></div>`; }
  function guideTable() {
    const hl = (s) => (s === recSize ? ' class="hl"' : "");
    if (sub === "product") {
      if (isStd) return '<div class="sf-empty">لم تُدخَل بعد قياسات القطعة الفعلية لهذا المنتج، ولن نعرض أرقاماً غير مقاسة. جدول "قياسات الجسم" يعطيك مرجعاً عاماً، أو اطلب من فريقنا القياسات.</div>';
      const cols = [["الكتف", (r) => r.shoulder_cm], ["الصدر (محيط)", (r) => (r.chest_cm ? num(r.chest_cm) * 2 : null)], ["الطول", (r) => r.length_cm]].filter(([, f]) => rows.some((r) => f(r) != null));
      if (!cols.length) return '<div class="sf-empty">لا توجد قياسات قطعة لهذا المنتج بعد.</div>';
      return table(["المقاس", ...(anyAlt ? ["محلي"] : []), ...cols.map((c) => c[0])], rows.map((r) => `<tr${hl(r.size)}><td>${esc(r.size)}</td>${anyAlt ? `<td>${esc(r.alt_label || "")}</td>` : ""}${cols.map(([, f]) => `<td>${f(r) ?? "-"}</td>`).join("")}</tr>`));
    }
    const cols = [["الصدر", (r) => rng(r.body_chest_min, r.body_chest_max)], ["الخصر", (r) => rng(r.body_waist_min, r.body_waist_max)], ["الطول", (r) => rng(r.body_height_min, r.body_height_max)]].filter(([, f]) => rows.some((r) => f(r)));
    if (cols.length) return table(["المقاس", ...(anyAlt ? ["محلي"] : []), ...cols.map((c) => c[0])], rows.map((r) => `<tr${hl(r.size)}><td>${esc(r.size)}</td>${anyAlt ? `<td>${esc(r.alt_label || "")}</td>` : ""}${cols.map(([, f]) => `<td>${f(r) || "-"}</td>`).join("")}</tr>`));
    const g = rows.filter((r) => GEN[String(r.size).toUpperCase()]);
    if (g.length === rows.length && rows.length) return table(["المقاس", "الصدر (مرجع عام)"], rows.map((r) => `<tr${hl(r.size)}><td>${esc(r.size)}</td><td>${GEN[String(r.size).toUpperCase()] - 4}-${GEN[String(r.size).toUpperCase()] + 4}</td></tr>`)) + '<div class="sf-note">مرجع عام تقريبي للمقاسات العالمية، وليس خاصاً بهذا المنتج.</div>';
    return '<div class="sf-empty">لا يتوفر جدول قياسات الجسم لهذا المنتج.</div>';
  }
  function renderGuide() {
    const r = rows.find((x) => x.size === recSize) || rows[Math.floor(rows.length / 2)] || {};
    const g = isStd ? {} : { shoulder: r.shoulder_cm, chest: r.chest_cm ? num(r.chest_cm) * 2 : "", length: r.length_cm };
    const b = { chest: rng(r.body_chest_min, r.body_chest_max), waist: rng(r.body_waist_min, r.body_waist_max), height: rng(r.body_height_min, r.body_height_max) };
    guide().innerHTML = `<div class="sf-fig">${bodySvg(b)}${garmentSvg(g)}</div>
    <div class="sf-disc"><span>ⓘ</span><span>القياسات تؤخذ يدوياً وقد تختلف قليلاً عن الواقع.</span></div>
    <button class="sf-btn" id="sf-gorec">✦ جد مقاسي المثالي</button>
    <div class="sf-sub2"><button data-s="body" class="${sub === "body" ? "on" : ""}">قياسات الجسم</button><button data-s="product" class="${sub === "product" ? "on" : ""}">قياسات القطعة</button></div>
    ${guideTable()}${p.model_note ? `<div class="sf-model"><span style="font-size:28px">🧍</span><span>${esc(p.model_note)}</span></div>` : ""}`;
    guide().querySelector("#sf-gorec").onclick = () => setTab("rec");
    guide().querySelectorAll("[data-s]").forEach((x) => (x.onclick = () => { sub = x.dataset.s; renderGuide(); }));
  }

  function form() {
    const s = saved(), b = rec();
    b.innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>جد مقاسك المثالي</h3><p class="sf-sub">أدخل طولك ووزنك فقط. نقارنهما بقياسات هذه القطعة بالذات.</p>
    <div class="sf-row"><label>الطول (سم)<input id="sf-h" type="number" inputmode="numeric" min="${LIMITS.hMin}" max="${LIMITS.hMax}" value="${s ? s.h : ""}" placeholder="175"></label><label>الوزن (كغ)<input id="sf-w" type="number" inputmode="numeric" min="${LIMITS.wMin}" max="${LIMITS.wMax}" value="${s ? s.w : ""}" placeholder="70"></label></div>
    <label class="sf-chk"><input type="checkbox" id="sf-save" ${s ? "checked" : ""}><span>أوافق على حفظ طولي ووزني على هذا الجهاز فقط لتسهيل طلباتي القادمة. لا تُرسل إلى أي خادم، ويمكنني حذفها في أي وقت.</span></label>
    <button class="sf-btn" id="sf-go">اعرض المقاس الموصى به</button><p id="sf-err" class="sf-note" style="color:#a33"></p>${s ? '<button class="sf-link" id="sf-del">حذف قياساتي المحفوظة</button>' : ""}`;
    b.querySelector("#sf-go").onclick = () => { const h = Number(b.querySelector("#sf-h").value), w = Number(b.querySelector("#sf-w").value);
      input = { h, w }; pref = null; const r = run();
      if (r.status === "invalid_input") { b.querySelector("#sf-err").textContent = `أدخل طولاً بين ${LIMITS.hMin} و${LIMITS.hMax} سم ووزناً بين ${LIMITS.wMin} و${LIMITS.wMax} كغ.`; return; }
      if (b.querySelector("#sf-save").checked) localStorage.setItem(KEY, JSON.stringify(input)); else localStorage.removeItem(KEY);
      show(r); };
    const d = b.querySelector("#sf-del"); if (d) d.onclick = () => { localStorage.removeItem(KEY); input = null; form(); };
  }
  function show(r) {
    const b = rec();
    if (r.status === "incomplete") { b.innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>لا أستطيع التوصية بدقة</h3><p class="sf-sub">قياسات هذه القطعة غير مكتملة لبعض المقاسات المتوفرة، ولن نخمّن أرقاماً. يرجى اختيار المقاس بنفسك أو التواصل معنا.</p><button class="sf-btn alt" id="sf-ok">حسناً</button>`; b.querySelector("#sf-ok").onclick = close; return; }
    if (r.status === "no_fit") { b.innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>لا مقاس متوفر يناسبك على الأرجح</h3><p class="sf-sub">أقرب مقاس متوفر هو ${esc(r.closest)}، لكنه لا يطابق القَصّة المطلوبة لقياساتك. نقترح التواصل معنا قبل الطلب.</p><button class="sf-btn alt" id="sf-back">تعديل قياساتي</button>`; b.querySelector("#sf-back").onclick = form; return; }
    if (r.status === "ask") { b.innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>سؤال واحد فقط</h3><p class="sf-sub">قياساتك بين مقاسين متقاربين. كيف تفضّل القطعة؟</p><div class="sf-q"><button class="sf-btn alt" data-p="snug">ضيقة على الجسم</button><button class="sf-btn alt" data-p="relaxed">مريحة وواسعة</button></div>`;
      b.querySelectorAll("[data-p]").forEach((x) => (x.onclick = () => { pref = x.dataset.p; show(run()); })); return; }
    recSize = r.size;
    const fitTxt = { slim: "ضيقة", regular: "عادية", oversized: "واسعة" }[r.fit], stTxt = { none: "", low: " وقماش فيه مرونة خفيفة", high: " وقماش مطاطي" }[r.stretch];
    log("recommended", { recommended_size: r.size, confidence: r.confidence });
    b.innerHTML = `<span class="sf-eye">YOUR RECOMMENDED SIZE</span><h3>مقاسك الموصى به</h3><div class="sf-size">${esc(r.size)}</div>
    <div class="sf-bar"><i style="width:0"></i></div><div class="sf-conf">احتمال أن يناسبك: ${r.confidence}٪ <small>(تقدير إحصائي)</small></div>
    <div class="sf-why">محيط صدرك التقريبي نحو ${r.body} سم (تقدير من الطول والوزن). محيط القطعة بمقاس ${esc(r.size)} نحو ${r.garment} سم، أي مساحة راحة نحو ${r.ease} سم، وهذا مناسب لقصة ${fitTxt}${stTxt}.${r.standard ? "<br><b>تنبيه:</b> قياسات هذه القطعة غير مُدخلة بعد، فالتوصية مبنية على جدول مقاسات عالمي عام وليست على قياسات القطعة نفسها." : ""}</div>
    ${r.alt ? `<p class="sf-alt">إن فضّلت قطعة ${r.altSide === "looser" ? "أوسع" : "أضيق"}: جرّب ${esc(r.alt.size)}.</p>` : ""}
    <button class="sf-btn" id="sf-pick">اختر هذا المقاس</button><button class="sf-link" id="sf-edit">تعديل قياساتي</button> <button class="sf-link" id="sf-seeg">عرض الجدول</button>
    <p class="sf-note">نتيجة محسوبة بقواعد وقياسات هذه القطعة، وليست ذكاءً اصطناعياً. هي تقدير وقد تختلف حسب بنية الجسم، فإن كنت متردداً سنؤكد معك المقاس قبل الشحن.</p>`;
    requestAnimationFrame(() => setTimeout(() => { const i = b.querySelector(".sf-bar i"); if (i) i.style.width = r.confidence + "%"; }, 50));
    b.querySelector("#sf-edit").onclick = form; b.querySelector("#sf-seeg").onclick = () => setTab("guide");
    b.querySelector("#sf-pick").onclick = () => { const sel = card && card.querySelector('[data-opt="size"]');
      if (sel) { sel.value = r.size; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      log("selected", { recommended_size: r.size, selected_size: r.size, confidence: r.confidence }); close();
      const t = document.querySelector("#toast"); if (t) { t.textContent = "تم اختيار المقاس " + r.size; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); } };
  }
  if (input) { const r0 = run(); if (r0.status === "ok" || r0.status === "ask") { /* نحسب المقاس الموصى به مسبقاً ليُظهَر مظلّلاً في الجدول */ if (r0.status === "ok") recSize = r0.size; } }
  root.classList.add("show"); setTab(tab);
}
