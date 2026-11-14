// MOX: hero as a clothing rack. Reads the real products loaded by app.js (window.MOX) and opens the existing PDP.
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const stage = $("#rk-stage"), box = $("#rk-info");
const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="mx-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a553a"/><stop offset=".45" stop-color="#5a3322"/><stop offset="1" stop-color="#2e1a11"/></linearGradient><linearGradient id="mx-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f6"/><stop offset=".5" stop-color="#8d9296"/><stop offset="1" stop-color="#d9dcde"/></linearGradient></defs></svg>';
const HANGER = '<svg class="rk-hanger" viewBox="0 0 120 80" aria-hidden="true"><path d="M60 41V23a8.5 8.5 0 1 1 8.5-8.5" fill="none" stroke="url(#mx-metal)" stroke-width="2.4" stroke-linecap="round"/><rect x="57" y="36" width="6" height="9" rx="1.6" fill="url(#mx-metal)"/><path d="M60 43C50 43 27 52 9 62c-5 3-5 9 1 10 6 1 12-4 18-7 14-7 24-11 32-11s18 4 32 11c6 3 12 8 18 7 6-1 6-7 1-10C93 52 70 43 60 43Z" fill="url(#mx-wood)"/><path d="M60 44.2C51 44.4 29 53 13 61.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".9" stroke-linecap="round"/></svg>';
if (stage) stage.insertAdjacentHTML("afterbegin", DEFS);
let list = [], items = [], sel = 0, shown = null, first = true, moved = false;

const gap = () => (innerWidth < 600 ? { a: 140, b: 82, n: 2 } : innerWidth < 1000 ? { a: 215, b: 126, n: 3 } : { a: 300, b: 172, n: 4 });
function layout() {
  const g = gap();
  items.forEach((el, i) => {
    const d = i - sel, a = Math.abs(d), x = d === 0 ? 0 : Math.sign(d) * (g.a + (a - 1) * g.b);
    const s = d === 0 ? 1 : Math.max(0.52, 0.76 - 0.05 * (a - 1));
    el.style.transform = `translate3d(${x}px,0,0) scale(${s})`;
    el.style.opacity = a > g.n ? 0 : d === 0 ? 1 : Math.max(0.5, 0.95 - 0.12 * a);
    el.style.zIndex = 20 - a; el.style.pointerEvents = a > g.n ? "none" : "auto"; el.tabIndex = a > g.n ? -1 : 0;
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
  stage.insertAdjacentHTML("beforeend", list.map((p, i) => `<button type="button" class="rk-item${first ? " rk-in" : ""}" data-i="${i}" style="--d:${i * 70}ms;${first ? "opacity:0;transform:translate3d(0,-28px,0) scale(.5)" : ""}" aria-label="${esc(p.name)}"><span class="rk-sway">${HANGER}${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" draggable="false" ${i < 5 ? "" : 'loading="lazy"'} decoding="async">` : '<span class="rk-ph">MOX</span>'}</span></button>`).join(""));
  items = [...stage.querySelectorAll(".rk-item")];
  // Real silhouette shadow only for cut-out images (transparent corners); white-background photos stay flat so no box shadow appears.
  items.forEach((el, i) => { const src = list[i].image_url; if (!src) return; const t = new Image(); t.crossOrigin = "anonymous";
    t.onload = () => { try { const c = document.createElement("canvas"); c.width = 24; c.height = 32; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(t, 0, 0, 24, 32); const a = [3, 3 + 4 * 23, 4 * 24 * 31 + 3, 4 * (24 * 32 - 1) + 3].map((k) => x.getImageData(0, 0, 24, 32).data[k]); if (a.every((v) => v < 40)) el.classList.add("rk-cut"); } catch (e) { /* cross-origin: keep flat */ } };
    t.src = src; });
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

let last = Date.now();
document.addEventListener("mox:products", () => (last = Date.now()));
document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - last > 60000 && window.MOX?.reload) { last = Date.now(); window.MOX.reload(); } });
