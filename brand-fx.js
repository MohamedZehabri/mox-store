// MOX: عند اللمس أو التمرير فوق الشعار يدور حرف M وتظهر بطاقة أنيقة فيها الشعار وروابط التواصل.
const brand = document.querySelector(".topbar .brand");
if (brand) {
  const card = document.createElement("div"); card.className = "brand-card"; card.setAttribute("role", "dialog");
  card.innerHTML = '<div class="bc-mark">M</div><h4>MOX</h4><p>WEAR YOUR IDENTITY</p><div class="bc-links"></div>';
  const links = card.querySelector(".bc-links");
  document.querySelectorAll("footer .contact-chip").forEach((a) => links.append(a.cloneNode(true)));
  if (!links.children.length) links.remove();
  document.querySelector(".topbar").append(card);
  let t; const touch = () => matchMedia("(hover:none)").matches;
  const open = () => { clearTimeout(t); card.classList.add("show"); brand.classList.add("fx-on"); };
  const shut = () => { clearTimeout(t); t = setTimeout(() => { card.classList.remove("show"); brand.classList.remove("fx-on"); }, 180); };
  brand.addEventListener("mouseenter", open); brand.addEventListener("mouseleave", shut);
  card.addEventListener("mouseenter", open); card.addEventListener("mouseleave", shut);
  brand.addEventListener("focus", open); document.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(); });
  brand.addEventListener("click", (e) => { if (touch()) { e.preventDefault(); card.classList.contains("show") ? shut() : open(); } });
  document.addEventListener("click", (e) => { if (touch() && !e.target.closest(".brand-card,.topbar .brand")) shut(); });
}
