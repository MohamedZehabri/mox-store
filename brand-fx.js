// شعار M كـ SVG هندسي متناظر تماماً، فيقع في منتصف المربع بالضبط مهما كان الخط.
const M_SVG = '<svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true" style="display:block"><path fill="currentColor" d="M4 19V5h3.4L12 12.2 16.6 5H20v14h-3.2v-8.6L12 17.6l-4.8-7.2V19z"/></svg>';
const fixMarks = (scope) => scope.querySelectorAll(".brand-mark,.bc-mark").forEach((el) => { if (el.textContent.trim() === "M") el.innerHTML = M_SVG; });
fixMarks(document);
// MOX: عند اللمس أو التمرير فوق الشعار يدور حرف M وتظهر بطاقة أنيقة فيها الشعار وروابط التواصل.
const brand = document.querySelector(".topbar .brand");
if (brand) {
  const card = document.createElement("div"); card.className = "brand-card"; card.setAttribute("role", "dialog");
  card.innerHTML = '<div class="bc-mark">M</div><h4>MOX</h4><p>WEAR YOUR IDENTITY</p><div class="bc-links"></div>';
  const links = card.querySelector(".bc-links");
  document.querySelectorAll("footer .contact-chip").forEach((a) => links.append(a.cloneNode(true)));
  if (!links.children.length) links.remove();
  document.querySelector(".topbar").append(card);
  fixMarks(card);
  let t; const touch = () => matchMedia("(hover:none)").matches;
  const open = () => { clearTimeout(t); card.classList.add("show"); brand.classList.add("fx-on"); };
  const shut = () => { clearTimeout(t); t = setTimeout(() => { card.classList.remove("show"); brand.classList.remove("fx-on"); }, 180); };
  brand.addEventListener("mouseenter", open); brand.addEventListener("mouseleave", shut);
  card.addEventListener("mouseenter", open); card.addEventListener("mouseleave", shut);
  brand.addEventListener("focus", open); document.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(); });
  brand.addEventListener("click", (e) => { if (touch()) { e.preventDefault(); card.classList.contains("show") ? shut() : open(); } });
  document.addEventListener("click", (e) => { if (touch() && !e.target.closest(".brand-card,.topbar .brand")) shut(); });
}
