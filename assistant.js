// MOX AI Assistant: واجهة المحادثة. الردود تأتي من /api/assistant (نموذج Claude من Anthropic) المقيَّد ببيانات متجرك الحقيقية.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const st = document.createElement("style");
st.textContent = `.ai-fab{position:fixed;bottom:20px;right:18px;z-index:35;border:0;background:#000;color:#fff;border-radius:30px;padding:13px 20px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 12px 30px #0004;display:flex;gap:8px;align-items:center;transition:transform .2s}.ai-fab:hover{transform:translateY(-2px)}
.ai-panel{position:fixed;bottom:84px;right:18px;z-index:36;width:min(380px,calc(100vw - 24px));height:min(560px,72vh);background:#fff;border:1px solid #e8e3dc;border-radius:22px;box-shadow:0 30px 70px #0003;display:flex;flex-direction:column;overflow:hidden;opacity:0;visibility:hidden;transform:translateY(16px) scale(.98);transform-origin:bottom right;transition:.3s}.ai-panel.show{opacity:1;visibility:visible;transform:none}
.ai-h{background:#000;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}.ai-h b{letter-spacing:2px;font-size:13px}.ai-h small{display:block;color:#b9b3a9;font-size:10px;margin-top:2px}.ai-h button{background:#ffffff22;border:0;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer}
.ai-m{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.9}.ai-b{max-width:88%;padding:10px 14px;border-radius:16px;white-space:pre-wrap}.ai-b.u{align-self:flex-start;background:#000;color:#fff;border-bottom-right-radius:4px}.ai-b.a{align-self:flex-end;background:#f4f4f4;border-bottom-left-radius:4px}
.ai-chips{display:flex;flex-wrap:wrap;gap:6px}.ai-chips button,.ai-pl{border:1px solid #d9d9d9;background:#fff;border-radius:20px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit}.ai-chips button:hover,.ai-pl:hover{background:#000;color:#fff}.ai-pl{display:inline-block;margin:4px 0 0 4px;font-weight:700}
.ai-f{display:flex;gap:8px;padding:10px;border-top:1px solid #eee}.ai-f input{flex:1;border:1px solid #e0e0e0;border-radius:20px;padding:10px 14px;font:inherit;font-size:13px;outline:0}.ai-f button{border:0;background:#000;color:#fff;border-radius:20px;padding:0 16px;font-weight:700;cursor:pointer}.ai-f button:disabled{opacity:.4}
.ai-n{font-size:10px;color:#9b968d;text-align:center;padding:0 12px 8px}.ai-dots i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#999;margin:0 2px;animation:aid 1s infinite}.ai-dots i:nth-child(2){animation-delay:.15s}.ai-dots i:nth-child(3){animation-delay:.3s}@keyframes aid{50%{transform:translateY(-4px)}}
@media(max-width:560px){.ai-panel{right:12px;bottom:78px}.ai-fab{right:12px}}`;
document.head.append(st);
const fab = document.createElement("button"); fab.className = "ai-fab"; fab.innerHTML = "✦ مساعد MOX";
const panel = document.createElement("div"); panel.className = "ai-panel"; panel.setAttribute("role", "dialog");
panel.innerHTML = `<div class="ai-h"><div><b>MOX AI</b><small>مساعد ذكاء اصطناعي، قد يخطئ أحياناً</small></div><button aria-label="إغلاق">✕</button></div><div class="ai-m" id="ai-m"></div><div class="ai-n">الأسعار والمخزون من بيانات المتجر. يؤكد فريقنا طلبك ومقاسك قبل الشحن.</div><form class="ai-f"><input placeholder="اكتب سؤالك..." maxlength="400" autocomplete="off"><button>إرسال</button></form>`;
document.body.append(fab, panel);
const msgs = panel.querySelector("#ai-m"), form = panel.querySelector("form"), input = form.querySelector("input"), send = form.querySelector("button");
let hist = [], busy = false, started = false;
const add = (role, html) => { const d = document.createElement("div"); d.className = "ai-b " + role; d.innerHTML = html; msgs.append(d); msgs.scrollTop = msgs.scrollHeight; return d; };
const render = (t) => { const prods = (window.MOX && window.MOX.products()) || []; let h = esc(t);
  h = h.replace(/\[\[p:([^\]]+)\]\]/g, (_, id) => { const p = prods.find((x) => String(x.id) === id.trim()); return p ? `<button class="ai-pl" data-open="${esc(p.id)}">${esc(p.name)} ←</button>` : ""; }); return h; };
function open() { panel.classList.add("show"); if (!started) { started = true;
  add("a", "أهلاً بك في MOX 👋 كيف أساعدك؟");
  const c = document.createElement("div"); c.className = "ai-chips";
  ["ساعدني في اختيار مقاس", "ما هي القطع المخفّضة؟", "كيف يتم التوصيل والدفع؟"].forEach((q) => { const b = document.createElement("button"); b.textContent = q; b.onclick = () => { c.remove(); ask(q); }; c.append(b); });
  msgs.append(c); } input.focus(); }
fab.onclick = () => (panel.classList.contains("show") ? panel.classList.remove("show") : open());
panel.querySelector(".ai-h button").onclick = () => panel.classList.remove("show");
msgs.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (!b) return; panel.classList.remove("show");
  const card = document.querySelector(`.product-card[data-pid="${CSS.escape(b.dataset.open)}"]`); if (card) card.click(); });
async function ask(text) {
  if (busy || !text.trim()) return; busy = true; send.disabled = true; add("u", esc(text)); hist.push({ role: "user", content: text.trim() });
  const w = add("a", '<span class="ai-dots"><i></i><i></i><i></i></span>');
  try {
    const cart = window.MOX ? window.MOX.cartLines().map((x) => ({ id: x.id, qty: x.qty, size: x.size || "" })) : [];
    const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: hist.slice(-10), cart }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.reply) throw new Error(j.error || "failed");
    hist.push({ role: "assistant", content: j.reply }); w.innerHTML = render(j.reply);
  } catch (e) { hist.pop(); w.innerHTML = "تعذّر الرد الآن. جرّب بعد قليل أو تواصل معنا عبر إنستغرام أو تيليغرام."; }
  busy = false; send.disabled = false; msgs.scrollTop = msgs.scrollHeight; input.focus();
}
form.onsubmit = (e) => { e.preventDefault(); const t = input.value; input.value = ""; ask(t); };
