import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORE_NAME } from "./config.js";
import { trackPageView, trackViewContent, trackAddToCart, trackInitiateCheckout, trackLead, getOrderMeta } from "./meta.js";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (s) => document.querySelector(s);
let products = [];
let cart = JSON.parse(localStorage.getItem("dz_cart") || "[]");
let selectedCategory = "الكل";
let rates = {};
const MAX_QTY = 20;
const wilayas = ["أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون","برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة","أفلو","بريكة","قصر الشلالة","مسعد","عين وسارة","بوسعادة","الأبيض سيدي الشيخ","القنطرة","بئر العاتر","قصر البخاري","العريشة"];

const st = document.createElement("style");
st.textContent = `.opt{width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin:4px 0;font:inherit;font-size:13px;background:#fff}.opt-row{display:flex;gap:6px}.opt-row .opt{flex:1}.stock-note{font-size:11px;color:#a33;display:block}.disc-note{font-size:11px;color:#2c7a4b;display:block}.line-total{font-size:12px;color:#555;display:block;min-height:16px}.add-button:disabled{opacity:.5;cursor:not-allowed}.cart-line small{display:block}.cart-line s{opacity:.6}`;
document.head.append(st);

$("#store-name").textContent = STORE_NAME; $("#footer-store-name").textContent = STORE_NAME; $("#year").textContent = new Date().getFullYear();
$("#wilaya").innerHTML += wilayas.map((w,i)=>`<option value="${w}">${String(i+1).padStart(2,"0")} - ${w}</option>`).join("");
const money = n => `${Number(n||0).toLocaleString("fr-DZ")} دج`;
const r2 = n => Math.round(n*100)/100;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

// ===== المنتجات: مخزون وخصم =====
const prodOf = id => products.find(x=>String(x.id)===String(id));
const maxFor = p => p ? Math.min(MAX_QTY, p.stock!=null ? Number(p.stock) : MAX_QTY) : MAX_QTY;
const isOut = p => p.stock!=null && Number(p.stock)<=0;
// الطريقة 1: كل القطع تنزل بنفس النسبة (يجب أن تطابق discounted_unit_price في SQL)
function unitPrice(p,q){
  const base=Number(p.price);
  if(!p.discount_enabled||q<=1)return base;
  const pct=Math.min(Number(p.discount_step||0)*(q-1),Number(p.discount_max||0));
  return r2(base*(1-pct/100));
}
const productQty = id => cart.filter(x=>String(x.id)===String(id)).reduce((s,x)=>s+x.qty,0);
function cartLines(){return cart.map(x=>{const p=prodOf(x.id);const base=p?Number(p.price):x.price;const unit=p?unitPrice(p,productQty(x.id)):x.price;return {...x,base,unit,line:r2(unit*x.qty)}})}
const cartSubtotal = () => r2(cartLines().reduce((s,x)=>s+x.line,0));

function saveCart(){localStorage.setItem("dz_cart",JSON.stringify(cart));renderCart()}
function renderCart(){
  $("#cart-count").textContent=cart.reduce((s,x)=>s+x.qty,0);
  const lines=cartLines();
  $("#cart-items").innerHTML=lines.length?lines.map((x,i)=>`<div class="cart-line"><div><strong>${escapeHtml(x.name)}</strong>${(x.size||x.color)?`<small>${[x.size,x.color].filter(Boolean).map(escapeHtml).join(" • ")}</small>`:""}<small>${money(x.unit)} × ${x.qty}${x.unit<x.base?` <s>${money(x.base)}</s>`:""} = ${money(x.line)}</small></div><div class="qty-controls"><button data-dec="${i}">−</button><span>${x.qty}</span><button data-inc="${i}">+</button></div></div>`).join(""):'<p class="muted">السلة فارغة حالياً.</p>';
  $("#cart-total").textContent=money(cartSubtotal());
  $("#checkout-total").textContent=$("#cart-total").textContent;updateShipping();
}
function shippingFee(){const w=$("#wilaya").value,r=rates[w];if(!w||!r||r.is_active===false)return null;const v=$("#delivery-type").value==="desk"?r.desk_price:r.home_price;return v==null?null:Number(v)}
function syncDelivery(){const r=rates[$("#wilaya").value],sel=$("#delivery-type"),h=sel.querySelector('[value="home"]'),d=sel.querySelector('[value="desk"]');const lbl=(t,p)=>p==null?t+" — غير متوفر":t+" — "+(Number(p)===0?"مجاني":money(p));h.textContent=r?lbl("إلى المنزل",r.home_price):"إلى المنزل";d.textContent=r?lbl("إلى المكتب (Stop Desk)",r.desk_price):"إلى المكتب (Stop Desk)";h.disabled=!!r&&r.home_price==null;d.disabled=!!r&&r.desk_price==null;if(sel.value==="desk"&&d.disabled&&!h.disabled)sel.value="home";if(sel.value==="home"&&h.disabled&&!d.disabled)sel.value="desk"}
function updateShipping(){const sub=cartSubtotal();syncDelivery();const fee=shippingFee();$("#checkout-shipping").textContent=!$("#wilaya").value?"اختر الولاية":fee===null?"غير متوفر لهذه الوجهة":fee===0?"مجاني":money(fee);$("#checkout-grand").textContent=money(sub+(fee||0))}
async function loadRates(){if(!supabase)return;const {data}=await supabase.from("shipping_rates").select("*");rates=Object.fromEntries((data||[]).map(r=>[r.wilaya,r]));updateShipping()}
function renderCategories(){
 const cats=["الكل",...new Set(products.map(p=>p.category||"عام"))];
 $("#categories").innerHTML=cats.map(c=>`<button class="category ${c===selectedCategory?"active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
}
function productCard(p){
 const sizes=p.sizes||[],colors=p.colors||[],out=isOut(p);
 const opts=out?"":`${sizes.length?`<select class="opt" data-opt="size"><option value="">اختر المقاس</option>${sizes.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}</select>`:""}${colors.length?`<select class="opt" data-opt="color"><option value="">اختر اللون</option>${colors.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}</select>`:""}<div class="opt-row"><input class="opt" type="number" data-qty min="1" max="${maxFor(p)}" value="1" inputmode="numeric" aria-label="الكمية"></div>`;
 const notes=`${p.stock!=null&&!out&&Number(p.stock)<=5?`<span class="stock-note">باقي ${Number(p.stock)} قطع فقط</span>`:""}${p.discount_enabled&&Number(p.discount_step)>0?`<span class="disc-note">خصم ${Number(p.discount_step)}% عن كل قطعة إضافية (حتى ${Number(p.discount_max)}%)</span>`:""}`;
 return `<article class="product-card" data-pid="${escapeHtml(p.id)}"><div class="product-image">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`:'<span class="placeholder-image">✧</span>'}</div><div class="product-info"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||"منتج مميز من متجرنا.")}</p>${notes}${opts}<span class="line-total" data-total></span><div class="product-bottom"><span class="price">${money(p.price)}</span>${out?'<button class="add-button" disabled>نفدت الكمية</button>':`<button class="add-button" data-add="${escapeHtml(p.id)}">أضف إلى السلة +</button>`}</div></div></article>`;
}
function renderProducts(){
 const q=$("#search").value.trim().toLowerCase();
 const shown=products.filter(p=>(selectedCategory==="الكل"||p.category===selectedCategory)&&(`${p.name} ${p.description||""}`).toLowerCase().includes(q));
 $("#product-grid").innerHTML=shown.length?shown.map(productCard).join(""):'<div class="loading">لا توجد منتجات مطابقة حالياً.</div>';
}
function readCard(card){
 const p=prodOf(card.dataset.pid);if(!p)return null;
 const size=card.querySelector('[data-opt="size"]')?.value||"",color=card.querySelector('[data-opt="color"]')?.value||"";
 let qty=parseInt(card.querySelector("[data-qty]")?.value,10);if(!(qty>=1))qty=1;
 return {p,size,color,qty};
}
// تعديل الكميات في السلة بحسب المتوفر بعد تحميل المنتجات
function sanitizeCart(){
 let changed=false;
 cart=cart.filter(x=>{const p=prodOf(x.id);if(!p||isOut(p)){changed=true;return false}
  if((p.sizes||[]).length&&!p.sizes.includes(x.size)){changed=true;return false}
  if((p.colors||[]).length&&!p.colors.includes(x.color)){changed=true;return false}return true});
 const seen={};
 cart.forEach(x=>{const p=prodOf(x.id),m=maxFor(p),used=seen[x.id]||0;const allowed=Math.max(0,m-used);if(x.qty>allowed){x.qty=allowed;changed=true}seen[x.id]=used+x.qty});
 cart=cart.filter(x=>x.qty>0);
 if(changed){toast("تم تحديث السلة حسب المتوفر");saveCart()}else renderCart();
}
async function loadProducts(){
 let ok=true;
 if(!supabase){products=JSON.parse(localStorage.getItem("dz_demo_products")||"null")||[
 {id:"demo-1",name:"قميص MOX Essential",description:"قطعة أساسية بقصة نظيفة وخامة مريحة.",price:2500,category:"الأكثر طلباً",image_url:""},
 {id:"demo-2",name:"MOX Everyday Tee",description:"بساطة مدروسة لإطلالة يومية أنيقة.",price:3900,category:"جديد",image_url:""}
 ];ok=false;toast("وضع المعاينة: اربط Supabase لتفعيل الطلبات الحقيقية");}
 else {const {data,error}=await supabase.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false});if(error){console.error(error);toast("تعذر تحميل المنتجات");products=[];ok=false}else products=data||[]}
 renderCategories();renderProducts();
 if(ok)sanitizeCart();else renderCart();
}
$("#product-grid").addEventListener("click",e=>{
 const b=e.target.closest("[data-add]");if(!b)return;
 const card=b.closest(".product-card"),r=readCard(card);if(!r)return;
 const {p,size,color,qty}=r;
 if((p.sizes||[]).length&&!size){toast("اختر المقاس أولاً");return}
 if((p.colors||[]).length&&!color){toast("اختر اللون أولاً");return}
 const total=productQty(p.id)+qty,m=maxFor(p);
 if(total>m){toast(p.stock!=null&&Number(p.stock)<MAX_QTY?`المتوفر ${Number(p.stock)} قطعة فقط`:`الحد الأقصى ${MAX_QTY} قطعة`);return}
 const old=cart.find(x=>String(x.id)===String(p.id)&&(x.size||"")===size&&(x.color||"")===color);
 if(old)old.qty+=qty;else cart.push({id:p.id,name:p.name,price:Number(p.price),qty,size,color});
 saveCart();toast("تمت إضافة المنتج إلى السلة");
 trackViewContent(p);trackAddToCart(p,qty); // Meta (ViewContent مرة واحدة لكل منتج)
});
// معاينة السعر (مع الخصم) قبل الإضافة
$("#product-grid").addEventListener("input",e=>{
 const card=e.target.closest(".product-card");if(!card)return;const r=readCard(card);if(!r)return;
 const {p,qty}=r,tq=productQty(p.id)+qty,unit=unitPrice(p,tq),el=card.querySelector("[data-total]");if(!el)return;
 el.textContent=p.discount_enabled&&unit<Number(p.price)?`سعر القطعة ${money(unit)} بعد الخصم (إجمالي ${tq} قطع)`:"";
});
// Meta Pixel: ViewContent عند أول تفاعل مع بطاقة المنتج
["click","change"].forEach(t=>$("#product-grid").addEventListener(t,e=>{const card=e.target.closest(".product-card");if(!card)return;const p=prodOf(card.dataset.pid);if(p)trackViewContent(p)}));
$("#categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;selectedCategory=b.dataset.category;renderCategories();renderProducts()});
$("#search").addEventListener("input",renderProducts);
$("#cart-items").addEventListener("click",e=>{
 const inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]");
 if(inc){const x=cart[Number(inc.dataset.inc)];if(!x)return;const p=prodOf(x.id);if(productQty(x.id)>=maxFor(p)){toast("بلغت الحد الأقصى المتاح لهذا المنتج");return}x.qty++}
 if(dec){const i=Number(dec.dataset.dec),x=cart[i];if(!x)return;x.qty--;if(x.qty<=0)cart.splice(i,1)}
 saveCart();
});
function cartOpen(open){$("#cart-drawer").classList.toggle("open",open);$("#cart-overlay").classList.toggle("show",open)}
$("#open-cart").onclick=()=>cartOpen(true);$("#close-cart").onclick=()=>cartOpen(false);$("#cart-overlay").onclick=()=>cartOpen(false);
$("#go-checkout").onclick=()=>{if(!cart.length){toast("أضف منتجاً إلى السلة أولاً");return}cartOpen(false);$("#checkout-modal").classList.add("show");trackInitiateCheckout(cartLines(),cartSubtotal())};
$("#close-checkout").onclick=()=>$("#checkout-modal").classList.remove("show");
$("#checkout-modal").addEventListener("click",e=>{if(e.target.id==="checkout-modal")$("#checkout-modal").classList.remove("show")});
const ORDER_ERRORS={"Insufficient stock":"الكمية المطلوبة لم تعد متوفرة. حدّثنا السلة، راجعها ثم أعد المحاولة.","Product unavailable":"أحد المنتجات لم يعد متوفراً. راجع السلة ثم أعد المحاولة.","Invalid size":"المقاس المختار غير متوفر. راجع السلة.","Invalid color":"اللون المختار غير متوفر. راجع السلة.","Invalid item quantity":"كمية غير صالحة في السلة."};
$("#checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length)return;
 if(supabase&&shippingFee()===null){$("#checkout-message").textContent="التوصيل غير متوفر لهذه الولاية أو هذا النوع حالياً. جرّب نوعاً آخر أو تواصل معنا.";return}
 const btn=$("#submit-order");btn.disabled=true;btn.textContent="جارٍ إرسال الطلب...";
 const form=e.currentTarget,fd=new FormData(form);
 const payload={customer_name:fd.get("customer_name").trim(),phone:fd.get("phone").trim(),wilaya:fd.get("wilaya"),commune:fd.get("commune").trim(),address:fd.get("address").trim(),note:fd.get("note").trim(),items:cartLines().map(x=>({product_id:x.id,name:x.name,price:x.unit,quantity:x.qty,size:x.size||null,color:x.color||null})),delivery_type:fd.get("delivery_type"),total:0,status:"جديد"};
 const leadLines=cartLines(),leadValue=cartSubtotal();
 try{
  if(!supabase)throw new Error("NOT_CONFIGURED");
  let {error}=await supabase.from("orders").insert({...payload,...getOrderMeta()});
  // قبل تشغيل SQL الخاص بأعمدة meta_* نعيد المحاولة بدونها حتى لا يتعطل استقبال الطلبات
  if(error&&(error.code==="PGRST204"||String(error.message||"").includes("meta_")))({error}=await supabase.from("orders").insert(payload));
  if(error)throw error;
  trackLead(leadLines,leadValue,payload.phone);
  cart=[];saveCart();form.reset();$("#checkout-message").textContent="تم استلام طلبك بنجاح! سنتواصل معك لتأكيده.";toast("تم إرسال طلبك بنجاح");setTimeout(()=>{$("#checkout-modal").classList.remove("show");$("#checkout-message").textContent=""},3000);
  loadProducts(); // تحديث المخزون الظاهر
 }catch(err){console.error(err);
  const known=Object.keys(ORDER_ERRORS).find(k=>String(err.message||"").includes(k));
  $("#checkout-message").textContent=err.message==="NOT_CONFIGURED"?"المتجر في وضع المعاينة. اربط قاعدة البيانات لتفعيل استقبال الطلبات.":known?ORDER_ERRORS[known]:"تعذر إرسال الطلب. تحقق من الاتصال وحاول مجدداً.";
  if(known)loadProducts();
 }
 finally{btn.disabled=false;btn.textContent="تأكيد الطلب"}
});
$("#wilaya").addEventListener("change",updateShipping);$("#delivery-type").addEventListener("change",updateShipping);
renderCart();loadProducts();loadRates();

async function loadHeroVideos(){
 const v=$("#hero-video");if(!supabase||!v)return;
 const {data}=await supabase.from("hero_videos").select("video_url").eq("is_active",true).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
 const list=(data||[]).map(x=>x.video_url).filter(Boolean);if(!list.length)return;
 let i=0;v.src=list[0];v.loop=list.length===1;
 if(list.length>1)v.addEventListener("ended",()=>{i=(i+1)%list.length;v.src=list[i];v.play().catch(()=>{})});
 v.play().catch(()=>{});
}
loadHeroVideos();
trackPageView();
