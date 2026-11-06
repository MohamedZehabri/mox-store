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
async function loadAll(){await Promise.all([loadProducts(),loadOrders()])}
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
checkSession();
