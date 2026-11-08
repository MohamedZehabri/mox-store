// MOX Smart Cart: لوحة داخل السلة تعتمد على قواعد وبيانات متجرك الحقيقية (أسعار، خصومات، مخزون). ليست ذكاءً اصطناعياً.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const st = document.createElement("style");
st.textContent = `#smart-cart{border-top:1px solid #e8e3dc;padding:12px 0;display:flex;flex-direction:column;gap:10px;font-size:12px}
.sc-box{border-radius:12px;padding:10px 12px;line-height:1.9}.sc-save{background:#fdecec;color:#d71920;font-weight:800}.sc-nudge{background:#f6f6f6}.sc-warn{background:#fff6e5;color:#8a5a00}
.sc-nudge b{color:#d71920}.sc-title{font-weight:800;letter-spacing:1px;font-size:11px;color:#6b6b6b;margin:0}
.sc-sug{display:flex;gap:10px;overflow:auto;padding-bottom:4px}.sc-item{flex:0 0 118px;border:1px solid #e8e3dc;border-radius:12px;padding:8px;text-align:center;cursor:pointer;background:#fff}
.sc-item img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;background:#f1f1f1;display:block}.sc-item strong{display:block;font-size:11px;margin-top:6px}.sc-item span{color:#6b6b6b;font-size:11px}`;
document.head.append(st);
let box;
function render() {
  const M = window.MOX; if (!M) return;
  const drawerTotal = document.querySelector(".cart-total"); if (!drawerTotal) return;
  if (!box) { box = document.createElement("div"); box.id = "smart-cart"; drawerTotal.before(box); }
  const lines = M.cartLines(); if (!lines.length) { box.innerHTML = ""; return; }
  const prods = M.products(), money = M.money, out = [];
  const saved = lines.reduce((s, x) => s + (x.base - x.unit) * x.qty, 0);
  if (saved > 0.5) out.push(`<div class="sc-box sc-save">وفّرت ${money(Math.round(saved))} بفضل خصم الكمية</div>`);
  const seen = new Set();
  for (const x of lines) { if (seen.has(String(x.id))) continue; seen.add(String(x.id));
    const p = prods.find((q) => String(q.id) === String(x.id)); if (!p) continue;
    const q = M.productQty(p.id), max = M.maxFor(p), step = Number(p.discount_step || 0), dmax = Number(p.discount_max || 0);
    if (p.discount_enabled && step > 0 && q < max) {
      const cur = Math.min(step * (q - 1), dmax), nxt = Math.min(step * q, dmax);
      if (nxt > cur) { const now = M.unitPrice(p, q) * q, then = M.unitPrice(p, q + 1) * (q + 1);
        out.push(`<div class="sc-box sc-nudge">أضف قطعة أخرى من «${esc(p.name)}» لتصبح التخفيضة <b>${nxt}٪</b> على كل قطعة. القطعة الإضافية ستكلفك فقط <b>${money(Math.round(then - now))}</b>.</div>`); } }
    if (p.stock != null && q >= Number(p.stock)) out.push(`<div class="sc-box sc-warn">«${esc(p.name)}»: وصلت إلى آخر قطع متوفرة في المخزون.</div>`);
  }
  const inCart = new Set(lines.map((x) => String(x.id))), cats = new Set(lines.map((x) => (prods.find((q) => String(q.id) === String(x.id)) || {}).category));
  const avail = prods.filter((p) => !inCart.has(String(p.id)) && !(p.stock != null && Number(p.stock) <= 0));
  const sug = [...avail.filter((p) => !cats.has(p.category)), ...avail.filter((p) => cats.has(p.category))].slice(0, 4);
  if (sug.length) out.push(`<p class="sc-title">قد يعجبك أيضاً</p><div class="sc-sug">${sug.map((p) => `<div class="sc-item" data-sug="${esc(p.id)}">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : ""}<strong>${esc(p.name)}</strong><span>${money(p.price)}</span></div>`).join("")}</div>`);
  box.innerHTML = out.join("");
}
document.addEventListener("mox:cart", render);
document.addEventListener("click", (e) => { const s = e.target.closest("[data-sug]"); if (!s) return;
  document.querySelector("#close-cart")?.click();
  const card = document.querySelector(`.product-card[data-pid="${CSS.escape(s.dataset.sug)}"]`); if (card) card.click(); else document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); });
