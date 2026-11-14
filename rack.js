// MOX: hero as a clothing rack. Reads the real products loaded by app.js (window.MOX) and opens the existing PDP.
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const stage = $("#rk-stage"), box = $("#rk-info");
const HANGER = '<svg class="rk-hanger" viewBox="0 0 80 34" aria-hidden="true"><path d="M40 15v-3.5a5 5 0 1 0-5-5M40 15 4 31h72z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
let list = [], items = [], sel = 0, shown = null, first = true, moved = false;

const gap = () => (innerWidth < 600 ? { a: 150, b: 86 } : innerWidth < 1000 ? { a: 230, b: 132 } : { a: 320, b: 180 });
function layout() {
  const g = gap();
  items.forEach((el, i) => {
    const d = i - sel, a = Math.abs(d), x = d === 0 ? 0 : Math.sign(d) * (g.a + (a - 1) * g.b);
    const s = d === 0 ? 1 : Math.max(0.4, 0.58 - 0.06 * (a - 1));
    el.style.transform = `translate3d(${x}px,0,0) scale(${s})`;
    el.style.opacity = a > 3 ? 0 : d === 0 ? 1 : Math.max(0.25, 0.78 - 0.18 * a);
    el.style.zIndex = 20 - a; el.style.pointerEvents = a > 3 ? "none" : "auto"; el.tabIndex = a > 3 ? -1 : 0;
    el.setAttribute("aria-current", d === 0 ? "true" : "false");
  });
  info();
}
function info() {
  const p = list[sel]; if (!p || shown === p.id) return; shown = p.id;
  const fill = () => {
    const out = p.stock != null && Number(p.stock) <= 0, low = p.stock != null && !out && Number(p.stock) <= 5;
    $("#rk-name").textContent = p.name; $("#rk-price").textContent = window.MOX.money(p.price);
    $("#rk-note").textContent = out ? "نفدت الكمية" : low ? `باقي ${Number(p.stock)} قطع فقط` : "";
    box.classList.remove("swap");
  };
  box.classList.add("swap"); reduce || first ? fill() : setTimeout(fill, 170);
}
function go(n) { if (!list.length) return; sel = Math.max(0, Math.min(list.length - 1, n)); layout(); }
function build() {
  if (!stage || !window.MOX) return;
  const keep = list[sel]?.id; list = window.MOX.products();
  if (!list.length) { stage.querySelectorAll(".rk-item").forEach((e) => e.remove()); items = []; $("#rk-name").textContent = "لا توجد منتجات حالياً"; return; }
  sel = Math.max(0, list.findIndex((p) => p.id === keep)); shown = null;
  stage.querySelectorAll(".rk-item").forEach((e) => e.remove());
  stage.insertAdjacentHTML("beforeend", list.map((p, i) => `<button type="button" class="rk-item${first ? " rk-in" : ""}" data-i="${i}" style="--d:${i * 70}ms;${first ? "opacity:0;transform:translate3d(0,-28px,0) scale(.5)" : ""}" aria-label="${esc(p.name)}">${HANGER}${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" draggable="false" ${i < 5 ? "" : 'loading="lazy"'} decoding="async">` : '<span class="rk-ph">MOX</span>'}</button>`).join(""));
  items = [...stage.querySelectorAll(".rk-item")];
  requestAnimationFrame(() => requestAnimationFrame(() => { layout(); if (first) { first = false; setTimeout(() => items.forEach((e) => e.classList.remove("rk-in")), 1400); } }));
}
document.addEventListener("mox:products", build);
if (stage) {
  stage.addEventListener("click", (e) => { if (moved) return; const b = e.target.closest(".rk-item"); if (!b) return; const i = +b.dataset.i; i === sel ? window.MOX.open(list[i].id) : go(i); });
  $("#rk-prev").onclick = () => go(sel - 1); $("#rk-next").onclick = () => go(sel + 1);
  $("#rk-open").onclick = () => list[sel] && window.MOX.open(list[sel].id);
  stage.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(sel - 1); if (e.key === "ArrowRight") go(sel + 1); });
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; moved = false; });
  stage.addEventListener("pointerup", (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) { moved = true; go(sel + (dx < 0 ? 1 : -1)); setTimeout(() => (moved = false), 60); } });
  stage.addEventListener("pointercancel", () => (x0 = null));
  addEventListener("resize", () => items.length && layout());
  if (!reduce) { let t = false; addEventListener("scroll", () => { if (t) return; t = true; requestAnimationFrame(() => { t = false; const y = scrollY; if (y < innerHeight) stage.style.setProperty("--py", y * 0.08 + "px"); }); }, { passive: true }); }
}
