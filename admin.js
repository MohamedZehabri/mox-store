import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { initCRM } from "./crm.js";
import { cutout } from "./cutout.js";
const configured=SUPABASE_URL.startsWith("https://")&&!SUPABASE_URL.includes("YOUR-PROJECT")&&!SUPABASE_ANON_KEY.includes("YOUR_");
const sb=configured?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
const $=s=>document.querySelector(s),money=n=>`${Number(n||0).toLocaleString("fr-DZ")} دج`;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let adminProducts=[];
function readOpts(form){const q=n=>form.querySelector(`[name="${n}"]`);const sizes=[...form.querySelectorAll('[name="sizes"]:checked')].map(c=>c.value);const colors=[...new Set((q("colors").value||"").split(/[,،]/).map(x=>x.trim()).filter(Boolean))];const st=q("stock").value.trim();const stock=st===""?null:Math.max(0,parseInt(st,10)||0);const cl=v=>Math.min(100,Math.max(0,Number(v)||0));return{sizes,colors,color_images:readCI(form,colors),stock,discount_enabled:q("discount_enabled").checked,discount_step:cl(q("discount_step").value),discount_max:cl(q("discount_max").value)}}
function fillOpts(form,p){const q=n=>form.querySelector(`[name="${n}"]`);form.querySelectorAll('[name="sizes"]').forEach(c=>c.checked=(p.sizes||[]).includes(c.value));q("colors").value=(p.colors||[]).join("، ");renderCI(form,p.color_images||{});q("stock").value=p.stock??"";q("discount_enabled").checked=!!p.discount_enabled;q("discount_step").value=p.discount_step??10;q("discount_max").value=p.discount_max??50}
const stockTxt=p=>p.stock==null?"مخزون غير محدود":Number(p.stock)<=0?"نفدت الكمية":`المخزون ${p.stock}`;
function toast(s){const t=$("#toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function showDash(on){$("#login-panel").classList.toggle("hidden",on);$("#dashboard").classList.toggle("hidden",!on)}
async function checkSession(){if(!sb){$("#login-msg").textContent="أضف بيانات Supabase إلى config.js أولاً.";return}const {data}=await sb.auth.getSession();if(data.session)await verifyAdmin();else showDash(false)}
async function verifyAdmin(){const {data:{user}}=await sb.auth.getUser();if(!user)return showDash(false);const {data,error}=await sb.from("admins").select("user_id").eq("user_id",user.id).maybeSingle();if(error||!data){await sb.auth.signOut();$("#login-msg").textContent="هذا الحساب غير مفعّل كمدير. أضف user ID إلى جدول admins.";return showDash(false)}showDash(true);loadAll();initCRM(sb)}
$("#login-form").onsubmit=async e=>{e.preventDefault();if(!sb)return;const f=new FormData(e.currentTarget);const {error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error)$("#login-msg").textContent="تعذر تسجيل الدخول: "+error.message;else await verifyAdmin()};
$("#logout").onclick=async()=>{await sb.auth.signOut();showDash(false)};
async function loadAll(){await Promise.all([loadProducts(),loadOrders(),loadVideos()])}
async function loadProducts(){const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false});if(error)return toast("تعذر تحميل المنتجات");adminProducts=data||[];$("#admin-products").innerHTML=(data||[]).map(p=>`<div class="admin-product"><div><strong>${esc(p.name)}</strong><div class="muted">${money(p.price)} • ${esc(p.category||"عام")} • ${p.is_active?"ظاهر":"مخفي"} • ${stockTxt(p)}${(p.sizes||[]).length?" • "+esc(p.sizes.join("/")):""}${(p.colors||[]).length?" • "+esc(p.colors.join("، ")):""}${p.discount_enabled?` • خصم ${Number(p.discount_step)}% (حتى ${Number(p.discount_max)}%)`:""}</div></div><div class="admin-actions"><button class="secondary" data-edit="${p.id}">تعديل</button><button class="secondary" data-toggle="${p.id}" data-active="${p.is_active}">${p.is_active?"إخفاء":"إظهار"}</button><button class="secondary danger" data-delete="${p.id}">حذف</button></div></div>`).join("")||'<p class="muted">لا توجد منتجات بعد.</p>'}
$("#product-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const p={name:f.get("name").trim(),price:Number(f.get("price")),category:f.get("category").trim()||"عام",image_url:f.get("image_url").trim()||null,description:f.get("description").trim(),is_active:true,...readOpts(e.currentTarget)};const {error}=await withCI(x=>sb.from("products").insert(x),p);$("#product-msg").textContent=error?"تعذر حفظ المنتج: "+error.message:"تمت إضافة المنتج.";if(!error){const pf=$("#product-form");pf.reset();renderCI(pf,{});loadProducts()}};
$("#admin-products").addEventListener("click",async e=>{const t=e.target.closest("[data-toggle]"),d=e.target.closest("[data-delete]");if(t){const {error}=await sb.from("products").update({is_active:t.dataset.active!=="true"}).eq("id",t.dataset.toggle);if(error)toast("تعذر تحديث المنتج");else loadProducts()}if(d&&confirm("هل تريد حذف هذا المنتج؟")){const {error}=await sb.from("products").delete().eq("id",d.dataset.delete);if(error)toast("تعذر حذف المنتج");else loadProducts()}});
async function loadOrders(){const {data,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});if(error){$("#orders-body").innerHTML='<tr><td colspan="8">تعذر تحميل الطلبات</td></tr>';return}$("#orders-body").innerHTML=(data||[]).map(o=>`<tr><td>${new Date(o.created_at).toLocaleString("ar-DZ")}</td><td>${esc(o.customer_name)}<br><small>${esc(o.wilaya)} / ${esc(o.commune)}</small></td><td><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></td><td>${esc(o.address)}<br><small>${esc(o.note||"")}</small></td><td>${(o.items||[]).map(i=>`${esc(i.name)}${i.size?" • "+esc(i.size):""}${i.color?" • "+esc(i.color):""} × ${Number(i.quantity)}${i.price!=null?` (${money(i.price)})`:""}`).join("<br>")}</td><td><strong>${money(o.total)}</strong></td><td><select class="status-select" data-status="${o.id}">${["جديد","قيد التأكيد","قيد التجهيز","تم الشحن","تم التسليم","ملغى"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></td><td class="ord-act"><label class="chk"><input type="checkbox" data-sel="${o.id}" aria-label="تحديد"></label><button class="secondary danger" data-delord="${o.id}">حذف</button></td></tr>`).join("")||'<tr><td colspan="8">لا توجد طلبات حتى الآن.</td></tr>'}
$("#orders-body").addEventListener("change",async e=>{const s=e.target.closest("[data-status]");if(!s)return;const {error}=await sb.from("orders").update({status:s.value}).eq("id",s.dataset.status);toast(error?"تعذر تحديث حالة الطلب":"تم تحديث حالة الطلب");if(!error&&s.value==="تم التسليم")notifyMeta(s.dataset.status)});
// Meta: إرسال Purchase من الخادم مرة واحدة عند التسليم (الخادم يتحقق من الأدمن ومن الحالة)
async function notifyMeta(orderId){try{const {data:{session}}=await sb.auth.getSession();if(!session)return;const r=await fetch("/api/meta-purchase",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({order_id:orderId})});if(!r.ok)console.warn("meta-purchase",r.status)}catch(err){console.warn("meta-purchase failed",err)}}
// ===== تعديل المنتج =====
const editModal=$("#edit-modal"),editForm=$("#edit-form");
const closeEdit=()=>{editModal.classList.remove("show");$("#edit-msg").textContent=""};
$("#admin-products").addEventListener("click",e=>{
  const b=e.target.closest("[data-edit]");if(!b)return;
  const p=adminProducts.find(x=>String(x.id)===b.dataset.edit);if(!p)return;
  const f=editForm.elements;
  f.product_id.value=p.id;f.name.value=p.name||"";f.price.value=p.price??0;f.category.value=p.category||"";
  f.image_url.value=p.image_url||"";f.description.value=p.description||"";f.is_active.value=p.is_active?"true":"false";fillOpts(editForm,p);
  editModal.classList.add("show");
});
$("#close-edit").onclick=closeEdit;$("#cancel-edit").onclick=closeEdit;
editModal.addEventListener("click",e=>{if(e.target===editModal)closeEdit()});
editForm.onsubmit=async e=>{
  e.preventDefault();
  const f=editForm.elements,btn=$("#save-edit");
  const changes={name:f.name.value.trim(),price:Number(f.price.value),category:f.category.value.trim()||"عام",image_url:f.image_url.value.trim()||null,description:f.description.value.trim(),is_active:f.is_active.value==="true",...readOpts(editForm)};
  btn.disabled=true;
  const {data,error}=await withCI(x=>sb.from("products").update(x).eq("id",f.product_id.value).select(),changes);
  btn.disabled=false;
  if(error){$("#edit-msg").textContent="تعذر حفظ التعديلات: "+error.message;return}
  if(!data||!data.length){$("#edit-msg").textContent="لم يتم الحفظ. تأكد أنك مسجّل كمدير.";return}
  closeEdit();toast("تم حفظ التعديلات");loadProducts();
};
// ===== فيديوهات الواجهة =====
const VBUCKET="site-videos";
async function loadVideos(){const {data,error}=await sb.from("hero_videos").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});if(error)return toast("تعذر تحميل الفيديوهات");$("#admin-videos").innerHTML=(data||[]).map(v=>`<div class="admin-product"><div style="display:flex;gap:12px;align-items:center"><video src="${esc(v.video_url)}" muted preload="metadata" style="width:60px;height:80px;object-fit:cover;border-radius:8px;background:#000"></video><div><strong>${esc(v.title||"بدون عنوان")}</strong><div class="muted">ترتيب ${v.sort_order} • ${v.is_active?"ظاهر":"مخفي"}</div></div></div><div class="admin-actions"><button class="secondary" data-vtoggle="${v.id}" data-active="${v.is_active}">${v.is_active?"إخفاء":"إظهار"}</button><button class="secondary danger" data-vdelete="${v.id}" data-url="${esc(v.video_url)}">حذف</button></div></div>`).join("")||'<p class="muted">لا توجد فيديوهات بعد.</p>'}
$("#video-form").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),file=f.get("file"),msg=$("#video-msg"),btn=$("#video-btn");
  if(!file||!file.size){msg.textContent="اختر ملف فيديو.";return}
  if(file.size>52428800){msg.textContent="حجم الفيديو أكبر من 50 ميغابايت، قلّل حجمه أولاً.";return}
  const ext=(file.name.split(".").pop()||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"")||"mp4",path=`${Date.now()}.${ext}`;
  btn.disabled=true;msg.textContent="جارٍ رفع الفيديو...";
  const {error:upErr}=await sb.storage.from(VBUCKET).upload(path,file,{contentType:file.type,cacheControl:"31536000"});
  if(upErr){btn.disabled=false;msg.textContent="تعذر رفع الفيديو: "+upErr.message;return}
  const {data:pub}=sb.storage.from(VBUCKET).getPublicUrl(path);
  const {error}=await sb.from("hero_videos").insert({title:(f.get("title")||"").trim(),video_url:pub.publicUrl,sort_order:Number(f.get("sort_order"))||0,is_active:true});
  btn.disabled=false;
  if(error){await sb.storage.from(VBUCKET).remove([path]);msg.textContent="تعذر حفظ الفيديو: "+error.message;return}
  msg.textContent="تم رفع الفيديو.";form.reset();loadVideos();
};
$("#admin-videos").addEventListener("click",async e=>{const t=e.target.closest("[data-vtoggle]"),d=e.target.closest("[data-vdelete]");
  if(t){const {error}=await sb.from("hero_videos").update({is_active:t.dataset.active!=="true"}).eq("id",t.dataset.vtoggle);if(error)toast("تعذر تحديث الفيديو");else loadVideos()}
  if(d&&confirm("هل تريد حذف هذا الفيديو؟")){const {error}=await sb.from("hero_videos").delete().eq("id",d.dataset.vdelete);if(error){toast("تعذر حذف الفيديو");return}const i=d.dataset.url.indexOf("/"+VBUCKET+"/");if(i>-1)await sb.storage.from(VBUCKET).remove([decodeURIComponent(d.dataset.url.slice(i+VBUCKET.length+2).split("?")[0])]);loadVideos()}
});
checkSession();

// ===== صور الألوان + رفع الصور بلا خلفية =====
const CIB="product-images";
const ciStyle=document.createElement("style");
ciStyle.textContent=".ci-box{grid-column:1/-1}.ci-title{font-size:12px;color:#6b6b6b;margin:6px 0}.ci-row{display:flex;gap:8px;align-items:center;margin:6px 0}.ci-row b{min-width:64px;font-size:13px}.ci-row .admin-input{flex:1;min-width:0}.ci-up{cursor:pointer;white-space:nowrap;font-size:12px;padding:9px 12px;border:1px solid #d9d9d9;border-radius:10px;background:#fff;display:inline-block}";
document.head.append(ciStyle);
const colorsOf=form=>[...new Set((form.querySelector('[name="colors"]').value||"").split(/[,،]/).map(x=>x.trim()).filter(Boolean))];
function readCIRaw(form){const o={};form.querySelectorAll(".ci-row").forEach(r=>{const v=r.querySelector("[data-ci-url]").value.trim();if(v)o[r.dataset.color]=v});return o}
function readCI(form,colors){const raw=readCIRaw(form),o={};(colors||colorsOf(form)).forEach(c=>{if(raw[c])o[c]=raw[c]});return o}
function renderCI(form,vals){
  const box=form.querySelector(".ci-box");if(!box)return;
  const colors=colorsOf(form),cur=vals||readCIRaw(form);
  box.innerHTML=colors.length?`<div class="ci-title">صورة لكل لون (اختياري): تتغير صورة القطعة في المتجر عند اختيار اللون</div>`+colors.map(c=>`<div class="ci-row" data-color="${esc(c)}"><b>${esc(c)}</b><input class="admin-input" data-ci-url type="url" placeholder="رابط الصورة" value="${esc(cur[c]||"")}"><label class="ci-up">رفع بلا خلفية<input type="file" accept="image/*" hidden></label></div>`).join(""):"";
}
async function withCI(run,payload){
  let r=await run(payload),dropped=false;
  const want=Object.keys(payload.color_images||{}).length,norm=o=>JSON.stringify(Object.entries(o||{}).sort());
  if(r.error&&/color_images/.test(r.error.message||"")){const {color_images,...rest}=payload;r=await run(rest);dropped=true}
  if(!r.error){
    if(dropped&&want)alert("تم حفظ المنتج، لكن روابط صور الألوان لم تُحفظ لأن قاعدة البيانات تحتاج تحديثاً.\nنفّذ ملف color_images_upgrade.sql في Supabase > SQL Editor ثم أعد الحفظ.");
    else{
      const row=Array.isArray(r.data)?r.data[0]:null;
      if(row&&"color_images" in row&&norm(row.color_images)!==norm(payload.color_images))alert("تنبيه: لم تُحفظ روابط صور الألوان كاملة. أعد المحاولة.");
      else if(want)toast("تم الحفظ • روابط صور الألوان المحفوظة: "+want);
    }
  }
  return r;
}
["#product-form","#edit-form"].forEach(sel=>{
  const form=$(sel);if(!form)return;
  const colors=form.querySelector('[name="colors"]'),img=form.querySelector('[name="image_url"]');if(!colors)return;
  const box=document.createElement("div");box.className="wide ci-box";colors.closest("label").after(box);
  colors.addEventListener("input",()=>renderCI(form));
  if(img){const up=document.createElement("label");up.className="wide ci-up img-up";up.innerHTML='رفع صورة المنتج الرئيسية بلا خلفية<input type="file" accept="image/*" hidden>';up.__target=img;img.closest("label").after(up)}
});
document.addEventListener("change",async e=>{
  const inp=e.target;if(inp.type!=="file")return;const holder=inp.closest(".ci-row,.img-up");if(!holder)return;
  const file=inp.files[0];inp.value="";if(!file)return;
  const target=holder.querySelector("[data-ci-url]")||holder.__target;if(!target)return;
  if(!sb){toast("اربط Supabase أولاً");return}
  toast("جارٍ معالجة الصورة...");
  const cut=await cutout(file),blob=cut?cut.blob:file,ext=cut?"png":(file.name.split(".").pop()||"jpg").toLowerCase();
  const path=`${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const {error}=await sb.storage.from(CIB).upload(path,blob,{contentType:cut?"image/png":file.type,cacheControl:"31536000"});
  if(error){toast("تعذر رفع الصورة: "+error.message);return}
  target.value=sb.storage.from(CIB).getPublicUrl(path).data.publicUrl;
  toast(cut?"تم الرفع وحذف الخلفية":"تم الرفع (الخلفية غير موحدة فلم تُحذف)");
});

// ===== حذف الطلبات =====
(()=>{
  const body=$("#orders-body");if(!body)return;
  const st=document.createElement("style");
  st.textContent=".ord-bar{display:flex;gap:14px;align-items:center;margin:0 0 12px;font-size:13px}.ord-act{white-space:nowrap}.ord-act .chk{margin-inline-end:8px;display:inline-flex}.ord-bar button:disabled{opacity:.4;cursor:not-allowed}";
  document.head.append(st);
  const bar=document.createElement("div");bar.className="ord-bar";
  bar.innerHTML='<label class="chk"><input type="checkbox" id="ord-all"> تحديد الكل</label><button type="button" class="secondary danger" id="ord-del-sel" disabled>حذف المحدد</button>';
  body.closest(".table-wrap").before(bar);
  const sel=()=>[...body.querySelectorAll("[data-sel]:checked")].map(c=>c.dataset.sel);
  const refresh=()=>{const n=sel().length,b=$("#ord-del-sel");b.disabled=!n;b.textContent=n?`حذف المحدد (${n})`:"حذف المحدد";const all=body.querySelectorAll("[data-sel]");$("#ord-all").checked=!!all.length&&n===all.length};
  async function delOrders(ids){
    if(!ids.length)return;
    if(!confirm(ids.length===1?"حذف هذا الطلب نهائياً؟ لا يمكن التراجع.":`حذف ${ids.length} طلبات نهائياً؟ لا يمكن التراجع.`))return;
    const {data,error}=await sb.from("orders").delete().in("id",ids).select("id");
    if(error||!data||!data.length){alert("تعذر حذف الطلبات.\nنفّذ ملف orders_delete_upgrade.sql في Supabase > SQL Editor ثم أعد المحاولة."+(error?"\n"+error.message:""));return}
    toast(data.length<ids.length?`حُذف ${data.length} من ${ids.length}`:`تم حذف ${data.length} ${data.length===1?"طلب":"طلبات"}`);
    loadOrders();
  }
  body.addEventListener("click",e=>{const d=e.target.closest("[data-delord]");if(d)delOrders([d.dataset.delord])});
  body.addEventListener("change",e=>{if(e.target.closest("[data-sel]"))refresh()});
  $("#ord-all").addEventListener("change",e=>{body.querySelectorAll("[data-sel]").forEach(c=>c.checked=e.target.checked);refresh()});
  $("#ord-del-sel").addEventListener("click",()=>delOrders(sel()));
  new MutationObserver(refresh).observe(body,{childList:true});
})();
