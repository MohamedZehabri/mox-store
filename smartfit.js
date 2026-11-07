// MOX SMART FIT: واجهة النافذة. المنطق في smartfit-engine.js (قواعد، وليس ذكاءً اصطناعياً).
import { recommend, LIMITS } from "./smartfit-engine.js";
const KEY = "mox_smartfit_v1";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const saved = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); return j && j.h && j.w ? j : null; } catch { return null; } };

export async function loadCharts(sb) {
  try { const { data, error } = await sb.from("size_charts").select("product_id,size,chest_cm,length_cm,shoulder_cm");
    if (error || !data) return {}; const m = {}; data.forEach((r) => (m[r.product_id] ||= []).push(r)); return m; } catch { return {}; }
}

const css = `.sf-bd{position:fixed;inset:0;background:#0d0d0dcc;z-index:50;display:grid;place-items:center;padding:14px;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}.sf-bd.show{opacity:1;visibility:visible}
.sf-m{background:#fff;width:min(460px,100%);max-height:92vh;overflow:auto;border-radius:18px;padding:30px 26px;transform:translateY(22px) scale(.98);transition:transform .35s cubic-bezier(.2,.8,.2,1);position:relative;text-align:center}.sf-bd.show .sf-m{transform:none}
.sf-x{position:absolute;top:14px;left:14px;border:0;background:#f2eee6;border-radius:50%;width:34px;height:34px;cursor:pointer}.sf-eye{color:#9a7957;font-size:11px;letter-spacing:2.5px;font-weight:700}.sf-m h3{margin:6px 0 4px;font-size:24px;font-weight:800}.sf-sub{color:#77736d;font-size:12px;line-height:1.9;margin:0 0 18px}
.sf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:right}.sf-row label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700}.sf-row input{border:1px solid #e8e3dc;border-radius:10px;padding:14px;font-size:18px;text-align:center;outline:none}.sf-row input:focus{border-color:#9a7957}
.sf-chk{display:flex;gap:9px;align-items:flex-start;text-align:right;font-size:11px;color:#77736d;line-height:1.8;margin:16px 0}.sf-btn{width:100%;border:0;background:#111;color:#fff;padding:15px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;transition:.2s}.sf-btn:hover{background:#292622}.sf-btn.alt{background:#f2eee6;color:#111;margin-top:9px}
.sf-size{font-size:96px;font-weight:800;line-height:1.1;margin:6px 0;letter-spacing:2px}.sf-bar{height:6px;background:#eee8de;border-radius:6px;overflow:hidden;margin:6px auto 4px;width:70%}.sf-bar i{display:block;height:100%;background:#9a7957;border-radius:6px;transition:width .8s .2s}.sf-conf{font-size:12px;color:#59564f}
.sf-why{background:#f7f5f1;border-radius:12px;padding:14px;font-size:12px;line-height:2;color:#3b3833;margin:16px 0;text-align:right}.sf-alt{font-size:12px;color:#77736d;margin:0 0 14px}.sf-note{font-size:10.5px;color:#9b968d;line-height:1.8;margin-top:12px}
.sf-q{display:flex;gap:10px;margin-top:14px}.sf-q button{flex:1}.sf-link{background:none;border:0;color:#77736d;font-size:11px;text-decoration:underline;cursor:pointer;margin-top:10px}.fit-link{display:block;width:100%;margin:4px 0;padding:9px;border:1px dashed #9a7957;background:#fbf8f3;color:#6f5539;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer}`;
let root;
function ensure() {
  if (root) return; const st = document.createElement("style"); st.textContent = css; document.head.append(st);
  root = document.createElement("div"); root.className = "sf-bd"; root.innerHTML = '<div class="sf-m" role="dialog" aria-modal="true"><button class="sf-x" aria-label="إغلاق">✕</button><div id="sf-body"></div></div>';
  document.body.append(root); root.addEventListener("click", (e) => { if (e.target === root || e.target.closest(".sf-x")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
const close = () => root && root.classList.remove("show");
const body = () => root.querySelector("#sf-body");

export function openSmartFit({ product: p, chart, card, supabase }) {
  ensure(); const log = (event, extra) => { try { supabase && supabase.from("size_feedback").insert({ product_id: p.id, event, ...extra }).then(() => {}, () => {}); } catch {} };
  const available = p.sizes || []; let pref = null, input = saved();
  const run = () => recommend({ height: input.h, weight: input.w, chart, available, fit: p.fit_type, stretch: p.stretch, pref });

  function form() {
    const s = saved();
    body().innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>جد مقاسك المثالي</h3><p class="sf-sub">أدخل طولك ووزنك فقط. نقارنهما بقياسات هذه القطعة بالذات.</p>
    <div class="sf-row"><label>الطول (سم)<input id="sf-h" type="number" inputmode="numeric" min="${LIMITS.hMin}" max="${LIMITS.hMax}" value="${s ? s.h : ""}" placeholder="175"></label><label>الوزن (كغ)<input id="sf-w" type="number" inputmode="numeric" min="${LIMITS.wMin}" max="${LIMITS.wMax}" value="${s ? s.w : ""}" placeholder="70"></label></div>
    <label class="sf-chk"><input type="checkbox" id="sf-save" ${s ? "checked" : ""}><span>أوافق على حفظ طولي ووزني على هذا الجهاز فقط لتسهيل طلباتي القادمة. لا تُرسل إلى أي خادم، ويمكنني حذفها في أي وقت.</span></label>
    <button class="sf-btn" id="sf-go">اعرض المقاس الموصى به</button><p id="sf-err" class="sf-note" style="color:#a33"></p>${s ? '<button class="sf-link" id="sf-del">حذف قياساتي المحفوظة</button>' : ""}`;
    body().querySelector("#sf-go").onclick = () => { const h = Number(body().querySelector("#sf-h").value), w = Number(body().querySelector("#sf-w").value);
      input = { h, w }; pref = null; const r = run();
      if (r.status === "invalid_input") { body().querySelector("#sf-err").textContent = `أدخل طولاً بين ${LIMITS.hMin} و${LIMITS.hMax} سم ووزناً بين ${LIMITS.wMin} و${LIMITS.wMax} كغ.`; return; }
      if (body().querySelector("#sf-save").checked) localStorage.setItem(KEY, JSON.stringify(input)); else localStorage.removeItem(KEY);
      show(r); };
    const d = body().querySelector("#sf-del"); if (d) d.onclick = () => { localStorage.removeItem(KEY); input = null; form(); };
  }
  function show(r) {
    const b = body();
    if (r.status === "incomplete") { b.innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>لا أستطيع التوصية بدقة</h3><p class="sf-sub">قياسات هذه القطعة غير مكتملة لبعض المقاسات المتوفرة، ولن نخمّن أرقاماً. يرجى اختيار المقاس بنفسك أو التواصل معنا.</p><button class="sf-btn alt" onclick="this.closest('.sf-bd').classList.remove('show')">حسناً</button>`; return; }
    if (r.status === "no_fit") { b.innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>لا مقاس متوفر يناسبك على الأرجح</h3><p class="sf-sub">أقرب مقاس متوفر هو ${esc(r.closest)}، لكنه لا يطابق القَصّة المطلوبة لقياساتك. نقترح التواصل معنا قبل الطلب.</p><button class="sf-btn alt" id="sf-back">تعديل قياساتي</button>`; b.querySelector("#sf-back").onclick = form; return; }
    if (r.status === "ask") { b.innerHTML = `<span class="sf-eye">MOX SMART FIT</span><h3>سؤال واحد فقط</h3><p class="sf-sub">قياساتك بين مقاسين متقاربين. كيف تفضّل القطعة؟</p><div class="sf-q"><button class="sf-btn alt" data-p="snug">ضيقة على الجسم</button><button class="sf-btn alt" data-p="relaxed">مريحة وواسعة</button></div>`;
      b.querySelectorAll("[data-p]").forEach((x) => (x.onclick = () => { pref = x.dataset.p; show(run()); })); return; }
    const fitTxt = { slim: "ضيقة", regular: "عادية", oversized: "واسعة" }[r.fit], stTxt = { none: "", low: " وقماش فيه مرونة خفيفة", high: " وقماش مطاطي" }[r.stretch];
    log("recommended", { recommended_size: r.size, confidence: r.confidence });
    b.innerHTML = `<span class="sf-eye">YOUR RECOMMENDED SIZE</span><h3>مقاسك الموصى به</h3><div class="sf-size">${esc(r.size)}</div>
    <div class="sf-bar"><i style="width:0"></i></div><div class="sf-conf">احتمال أن يناسبك: ${r.confidence}٪ <small>(تقدير إحصائي)</small></div>
    <div class="sf-why">محيط صدرك التقريبي نحو ${r.body} سم (تقدير من الطول والوزن). محيط القطعة بمقاس ${esc(r.size)} نحو ${r.garment} سم، أي مساحة راحة نحو ${r.ease} سم، وهذا مناسب لقصة ${fitTxt}${stTxt}.</div>
    ${r.alt ? `<p class="sf-alt">إن فضّلت قطعة ${r.altSide === "looser" ? "أوسع" : "أضيق"}: جرّب ${esc(r.alt.size)}.</p>` : ""}
    <button class="sf-btn" id="sf-pick">اختر هذا المقاس</button><button class="sf-link" id="sf-edit">تعديل قياساتي</button>
    <p class="sf-note">نتيجة محسوبة بقواعد وقياسات هذه القطعة، وليست ذكاءً اصطناعياً. هي تقدير وقد تختلف حسب بنية الجسم، فإن كنت متردداً سنؤكد معك المقاس قبل الشحن.</p>`;
    requestAnimationFrame(() => setTimeout(() => (b.querySelector(".sf-bar i").style.width = r.confidence + "%"), 50));
    b.querySelector("#sf-edit").onclick = form;
    b.querySelector("#sf-pick").onclick = () => { const sel = card && card.querySelector('[data-opt="size"]');
      if (sel) { sel.value = r.size; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      log("selected", { recommended_size: r.size, selected_size: r.size, confidence: r.confidence }); close();
      const t = document.querySelector("#toast"); if (t) { t.textContent = "تم اختيار المقاس " + r.size; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); } };
  }
  root.classList.add("show");
  if (input) { const r0 = run(); if (r0.status === "invalid_input") form(); else show(r0); } else form();
}
