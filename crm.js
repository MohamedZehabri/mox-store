// MOX CRM — Phase 1: customers, segments, notes & tags. Loaded by admin.js after admin check.
const SEG = { potential: "محتمل", vip: "VIP", high_value: "قيمة عالية", inactive: "غير نشط", returning: "عائد", new: "جديد" };
const PAGE = 20;
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => `${Number(n || 0).toLocaleString("fr-DZ")} دج`;
const fdate = d => (d ? new Date(d).toLocaleDateString("ar-DZ") : "—");

const CSS = `
.crm{--g:#B49A68;--iv:#F2EEE6;--st:#77736D;margin:28px 0;padding:20px;border-radius:18px;color:var(--iv);
 background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(180,154,104,.28);
 backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.crm *{box-sizing:border-box}
.crm-head{display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer}
.crm-head h2{margin:0;font-family:"Cormorant Garamond",serif;font-size:1.7rem;font-weight:600;color:var(--g)}
.crm-body{display:none;margin-top:16px}.crm.open .crm-body{display:block}
.crm-bar{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
.crm input,.crm select,.crm textarea{background:rgba(17,17,17,.75);color:var(--iv);border:1px solid rgba(242,238,230,.18);border-radius:10px;padding:10px 12px;font:inherit}
.crm input:focus,.crm select:focus,.crm textarea:focus,.crm button:focus-visible{outline:2px solid var(--g);outline-offset:1px}
.crm-bar input[type=search]{flex:1;min-width:180px}
.crm button{background:var(--g);color:#111;border:0;border-radius:10px;padding:9px 16px;font:inherit;font-weight:600;cursor:pointer}
.crm button.ghost{background:transparent;color:var(--iv);border:1px solid rgba(242,238,230,.25)}
.crm button:disabled{opacity:.4;cursor:default}
.crm-wrap{overflow-x:auto}
.crm table{width:100%;border-collapse:collapse;min-width:720px}
.crm th{color:var(--st);font-weight:500;text-align:right;padding:8px 10px;border-bottom:1px solid rgba(242,238,230,.12)}
.crm td{padding:11px 10px;border-bottom:1px solid rgba(242,238,230,.07)}
.crm tbody tr{cursor:pointer}.crm tbody tr:hover{background:rgba(180,154,104,.08)}
.crm small,.crm .mut{color:var(--st)}
.crm .seg{display:inline-block;padding:2px 10px;border-radius:99px;border:1px solid var(--g);color:var(--g);font-size:.8rem}
.crm .seg.vip{background:var(--g);color:#111}.crm .seg.inactive,.crm .seg.potential{border-color:var(--st);color:var(--st)}
.crm-pager{display:flex;justify-content:space-between;align-items:center;margin-top:14px}
.crm-modal{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:14px}
.crm-card{width:min(680px,100%);max-height:92vh;overflow:auto;background:#161514;color:var(--iv);border:1px solid rgba(180,154,104,.35);border-radius:18px;padding:22px}
.crm-card h3{margin:0 0 4px;font-family:"Cormorant Garamond",serif;font-size:1.6rem;color:var(--g)}
.crm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:14px 0}
.crm-stats div{padding:10px;border-radius:12px;background:rgba(255,255,255,.05)}
.crm-stats b{display:block;font-size:1.05rem}
.crm-card label{display:block;margin:12px 0 4px;color:var(--st)}
.crm-card textarea,.crm-card input{width:100%}
.crm-ord{padding:10px 0;border-bottom:1px solid rgba(242,238,230,.08)}
@media (prefers-reduced-motion:no-preference){.crm-card{animation:crmIn .18s ease-out}@keyframes crmIn{from{opacity:0;transform:translateY(8px)}}}
`;

export function initCRM(sb) {
  const host = document.querySelector("#dashboard");
  if (!sb || !host || document.getElementById("crm-root")) return;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  const root = document.createElement("section");
  root.id = "crm-root";
  root.className = "crm";
  root.innerHTML = `
    <div class="crm-head" id="crm-toggle" role="button" tabindex="0"><h2>MOX CRM</h2><span class="mut">العملاء والشرائح</span></div>
    <div class="crm-body">
      <div class="crm-bar">
        <input type="search" id="crm-q" placeholder="ابحث بالاسم أو رقم الهاتف">
        <select id="crm-seg"><option value="">كل الشرائح</option>${Object.entries(SEG).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <button class="ghost" id="crm-set-btn">قواعد الشرائح</button>
      </div>
      <div id="crm-settings" style="display:none" class="crm-bar">
        <label>طلبات VIP من <input type="number" min="1" id="s-vip" style="width:90px"></label>
        <label>قيمة عالية من (دج) <input type="number" min="0" id="s-hv" style="width:120px"></label>
        <label>غير نشط بعد (يوم) <input type="number" min="1" id="s-in" style="width:90px"></label>
        <button id="s-save">حفظ القواعد</button>
      </div>
      <div class="crm-wrap"><table><thead><tr><th>العميل</th><th>الهاتف</th><th>الولاية</th><th>الطلبات</th><th>المشتريات</th><th>متوسط الطلب</th><th>آخر شراء</th><th>الحالة</th></tr></thead><tbody id="crm-rows"></tbody></table></div>
      <div class="crm-pager"><button class="ghost" id="crm-next">التالي</button><span class="mut" id="crm-info"></span><button class="ghost" id="crm-prev">السابق</button></div>
    </div>`;
  host.appendChild(root);

  const $ = s => root.querySelector(s);
  let page = 0, total = 0, rows = [], loaded = false, timer;

  async function load() {
    $("#crm-rows").innerHTML = `<tr><td colspan="8" class="mut">جارٍ التحميل...</td></tr>`;
    let qb = sb.from("crm_customers").select("*", { count: "exact" }).order("last_order_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    const q = $("#crm-q").value.trim().replace(/[,()%*\\]/g, "");
    if (q) qb = qb.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    if ($("#crm-seg").value) qb = qb.eq("segment", $("#crm-seg").value);
    const { data, count, error } = await qb;
    if (error) { $("#crm-rows").innerHTML = `<tr><td colspan="8">تعذر تحميل العملاء: ${esc(error.message)}. تأكد من تشغيل ملف SQL.</td></tr>`; return; }
    rows = data || []; total = count || 0;
    $("#crm-rows").innerHTML = rows.map((c, i) => `<tr data-i="${i}"><td><strong>${esc(c.name)}</strong>${(c.tags || []).length ? `<br><small>${esc(c.tags.join("، "))}</small>` : ""}</td><td>${esc(c.phone)}</td><td>${esc(c.wilaya)}</td><td>${c.valid_orders}${c.cancelled_orders ? ` <small>(ملغى ${c.cancelled_orders})</small>` : ""}</td><td>${money(c.total_spent)}</td><td>${money(c.avg_order_value)}</td><td>${fdate(c.last_order_at)}</td><td><span class="seg ${c.segment}">${SEG[c.segment]}</span></td></tr>`).join("") || `<tr><td colspan="8" class="mut">لا يوجد عملاء مطابقون.</td></tr>`;
    const pages = Math.max(1, Math.ceil(total / PAGE));
    $("#crm-info").textContent = `صفحة ${page + 1} من ${pages} • ${total} عميل`;
    $("#crm-prev").disabled = page === 0; $("#crm-next").disabled = page + 1 >= pages;
  }

  $("#crm-toggle").onclick = () => { root.classList.toggle("open"); if (!loaded) { loaded = true; load(); } };
  $("#crm-toggle").onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#crm-toggle").click(); } };
  $("#crm-q").oninput = () => { clearTimeout(timer); timer = setTimeout(() => { page = 0; load(); }, 300); };
  $("#crm-seg").onchange = () => { page = 0; load(); };
  $("#crm-prev").onclick = () => { page--; load(); };
  $("#crm-next").onclick = () => { page++; load(); };

  $("#crm-set-btn").onclick = async () => {
    const box = $("#crm-settings");
    box.style.display = box.style.display === "none" ? "flex" : "none";
    const { data } = await sb.from("crm_settings").select("*").eq("id", 1).maybeSingle();
    if (data) { $("#s-vip").value = data.vip_orders; $("#s-hv").value = data.high_value_spent; $("#s-in").value = data.inactive_days; }
  };
  $("#s-save").onclick = async () => {
    const v = { vip_orders: Math.max(1, parseInt($("#s-vip").value, 10) || 5), high_value_spent: Math.max(0, Number($("#s-hv").value) || 50000), inactive_days: Math.max(1, parseInt($("#s-in").value, 10) || 90) };
    const { error } = await sb.from("crm_settings").update(v).eq("id", 1);
    alert(error ? "تعذر حفظ القواعد: " + error.message : "تم حفظ القواعد.");
    if (!error) load();
  };

  $("#crm-rows").onclick = e => { const tr = e.target.closest("tr[data-i]"); if (tr) openProfile(rows[tr.dataset.i]); };

  async function openProfile(c) {
    const m = document.createElement("div");
    m.className = "crm-modal";
    m.innerHTML = `<div class="crm-card crm" style="margin:0;backdrop-filter:none" role="dialog" aria-modal="true">
      <h3>${esc(c.name)}</h3><span class="seg ${c.segment}">${SEG[c.segment]}</span>
      <p class="mut">${esc(c.phone)} • ${esc(c.wilaya)} / ${esc(c.commune)}<br>${esc(c.address)}</p>
      <div class="crm-stats"><div>الطلبات<b>${c.total_orders}</b></div><div>ملغاة<b>${c.cancelled_orders}</b></div><div>المشتريات<b>${money(c.total_spent)}</b></div><div>متوسط الطلب<b>${money(c.avg_order_value)}</b></div><div>أول طلب<b>${fdate(c.first_order_at)}</b></div><div>آخر طلب<b>${fdate(c.last_order_at)}</b></div></div>
      <label for="p-tags">الوسوم (افصل بفاصلة)</label><input id="p-tags" value="${esc((c.tags || []).join("، "))}">
      <label for="p-notes">ملاحظات داخلية</label><textarea id="p-notes" rows="3">${esc(c.notes)}</textarea>
      <div style="display:flex;gap:10px;margin-top:12px"><button id="p-save">حفظ</button><button class="ghost" id="p-close">إغلاق</button><span class="mut" id="p-msg"></span></div>
      <h4 style="margin:20px 0 4px">سجل الطلبات</h4><div id="p-orders" class="mut">جارٍ التحميل...</div></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.onclick = e => { if (e.target === m) close(); };
    m.querySelector("#p-close").onclick = close;
    m.querySelector("#p-save").onclick = async () => {
      const tags = [...new Set(m.querySelector("#p-tags").value.split(/[,،]/).map(x => x.trim()).filter(Boolean))].slice(0, 20);
      const notes = m.querySelector("#p-notes").value.slice(0, 4000);
      const { error } = await sb.from("crm_customer_profiles").upsert({ phone_key: c.phone_key, tags, notes, updated_at: new Date().toISOString() });
      m.querySelector("#p-msg").textContent = error ? "تعذر الحفظ: " + error.message : "تم الحفظ.";
      if (!error) { c.tags = tags; c.notes = notes; load(); }
    };
    const { data, error } = await sb.from("orders").select("id,created_at,status,total,items").in("phone", c.phones).order("created_at", { ascending: false });
    m.querySelector("#p-orders").innerHTML = error ? "تعذر تحميل الطلبات." : (data || []).map(o => `<div class="crm-ord"><strong>${fdate(o.created_at)}</strong> • ${esc(o.status)} • ${money(o.total)}<br><small>${(o.items || []).map(i => `${esc(i.name)} × ${Number(i.quantity)}`).join("، ")}</small></div>`).join("") || "لا توجد طلبات.";
  }
}
