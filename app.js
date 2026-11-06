import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORE_NAME } from "./config.js";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (s) => document.querySelector(s);
let products = [];
let cart = JSON.parse(localStorage.getItem("dz_cart") || "[]");
let selectedCategory = "الكل";
let rates = {};
const wilayas = ["أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون","برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة","أفلو","بريكة","قصر الشلالة","مسعد","عين وسارة","بوسعادة","الأبيض سيدي الشيخ","القنطرة","بئر العاتر","قصر البخاري","العريشة"];
$("#store-name").textContent = STORE_NAME; $("#footer-store-name").textContent = STORE_NAME; $("#year").textContent = new Date().getFullYear();
$("#wilaya").innerHTML += wilayas.map((w,i)=>`<option value="${w}">${String(i+1).padStart(2,"0")} - ${w}</option>`).join("");
const money = n => `${Number(n||0).toLocaleString("fr-DZ")} دج`;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function saveCart(){localStorage.setItem("dz_cart",JSON.stringify(cart));renderCart()}
function renderCart(){
  $("#cart-count").textContent=cart.reduce((s,x)=>s+x.qty,0);
  $("#cart-items").innerHTML=cart.length?cart.map(x=>`<div class="cart-line"><div><strong>${escapeHtml(x.name)}</strong><small>${money(x.price)} × ${x.qty}</small></div><div class="qty-controls"><button data-dec="${x.id}">−</button><span>${x.qty}</span><button data-inc="${x.id}">+</button></div></div>`).join(""):'<p class="muted">السلة فارغة حالياً.</p>';
  $("#cart-total").textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0));
  $("#checkout-total").textContent=$("#cart-total").textContent;updateShipping();
}
function shippingFee(){const w=$("#wilaya").value,r=rates[w];if(!w||!r||r.is_active===false)return null;const v=$("#delivery-type").value==="desk"?r.desk_price:r.home_price;return v==null?null:Number(v)}
function syncDelivery(){const r=rates[$("#wilaya").value],sel=$("#delivery-type"),h=sel.querySelector('[value="home"]'),d=sel.querySelector('[value="desk"]');const lbl=(t,p)=>p==null?t+" — غير متوفر":t+" — "+(Number(p)===0?"مجاني":money(p));h.textContent=r?lbl("إلى المنزل",r.home_price):"إلى المنزل";d.textContent=r?lbl("إلى المكتب (Stop Desk)",r.desk_price):"إلى المكتب (Stop Desk)";h.disabled=!!r&&r.home_price==null;d.disabled=!!r&&r.desk_price==null;if(sel.value==="desk"&&d.disabled&&!h.disabled)sel.value="home";if(sel.value==="home"&&h.disabled&&!d.disabled)sel.value="desk"}
function updateShipping(){const sub=cart.reduce((s,x)=>s+x.price*x.qty,0);syncDelivery();const fee=shippingFee();$("#checkout-shipping").textContent=!$("#wilaya").value?"اختر الولاية":fee===null?"غير متوفر لهذه الوجهة":fee===0?"مجاني":money(fee);$("#checkout-grand").textContent=money(sub+(fee||0))}
async function loadRates(){if(!supabase)return;const {data}=await supabase.from("shipping_rates").select("*");rates=Object.fromEntries((data||[]).map(r=>[r.wilaya,r]));updateShipping()}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderCategories(){
 const cats=["الكل",...new Set(products.map(p=>p.category||"عام"))];
 $("#categories").innerHTML=cats.map(c=>`<button class="category ${c===selectedCategory?"active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
}
function renderProducts(){
 const q=$("#search").value.trim().toLowerCase();
 const shown=products.filter(p=>(selectedCategory==="الكل"||p.category===selectedCategory)&&(`${p.name} ${p.description||""}`).toLowerCase().includes(q));
 $("#product-grid").innerHTML=shown.length?shown.map(p=>`<article class="product-card"><div class="product-image">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`:'<span class="placeholder-image">✧</span>'}</div><div class="product-info"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||"منتج مميز من متجرنا.")}</p><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-button" data-add="${p.id}">أضف إلى السلة +</button></div></div></article>`).join(""):'<div class="loading">لا توجد منتجات مطابقة حالياً.</div>';
}
async function loadProducts(){
 if(!supabase){products=JSON.parse(localStorage.getItem("dz_demo_products")||"null")||[
 {id:"demo-1",name:"قميص MOX Essential",description:"قطعة أساسية بقصة نظيفة وخامة مريحة.",price:2500,category:"الأكثر طلباً",image_url:""},
 {id:"demo-2",name:"MOX Everyday Tee",description:"بساطة مدروسة لإطلالة يومية أنيقة.",price:3900,category:"جديد",image_url:""}
 ];toast("وضع المعاينة: اربط Supabase لتفعيل الطلبات الحقيقية");}
 else {const {data,error}=await supabase.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false});if(error){console.error(error);toast("تعذر تحميل المنتجات");products=[]}else products=data||[]}
 renderCategories();renderProducts();
}
$("#product-grid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const p=products.find(x=>String(x.id)===b.dataset.add);if(!p)return;const old=cart.find(x=>String(x.id)===String(p.id));if(old)old.qty++;else cart.push({id:p.id,name:p.name,price:Number(p.price),qty:1});saveCart();toast("تمت إضافة المنتج إلى السلة")});
$("#categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;selectedCategory=b.dataset.category;renderCategories();renderProducts()});
$("#search").addEventListener("input",renderProducts);
$("#cart-items").addEventListener("click",e=>{const inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]");if(inc){const p=cart.find(x=>String(x.id)===inc.dataset.inc);p.qty++}if(dec){const p=cart.find(x=>String(x.id)===dec.dataset.dec);p.qty--;if(p.qty<=0)cart=cart.filter(x=>String(x.id)!==dec.dataset.dec)}saveCart()});
function cartOpen(open){$("#cart-drawer").classList.toggle("open",open);$("#cart-overlay").classList.toggle("show",open)}
$("#open-cart").onclick=()=>cartOpen(true);$("#close-cart").onclick=()=>cartOpen(false);$("#cart-overlay").onclick=()=>cartOpen(false);
$("#go-checkout").onclick=()=>{if(!cart.length){toast("أضف منتجاً إلى السلة أولاً");return}cartOpen(false);$("#checkout-modal").classList.add("show")};
$("#close-checkout").onclick=()=>$("#checkout-modal").classList.remove("show");
$("#checkout-modal").addEventListener("click",e=>{if(e.target.id==="checkout-modal")$("#checkout-modal").classList.remove("show")});
$("#checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length)return;
 if(supabase&&shippingFee()===null){$("#checkout-message").textContent="التوصيل غير متوفر لهذه الولاية أو هذا النوع حالياً. جرّب نوعاً آخر أو تواصل معنا.";return}
 const btn=$("#submit-order");btn.disabled=true;btn.textContent="جارٍ إرسال الطلب...";
 const fd=new FormData(e.currentTarget);
 const payload={customer_name:fd.get("customer_name").trim(),phone:fd.get("phone").trim(),wilaya:fd.get("wilaya"),commune:fd.get("commune").trim(),address:fd.get("address").trim(),note:fd.get("note").trim(),items:cart.map(x=>({product_id:x.id,name:x.name,price:x.price,quantity:x.qty})),delivery_type:fd.get("delivery_type"),total:0,status:"جديد"};
 try{
  if(!supabase)throw new Error("NOT_CONFIGURED");
  const {error}=await supabase.from("orders").insert(payload);if(error)throw error;
  cart=[];saveCart();e.currentTarget.reset();$("#checkout-message").textContent="تم استلام طلبك بنجاح! سنتواصل معك لتأكيده.";toast("تم إرسال طلبك بنجاح");setTimeout(()=>{$("#checkout-modal").classList.remove("show");$("#checkout-message").textContent=""},3000);
 }catch(err){console.error(err);$("#checkout-message").textContent=err.message==="NOT_CONFIGURED"?"المتجر في وضع المعاينة. اربط قاعدة البيانات لتفعيل استقبال الطلبات.":"تعذر إرسال الطلب. تحقق من الاتصال وحاول مجدداً."}
 finally{btn.disabled=false;btn.textContent="تأكيد الطلب"}
});
$("#wilaya").addEventListener("change",updateShipping);$("#delivery-type").addEventListener("change",updateShipping);
renderCart();loadProducts();loadRates();
