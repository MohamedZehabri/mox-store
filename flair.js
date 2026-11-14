// MOX: لمسات جمالية خفيفة: شريط تقدّم التمرير، شريط إعلانات متحرك، وظهور ناعم للبطاقات عند التمرير.
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const bar = document.createElement("div"); bar.className = "fx-progress"; document.body.append(bar);
const onScroll = () => { const h = document.documentElement; const m = h.scrollHeight - h.clientHeight; bar.style.width = (m > 0 ? (h.scrollTop / m) * 100 : 0) + "%"; };
addEventListener("scroll", onScroll, { passive: true }); onScroll();
const hero = document.querySelector(".hero,.rack-hero");
if (hero) { const items = ["الدفع عند الاستلام", "توصيل إلى مختلف ولايات الجزائر", "MOX — WEAR YOUR IDENTITY", "قطع مختارة بعناية"];
  const row = items.map((t) => `<span>${t}</span><span><b>✦</b></span>`).join(""), m = document.createElement("div");
  m.className = "fx-marquee"; m.setAttribute("aria-hidden", "true"); m.innerHTML = `<div>${row}${row}${row}${row}</div>`; hero.after(m); }
const grid = document.querySelector("#product-grid");
if (grid && "IntersectionObserver" in window && !reduce) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("fx-in"); io.unobserve(e.target); } }), { threshold: 0.08 });
  const scan = () => { let i = 0; grid.querySelectorAll(".product-card:not(.fx-rv)").forEach((c) => { c.classList.add("fx-rv"); c.style.transitionDelay = (i++ % 4) * 80 + "ms"; io.observe(c); }); };
  new MutationObserver(scan).observe(grid, { childList: true }); scan();
}
