// MOX Rack: يعرض منتجات المتجر الحقيقية على شماعة. لا يغيّر منطق السلة أو المخزون أو الخصم أو Meta:
// يقرأ بطاقات #product-grid التي يرسمها app.js (فتبقى البحث والتصنيفات كما هي)، وعند طلب التفاصيل يضغط على البطاقة الأصلية
// تماماً كما يفعل assistant.js وsmartcart.js، فتفتح صفحة المنتج (PDP) الموجودة.
import { cutout } from "./cutout.js";
const grid = document.querySelector("#product-grid");
if (grid) {
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (window.MOX?.money ? window.MOX.money(n) : `${Number(n || 0).toLocaleString("fr-DZ")} دج`);
  const HEX = { "أسود": "#111", black: "#111", "أبيض": "#fff", white: "#fff", "أحمر": "#c0262d", red: "#c0262d", "أزرق": "#2a5db0", blue: "#2a5db0", "كحلي": "#1b2a4a", navy: "#1b2a4a", "أخضر": "#2f7d4f", green: "#2f7d4f", "زيتي": "#5a5a2e", olive: "#5a5a2e", "بيج": "#d8c3a5", beige: "#d8c3a5", "عسلي": "#c9a36a", honey: "#c9a36a", "رمادي": "#8a8a8a", gray: "#8a8a8a", grey: "#8a8a8a", "بني": "#6b4a2e", brown: "#6b4a2e", "وردي": "#e8a9b8", pink: "#e8a9b8", "أصفر": "#e6c43b", yellow: "#e6c43b", "برتقالي": "#e07b2a", orange: "#e07b2a", "بنفسجي": "#6c4a9c", purple: "#6c4a9c", "كاكي": "#a39a73", khaki: "#a39a73" };
  const hexOf = (c) => HEX[String(c).trim().toLowerCase()] || HEX[String(c).trim()] || "";
  const HANGER = '<svg class="rk-hanger" viewBox="0 0 40 34" aria-hidden="true"><path d="M20 13c0-3.2 3.2-3.6 3.2-7.2a3.5 3.5 0 1 0-6.4 1.8" fill="none" stroke="#6f6f6d" stroke-width="1.7" stroke-linecap="round"/><path d="M20 13 3.4 27.6c-1.1 1-.4 3 1.2 3h30.8c1.6 0 2.3-2 1.2-3L20 13z" fill="none" stroke="#6f6f6d" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  const ARROW = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  const root = document.createElement("section");
  root.className = "rk"; root.id = "rack"; root.setAttribute("aria-label", "MOX");
  root.innerHTML = `<button type="button" class="rk-nav rk-prev" aria-label="السابق" hidden>${ARROW("m15 5-7 7 7 7")}</button><div class="rk-track" tabindex="0"><div class="rk-row"></div></div><button type="button" class="rk-nav rk-next" aria-label="التالي" hidden>${ARROW("m9 5 7 7-7 7")}</button><div class="rk-info" aria-live="polite"></div>`;
  grid.before(root); grid.classList.add("rk-src");
  const track = root.querySelector(".rk-track"), row = root.querySelector(".rk-row"), infoEl = root.querySelector(".rk-info");
  const prevBtn = root.querySelector(".rk-prev"), nextBtn = root.querySelector(".rk-next");

  let items = [], sel = "", raf = 0;
  const colorOf = {};
  const done = window.MOX_CUT.done;
  const cutUrl = (u) => done.get(u) || u;
  // الصورة المعروضة: صورة اللون المختار إن وُجدت، وإلا الصورة الرئيسية، وإلا أول صورة لون
  const imgFor = (p, color) => (color && (p.color_images || {})[color]) || p.image_url || Object.values(p.color_images || {})[0] || "";
  const cutIt = (img, url) => { cutout(url).then((r) => { if (r && img.isConnected && img.dataset.src === url) { img.src = r.url; img.classList.add("rk-cut"); } }); };
  const nudge = (slot) => { const s = slot?.querySelector(".rk-swing"); if (!s || reduce) return; s.classList.remove("rk-nudge"); void s.offsetWidth; s.classList.add("rk-nudge"); };
  const cols = () => (innerWidth < 700 ? 3 : 4);
  const slotOf = (id) => [...row.children].find((s) => s.dataset.id === id);
  const cardOf = (id) => grid.querySelector(`.product-card[data-pid="${CSS.escape(String(id))}"]`);

  function tagsHTML(colors) {
    const n = cols();
    return colors.map((c, i) => {
      const col = i % n, r = Math.floor(i / n), h = hexOf(c);
      const d = 16 + (col % 2) * 14 + r * 52;
      return `<button type="button" class="rk-tag" data-color="${esc(c)}" aria-label="${esc(c)}" aria-pressed="false" style="--c:${col};--r:${r ? 1 : 0};--d:${d}px"><i class="rk-str"></i><b class="rk-card"${h ? ` style="--cc:${h}"` : ""}>${h ? "" : esc(String(c).trim().slice(0, 3))}</b></button>`;
    }).join("");
  }
  function slotHTML(p, i) {
    const colors = p.colors || [], n = cols();
    const tw = colors.length ? Math.min(colors.length, n) * 30 + 14 + (colors.length > n ? 15 : 0) : 0;
    return `<div class="rk-slot" data-id="${esc(p.id)}" style="--i:${i};--tw:${tw}px"><div class="rk-fig"><button type="button" class="rk-hit" aria-label="${esc(p.name)}" aria-pressed="false"><span class="rk-swing">${HANGER}${imgFor(p, colorOf[p.id]) ? (u => `<img class="rk-img${done.has(u) ? " rk-cut" : ""}" src="${esc(cutUrl(u))}" data-src="${esc(u)}" alt="${esc(p.name)}" draggable="false">`)(imgFor(p, colorOf[p.id])) : '<span class="rk-ph">✧</span>'}</span></button></div>${colors.length ? `<div class="rk-tags" role="group" aria-label="ألوان القطعة">${tagsHTML(colors)}</div>` : ""}</div>`;
  }

  function render() {
    const list = window.MOX?.products?.() || [];
    const byId = new Map(list.map((p) => [String(p.id), p]));
    items = [...grid.querySelectorAll(".product-card[data-pid]")].map((c) => byId.get(c.dataset.pid)).filter(Boolean);
    if (!items.length) {
      sel = "";
      row.innerHTML = `<div class="rk-empty">${esc(grid.textContent.trim())}</div>`;
    } else {
      if (sel && !items.some((p) => String(p.id) === sel)) sel = "";
      row.innerHTML = items.map(slotHTML).join("");
    }
    root.style.setProperty("--tw-max", Math.max(0, ...items.map((p) => ((p.colors || []).length ? Math.min(p.colors.length, cols()) * 30 + 14 + (p.colors.length > cols() ? 15 : 0) : 0))) + "px");
    row.querySelectorAll(".rk-img:not(.rk-cut)").forEach((im) => cutIt(im, im.dataset.src));
    paint(false); layoutNav();
  }

  // تبديل صورة القطعة عند تغيّر اللون: تتلاشى الصورة، تُستبدل، ثم تظهر مع اهتزاز خفيف على الشماعة
  function swapImage(id) {
    const p = items.find((x) => String(x.id) === String(id)), slot = slotOf(id), img = slot?.querySelector(".rk-img");
    if (!p || !img) return;
    const want = imgFor(p, colorOf[id]); if (!want || img.dataset.src === want) return;
    const token = (img._t = (img._t || 0) + 1);
    const go = () => {
      if (img._t !== token) return;
      const src = cutUrl(want), pre = new Image();
      pre.onload = pre.onerror = () => {
        if (img._t !== token) return;
        img.classList.add("rk-fade");
        setTimeout(() => {
          if (img._t !== token) return;
          img.dataset.src = want; img.src = src; img.classList.toggle("rk-cut", done.has(want));
          requestAnimationFrame(() => img.classList.remove("rk-fade")); nudge(slot);
        }, reduce ? 0 : 170);
      };
      pre.src = src;
    };
    Promise.race([cutout(want), new Promise((r) => setTimeout(r, 1500))]).then(go);
  }

  function paint(scroll) {
    root.classList.toggle("rk--sel", !!sel);
    [...row.children].forEach((s) => {
      const on = !!sel && s.dataset.id === sel;
      s.classList.toggle("is-sel", on);
      s.querySelector(".rk-hit")?.setAttribute("aria-pressed", on);
      s.querySelectorAll(".rk-tag").forEach((t) => { const a = on && colorOf[sel] === t.dataset.color; t.classList.toggle("on", a); t.setAttribute("aria-pressed", a); });
    });
    info(); layoutNav();
    if (scroll && sel) follow(slotOf(sel), 720);
  }

  function info() {
    const p = items.find((x) => String(x.id) === sel);
    if (!p) { infoEl.innerHTML = items.length ? '<p class="rk-hint">اختر قطعة من الشماعة لمعاينتها</p>' : ""; return; }
    const out = !cardOf(p.id)?.querySelector("[data-add]");
    infoEl.innerHTML = `<h3 class="rk-name" dir="auto">${esc(p.name)}</h3><p class="rk-price">${money(p.price)}</p>${(p.colors || []).length ? `<p class="rk-color">${colorOf[sel] ? `<span>اللون</span> <b>${esc(colorOf[sel])}</b>` : ""}</p>` : ""}${out ? '<p class="rk-out">نفدت الكمية</p>' : ""}<button type="button" class="rk-more">التفاصيل والمقاسات</button>`;
  }

  function layoutNav() {
    const many = items.length > 1;
    const overflow = track.scrollWidth - track.clientWidth > 4;
    const show = many && (!!sel || overflow);
    prevBtn.hidden = nextBtn.hidden = !show;
  }

  // يبقي القطعة المختارة في منتصف المسار أثناء توسّعها
  function center(slot) {
    if (!slot) return;
    const t = track.getBoundingClientRect(), f = slot.getBoundingClientRect();
    track.scrollLeft += (f.left + f.width / 2) - (t.left + t.width / 2);
  }
  function follow(slot, ms) {
    cancelAnimationFrame(raf);
    if (reduce) { center(slot); return; }
    const t0 = performance.now();
    const tick = () => { center(slot); if (performance.now() - t0 < ms) raf = requestAnimationFrame(tick); };
    tick();
  }
  ["touchstart", "wheel", "pointerdown"].forEach((ev) => track.addEventListener(ev, () => cancelAnimationFrame(raf), { passive: true }));

  function select(id) {
    sel = id ? String(id) : ""; paint(true);
    const p = items.find((x) => String(x.id) === sel);
    if (p) { nudge(slotOf(sel)); Object.values(p.color_images || {}).forEach((u) => cutout(u)); } // تجهيز صور الألوان مسبقاً
  }
  function step(dir) {
    if (sel) { const i = items.findIndex((p) => String(p.id) === sel); select(items[(i + dir + items.length) % items.length].id); }
    else track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }
  function openDetails() {
    const card = cardOf(sel); if (!card) return;
    const c = colorOf[sel];
    card.click(); // يفتح PDP الأصلي
    if (c) [...document.querySelectorAll(".pdp-bd [data-c]")].find((b) => b.dataset.c === c)?.click();
  }

  let dragged = false;
  root.addEventListener("click", (e) => {
    if (dragged) { dragged = false; return; }
    const t = e.target;
    if (t.closest(".rk-prev")) return step(-1);
    if (t.closest(".rk-next")) return step(1);
    if (t.closest(".rk-more")) return openDetails();
    const tag = t.closest(".rk-tag");
    if (tag) { const id = tag.closest(".rk-slot").dataset.id; colorOf[id] = colorOf[id] === tag.dataset.color ? "" : tag.dataset.color; paint(false); return swapImage(id); }
    const hit = t.closest(".rk-hit");
    if (hit) { const id = hit.closest(".rk-slot").dataset.id; return id === sel ? openDetails() : select(id); }
    if (sel && (t === track || t === row || t === root)) select("");
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sel) select("");
    if (e.key === "ArrowLeft" && sel) { e.preventDefault(); step(-1); }
    if (e.key === "ArrowRight" && sel) { e.preventDefault(); step(1); }
  });

  // سحب بالفأرة على سطح المكتب (اللمس يتمرّر أصلياً)
  let down = null;
  track.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button === 0) down = { x: e.clientX, left: track.scrollLeft, moved: false }; });
  addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!down.moved && Math.abs(dx) > 6) { down.moved = true; track.classList.add("is-drag"); }
    if (down.moved) track.scrollLeft = down.left - dx;
  });
  addEventListener("pointerup", () => { if (down?.moved) { dragged = true; setTimeout(() => (dragged = false), 0); } down = null; track.classList.remove("is-drag"); });

  track.addEventListener("scroll", layoutNav, { passive: true });
  let lastCols = cols();
  addEventListener("resize", () => { layoutNav(); if (cols() !== lastCols) { lastCols = cols(); render(); } });

  new MutationObserver(render).observe(grid, { childList: true });
  render();
}
