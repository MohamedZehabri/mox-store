// MOX: صفحة المنتج بأسلوب فاخر. تعمل كطبقة عرض فوق بطاقة المنتج: تضبط خياراتها ثم تضغط زر الإضافة الأصلي،
// فيبقى المخزون والخصم والسلة وMeta كما هي دون تكرار منطق.
import { openSmartFit } from "./smartfit.js";
const link = document.createElement("link"); link.rel = "stylesheet"; link.href = new URL("./luxury.css", import.meta.url).href; document.head.append(link);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => `${Number(n || 0).toLocaleString("fr-DZ")} دج`;
const HEX = { "أسود": "#000", black: "#000", "أبيض": "#fff", white: "#fff", "أحمر": "#c0262d", red: "#c0262d", "أزرق": "#2a5db0", blue: "#2a5db0", "كحلي": "#1b2a4a", navy: "#1b2a4a", "أخضر": "#2f7d4f", green: "#2f7d4f", "زيتي": "#5a5a2e", olive: "#5a5a2e", "بيج": "#d8c3a5", beige: "#d8c3a5", "عسلي": "#c9a36a", honey: "#c9a36a", "رمادي": "#8a8a8a", gray: "#8a8a8a", grey: "#8a8a8a", "بني": "#6b4a2e", brown: "#6b4a2e", "وردي": "#e8a9b8", pink: "#e8a9b8", "أصفر": "#e6c43b", yellow: "#e6c43b", "برتقالي": "#e07b2a", orange: "#e07b2a", "بنفسجي": "#6c4a9c", purple: "#6c4a9c", "كاكي": "#a39a73", khaki: "#a39a73" };
let root;
function ensure() {
  if (root) return; root = document.createElement("div"); root.className = "pdp-bd"; document.body.append(root);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
function close() { if (!root) return; root.classList.remove("show"); document.body.style.overflow = ""; }

export function openPDP({ product: p, card, chart, supabase }) {
  ensure(); const sizes = p.sizes || [], colors = p.colors || [], out = p.stock != null && Number(p.stock) <= 0;
  const q = (s) => card.querySelector(s), maxQty = Number(q("[data-qty]")?.max) || 20;
  let size = "", color = "", qty = 1;
  root.innerHTML = `<button class="pdp-x" aria-label="إغلاق">✕</button><div class="pdp"><div class="pdp-img">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">` : ""}</div><div class="pdp-info">
    <h2>${esc(p.name)}</h2><p class="pdp-price">${money(p.price)}</p>
    ${colors.length ? `<div class="pdp-sec"><p class="pdp-lbl">اللون <span id="pdp-cn">اختر</span></p><div class="pdp-sw">${colors.map((c) => { const h = HEX[String(c).trim().toLowerCase()] || HEX[String(c).trim()]; return h ? `<button data-c="${esc(c)}" style="background:${h}" aria-label="${esc(c)}"></button>` : `<button class="pdp-txt" data-c="${esc(c)}">${esc(c)}</button>`; }).join("")}</div></div>` : ""}
    ${sizes.length ? `<div class="pdp-sec"><p class="pdp-lbl"><b>المقاس</b>${chart.length ? '<button class="pdp-guide" id="pdp-fit">✦ دليل المقاسات: جد مقاسي</button>' : ""}</p><div class="pdp-sizes">${sizes.map((s) => `<button data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>` : ""}
    <div class="pdp-sec"><p class="pdp-lbl">الكمية</p><div class="pdp-qty"><button id="pdp-m" aria-label="−">−</button><span id="pdp-q">1</span><button id="pdp-p" aria-label="+">+</button></div></div>
    <button class="pdp-add" id="pdp-add" ${out ? "disabled" : ""}>${out ? "نفدت الكمية" : "أضف إلى السلة"}</button>
    <p class="pdp-note">الدفع نقداً عند الاستلام. سنتواصل معك لتأكيد الطلب والمقاس قبل الشحن.</p>
    ${p.description ? `<div class="pdp-sec" style="margin-top:22px"><p class="pdp-desc">${esc(p.description)}</p></div>` : ""}</div></div>`;
  const sync = () => {
    root.querySelectorAll("[data-s]").forEach((b) => b.classList.toggle("on", b.dataset.s === size));
    root.querySelectorAll("[data-c]").forEach((b) => b.classList.toggle("on", b.dataset.c === color));
    const cn = root.querySelector("#pdp-cn"); if (cn) cn.textContent = color || "اختر"; root.querySelector("#pdp-q").textContent = qty; };
  root.onclick = (e) => {
    const t = e.target;
    if (t.closest(".pdp-x")) return close();
    const s = t.closest("[data-s]"), c = t.closest("[data-c]");
    if (s) size = s.dataset.s; if (c) color = c.dataset.c;
    if (t.closest("#pdp-m")) qty = Math.max(1, qty - 1); if (t.closest("#pdp-p")) qty = Math.min(maxQty, qty + 1);
    if (t.closest("#pdp-fit")) openSmartFit({ product: p, chart, card, supabase }), watchSize();
    if (t.closest("#pdp-add")) {
      const sel = q('[data-opt="size"]'), col = q('[data-opt="color"]'), qi = q("[data-qty]");
      if (sel) sel.value = size; if (col) col.value = color; if (qi) qi.value = qty;
      const before = document.querySelector("#cart-count").textContent; q("[data-add]")?.click();
      if (document.querySelector("#cart-count").textContent !== before) { close(); document.querySelector("#open-cart").click(); }
    }
    sync();
  };
  // عند اختيار مقاس من SMART FIT يُضبط select البطاقة؛ نقرأه هنا ليظهر مختاراً في الصفحة
  const watchSize = () => { const sel = q('[data-opt="size"]'); if (sel) sel.addEventListener("change", () => { size = sel.value; sync(); }, { once: true }); };
  sync(); root.classList.add("show"); root.scrollTop = 0; document.body.style.overflow = "hidden";
}
