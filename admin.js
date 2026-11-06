import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const configured=SUPABASE_URL.startsWith("https://")&&!SUPABASE_URL.includes("YOUR-PROJECT")&&!SUPABASE_ANON_KEY.includes("YOUR_");
const sb=configured?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
const $=s=>document.querySelector(s),money=n=>`${Number(n||0).toLocaleString("fr-DZ")} دج`;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let adminProducts=[];
function toast(s){const t=$("#toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function showDash(on){$("#login-panel").classList.toggle("hidden",on);$("#dashboard").classList.toggle("hidden",!on)}
async function checkSession(){if(!sb){$("#login-msg").textContent="أضف بيانات Supabase إلى config.js أولاً.";return}const {data}=await sb.auth.getSession();if(data.session)await verifyAdmin();else showDash(false)}
async function verifyAdmin(){const {data:{user}}=await sb.auth.getUser();if(!user)return showDash(false);const {data,error}=await sb.from("admins").select("user_id").eq("user_id",user.id).maybeSingle();if(error||!data){await sb.auth.signOut();$("#login-msg").textContent="هذا الحساب غير مفعّل كمدير. أضف user ID إلى جدول admins.";return showDash(false)}showDash(true);loadAll()}
$("#login-form").onsubmit=async e=>{e.preventDefault();if(!sb)return;const f=new FormData(e.currentTarget);const {error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error)$("#login-msg").textContent="تعذر تسجيل الدخول: "+error.message;else await verifyAdmin()};
$("#logout").onclick=async()=>{await sb.auth.signOut();showDash(false)};
async function loadAll(){await Promise.all([loadProducts(),loadOrders(),loadVideos()])}
async function loadProducts(){const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false});if(error)return toast("تعذر تحميل المنتجات");adminProducts=data||[];$("#admin-products").innerHTML=(data||[]).map(p=>`<div class="admin-product"><div><strong>${esc(p.name)}</strong><div class="muted">${money(p.price)} • ${esc(p.category||"عام")} • ${p.is_active?"ظاهر":"مخفي"}</div></div><div class="admin-actions"><button class="secondary" data-edit="${p.id}">تعديل</button><button class="secondary" data-toggle="${p.id}" data-active="${p.is_active}">${p.is_active?"إخفاء":"إظهار"}</button><button class="secondary danger" data-delete="${p.id}">حذف</button></div></div>`).join("")||'<p class="muted">لا توجد منتجات بعد.</p>'}
$("#product-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const p={name:f.get("name").trim(),price:Number(f.get("price")),category:f.get("category").trim()||"عام",image_url:f.get("image_url").trim()||null,description:f.get("description").trim(),is_active:true};const {error}=await sb.from("products").insert(p);$("#product-msg").textContent=error?"تعذر حفظ المنتج: "+error.message:"تمت إضافة المنتج.";if(!error){e.currentTarget.reset();loadProducts()}};
$("#admin-products").addEventListener("click",async e=>{const t=e.target.closest("[data-toggle]"),d=e.target.closest("[data-delete]");if(t){const {error}=await sb.from("products").update({is_active:t.dataset.active!=="true"}).eq("id",t.dataset.toggle);if(error)toast("تعذر تحديث المنتج");else loadProducts()}if(d&&confirm("هل تريد حذف هذا المنتج؟")){const {error}=await sb.from("products").delete().eq("id",d.dataset.delete);if(error)toast("تعذر حذف المنتج");else loadProducts()}});
async function loadOrders(){const {data,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});if(error){$("#orders-body").innerHTML='<tr><td colspan="7">تعذر تحميل الطلبات</td></tr>';return}$("#orders-body").innerHTML=(data||[]).map(o=>`<tr><td>${new Date(o.created_at).toLocaleString("ar-DZ")}</td><td>${esc(o.customer_name)}<br><small>${esc(o.wilaya)} / ${esc(o.commune)}</small></td><td><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></td><td>${esc(o.address)}<br><small>${esc(o.note||"")}</small></td><td>${(o.items||[]).map(i=>`${esc(i.name)} × ${i.quantity}`).join("<br>")}</td><td><strong>${money(o.total)}</strong></td><td><select class="status-select" data-status="${o.id}">${["جديد","قيد التأكيد","قيد التجهيز","تم الشحن","تم التسليم","ملغى"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("")||'<tr><td colspan="7">لا توجد طلبات حتى الآن.</td></tr>'}
$("#orders-body").addEventListener("change",async e=>{const s=e.target.closest("[data-status]");if(!s)return;const {error}=await sb.from("orders").update({status:s.value}).eq("id",s.dataset.status);toast(error?"تعذر تحديث حالة الطلب":"تم تحديث حالة الطلب")});
// ===== تعديل المنتج =====
const editModal=$("#edit-modal"),editForm=$("#edit-form");
const closeEdit=()=>{editModal.classList.remove("show");$("#edit-msg").textContent=""};
$("#admin-products").addEventListener("click",e=>{
  const b=e.target.closest("[data-edit]");if(!b)return;
  const p=adminProducts.find(x=>String(x.id)===b.dataset.edit);if(!p)return;
  const f=editForm.elements;
  f.product_id.value=p.id;f.name.value=p.name||"";f.price.value=p.price??0;f.category.value=p.category||"";
  f.image_url.value=p.image_url||"";f.description.value=p.description||"";f.is_active.value=p.is_active?"true":"false";
  editModal.classList.add("show");
});
$("#close-edit").onclick=closeEdit;$("#cancel-edit").onclick=closeEdit;
editModal.addEventListener("click",e=>{if(e.target===editModal)closeEdit()});
editForm.onsubmit=async e=>{
  e.preventDefault();
  const f=editForm.elements,btn=$("#save-edit");
  const changes={name:f.name.value.trim(),price:Number(f.price.value),category:f.category.value.trim()||"عام",image_url:f.image_url.value.trim()||null,description:f.description.value.trim(),is_active:f.is_active.value==="true"};
  btn.disabled=true;
  const {data,error}=await sb.from("products").update(changes).eq("id",f.product_id.value).select();
  btn.disabled=false;
  if(error){$("#edit-msg").textContent="تعذر حفظ التعديلات: "+error.message;return}
  if(!data||!data.length){$("#edit-msg").textContent="لم يتم الحفظ. تأكد أنك مسجّل كمدير.";return}
  closeEdit();toast("تم حفظ التعديلات");loadProducts();
};
// ===== فيديوهات الواجهة =====
let adminVideos=[];
async function loadVideos(){
  const {data,error}=await sb.from("hero_videos").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});
  if(error){$("#admin-videos").innerHTML='<p class="muted">جدول الفيديوهات غير موجود بعد. شغّل ملف videos.sql في Supabase.</p>';return}
  adminVideos=data||[];
  $("#admin-videos").innerHTML=adminVideos.map(v=>`<div class="admin-product"><div style="display:flex;gap:12px;align-items:center"><video src="${esc(v.video_url)}#t=0.1" muted playsinline preload="metadata" style="width:60px;height:106px;object-fit:cover;border-radius:8px;background:#000"></video><div><strong>${esc(v.title||"بدون عنوان")}</strong><div class="muted">${v.is_active?"ظاهر":"مخفي"} • الترتيب: <input type="number" class="status-select" style="width:64px" data-vorder="${v.id}" value="${Number(v.sort_order)||0}"></div></div></div><div class="admin-actions"><button class="secondary" data-vtoggle="${v.id}" data-active="${v.is_active}">${v.is_active?"إخفاء":"إظهار"}</button><button class="secondary danger" data-vdelete="${v.id}">حذف</button></div></div>`).join("")||'<p class="muted">لا توجد فيديوهات بعد. سيظهر تصميم الواجهة الافتراضي.</p>';
}
$("#video-form").onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget,f=new FormData(form),file=f.get("file"),btn=$("#video-btn"),msg=$("#video-msg");
  let url=(f.get("video_url")||"").trim();
  if(!(file&&file.size)&&!url){msg.textContent="اختر ملف فيديو أو ضع رابطاً.";return}
  btn.disabled=true;
  try{
    if(file&&file.size){
      if(file.size>50*1024*1024)throw new Error("حجم الملف أكبر من 50 ميغابايت.");
      msg.textContent="جارٍ رفع الفيديو...";
      const ext=(file.name.split(".").pop()||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"")||"mp4";
      const path=`${Date.now()}.${ext}`;
      const {error:upErr}=await sb.storage.from("site-videos").upload(path,file,{contentType:file.type||"video/mp4",cacheControl:"31536000"});
      if(upErr)throw upErr;
      url=sb.storage.from("site-videos").getPublicUrl(path).data.publicUrl;
    }
    const {error}=await sb.from("hero_videos").insert({title:(f.get("title")||"").trim(),video_url:url,sort_order:Number(f.get("sort_order"))||0,is_active:true});
    if(error)throw error;
    form.reset();msg.textContent="تمت إضافة الفيديو.";loadVideos();
  }catch(err){msg.textContent="تعذر الحفظ: "+(err.message||err)}
  finally{btn.disabled=false}
};
$("#admin-videos").addEventListener("click",async e=>{
  const t=e.target.closest("[data-vtoggle]"),d=e.target.closest("[data-vdelete]");
  if(t){const {error}=await sb.from("hero_videos").update({is_active:t.dataset.active!=="true"}).eq("id",t.dataset.vtoggle);if(error)toast("تعذر تحديث الفيديو");else loadVideos()}
  if(d&&confirm("هل تريد حذف هذا الفيديو؟")){
    const v=adminVideos.find(x=>String(x.id)===d.dataset.vdelete);
    const {error}=await sb.from("hero_videos").delete().eq("id",d.dataset.vdelete);
    if(error){toast("تعذر حذف الفيديو");return}
    if(v&&v.video_url.includes("/site-videos/")){try{await sb.storage.from("site-videos").remove([decodeURIComponent(v.video_url.split("/site-videos/")[1].split("?")[0])])}catch(_){}}
    loadVideos();
  }
});
$("#admin-videos").addEventListener("change",async e=>{
  const o=e.target.closest("[data-vorder]");if(!o)return;
  const {error}=await sb.from("hero_videos").update({sort_order:Number(o.value)||0}).eq("id",o.dataset.vorder);
  toast(error?"تعذر تحديث الترتيب":"تم تحديث الترتيب");if(!error)loadVideos();
});
checkSession();
