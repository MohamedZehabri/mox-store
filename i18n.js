/* MOX i18n: العربية / Français / English
   ملف مستقل: يترجم الصفحة تلقائياً ويبدّل اتجاهها، ولا يعدّل app.js */
(function () {
  'use strict';
  var STORE_KEY = 'mox_lang';
  var LANGS = { ar: 'rtl', fr: 'ltr', en: 'ltr' };

  // [الفرنسية, الإنجليزية]
  var T = {
    'التشكيلة': ['Collection', 'Collection'],
    'عن MOX': ['À propos de MOX', 'About MOX'],
    'تواصل معنا': ['Nous contacter', 'Contact us'],
    'السلة': ['Panier', 'Cart'],
    'أناقتك تبدأ': ['Votre élégance commence', 'Your elegance begins'],
    'من اختيارك': ['par votre choix', 'with your choice'],
    'قطع مختارة بعناية، بتفاصيل هادئة وحضور لا يحتاج إلى مبالغة. اكتشف أسلوبك مع MOX.': [
      'Des pièces choisies avec soin, aux détails discrets et à la présence sans excès. Découvrez votre style avec MOX.',
      'Carefully selected pieces with quiet details and a presence that needs no exaggeration. Discover your style with MOX.'],
    'اكتشف التشكيلة': ['Découvrir la collection', 'Explore the collection'],
    '←': ['→', '→'],
    '✓ الدفع عند الاستلام': ['✓ Paiement à la livraison', '✓ Cash on delivery'],
    '✓ توصيل إلى مختلف ولايات الجزائر': ['✓ Livraison dans toutes les wilayas d\'Algérie', '✓ Delivery across all Algerian wilayas'],
    'قطع تستحق مكاناً في خزانتك': ['Des pièces qui méritent une place dans votre garde-robe', 'Pieces worth a place in your wardrobe'],
    'ابحث عن قطعة...': ['Rechercher une pièce...', 'Search for a piece...'],
    'الكل': ['Tout', 'All'],
    'جارٍ تحميل المنتجات...': ['Chargement des produits...', 'Loading products...'],
    'لماذا نحن؟': ['Pourquoi nous ?', 'Why us?'],
    'أسلوب واضح': ['Un style clair', 'A clear style'],
    'وتفاصيل مدروسة': ['et des détails étudiés', 'and considered details'],
    'MOX علامة أزياء تحتفي بالبساطة والثقة. اختر قطعتك، أرسل طلبك، وسنتواصل معك لتأكيد المقاس والتوصيل قبل الشحن.': [
      'MOX est une marque de mode qui célèbre la simplicité et la confiance. Choisissez votre pièce, envoyez votre commande, et nous vous contacterons pour confirmer la taille et la livraison avant l\'expédition.',
      'MOX is a fashion label that celebrates simplicity and confidence. Choose your piece, place your order, and we\'ll contact you to confirm size and delivery before shipping.'],
    'MOX — Wear Your Identity. الدفع عند الاستلام متاح بعد تأكيد الطلب.': [
      'MOX — Wear Your Identity. Paiement à la livraison disponible après confirmation de la commande.',
      'MOX — Wear Your Identity. Cash on delivery is available after order confirmation.'],
    'جميع الحقوق محفوظة': ['Tous droits réservés', 'All rights reserved'],
    'إدارة المتجر': ['Administration', 'Store admin'],
    'سلة المشتريات': ['Panier d\'achats', 'Shopping cart'],
    'السلة فارغة حالياً.': ['Votre panier est vide.', 'Your cart is empty.'],
    'المجموع': ['Total', 'Total'],
    'إتمام الطلب': ['Passer la commande', 'Checkout'],
    'خطوة أخيرة': ['Dernière étape', 'Final step'],
    'معلومات التوصيل': ['Informations de livraison', 'Delivery information'],
    'الاسم واللقب': ['Nom et prénom', 'Full name'],
    'رقم الهاتف': ['Téléphone', 'Phone number'],
    'الدولة': ['Pays', 'Country'],
    'الجزائر': ['Algérie', 'Algeria'],
    'الولاية': ['Wilaya', 'Wilaya'],
    'اختر الولاية': ['Choisir la wilaya', 'Select wilaya'],
    'نوع التوصيل': ['Type de livraison', 'Delivery type'],
    'إلى المنزل': ['À domicile', 'Home delivery'],
    'إلى المكتب (Stop Desk)': ['Au bureau (Stop Desk)', 'To desk (Stop Desk)'],
    'البلدية': ['Commune', 'Commune'],
    'العنوان بالتفصيل': ['Adresse détaillée', 'Detailed address'],
    'ملاحظة (اختياري)': ['Remarque (facultatif)', 'Note (optional)'],
    'مجموع المنتجات': ['Sous-total', 'Subtotal'],
    'التوصيل': ['Livraison', 'Delivery'],
    'المجموع الكلي': ['Total général', 'Grand total'],
    'الدفع نقداً عند استلام الطلب. سيتم التواصل معك لتأكيد الطلب وتكلفة التوصيل قبل الشحن.': [
      'Paiement en espèces à la réception. Nous vous contacterons pour confirmer la commande et les frais de livraison avant l\'expédition.',
      'Cash payment on delivery. We will contact you to confirm your order and delivery cost before shipping.'],
    'تأكيد الطلب': ['Confirmer la commande', 'Confirm order'],
    'اكتب اسمك الكامل': ['Votre nom complet', 'Your full name'],
    '05 أو 06 أو 07': ['05, 06 ou 07', '05, 06 or 07'],
    'اختر أو اكتب اسم البلدية': ['Choisissez ou saisissez la commune', 'Choose or type the commune'],
    'الحي، الشارع، أقرب نقطة...': ['Quartier, rue, point de repère...', 'Neighborhood, street, landmark...'],
    'معلومات إضافية حول التوصيل': ['Informations complémentaires sur la livraison', 'Additional delivery info']
  };

  var lang = 'ar';
  try { var saved = localStorage.getItem(STORE_KEY); if (LANGS[saved]) lang = saved; } catch (e) {}

  var store = new WeakMap();
  var everTranslated = false;
  var pending = false;
  var obs;

  function tr(base) {
    if (lang === 'ar') return base;
    var m = base.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var core = m[2].replace(/\s+/g, ' ');
    if (!core) return base;
    var e = T[core];
    if (e) return m[1] + e[lang === 'fr' ? 0 : 1] + m[3];
    if (core.indexOf('دج') > -1) return m[1] + m[2].replace(/دج/g, 'DA') + m[3];
    return base;
  }

  function doTextNode(node) {
    var rec = store.get(node);
    var cur = node.nodeValue;
    var base;
    if (rec && cur === rec.written) { base = rec.orig; }
    else { base = cur; rec = { orig: cur }; }
    var out = tr(base);
    rec.written = out;
    store.set(node, rec);
    if (out !== cur) node.nodeValue = out;
  }

  function doAttr(el, attr, key) {
    if (el[key] === undefined) el[key] = el.getAttribute(attr);
    if (el[key] == null) return;
    el.setAttribute(attr, tr(el[key]));
  }

  function applyAll() {
    if (lang === 'ar' && !everTranslated) return;
    if (lang !== 'ar') everTranslated = true;

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') continue;
      nodes.push(n);
    }
    nodes.forEach(doTextNode);

    document.querySelectorAll('[placeholder]').forEach(function (el) { doAttr(el, 'placeholder', '_moxPh'); });
    document.querySelectorAll('[aria-label]').forEach(function (el) { doAttr(el, 'aria-label', '_moxAria'); });
    document.querySelectorAll('input[readonly]').forEach(function (el) {
      if (el._moxVal === undefined) el._moxVal = el.value;
      el.value = tr(el._moxVal);
    });
  }

  function run() {
    if (obs) obs.disconnect();
    try { applyAll(); } finally { startObs(); }
  }

  function startObs() {
    if (!obs) obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; run(); });
  }

  function setLang(l) {
    if (!LANGS[l]) return;
    lang = l;
    try { localStorage.setItem(STORE_KEY, l); } catch (e) {}
    document.documentElement.lang = l;
    document.documentElement.dir = LANGS[l];
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      var on = b.getAttribute('data-lang') === l;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    run();
  }

  function buildSwitcher() {
    var css = document.createElement('style');
    css.textContent =
      '.lang-switch{display:inline-flex;gap:4px;margin-inline:10px;direction:ltr;align-items:center}' +
      '.lang-switch button{background:none;border:1px solid currentColor;color:inherit;font:inherit;font-size:12px;font-weight:700;padding:5px 9px;border-radius:999px;cursor:pointer;opacity:.5;line-height:1}' +
      '.lang-switch button.active{opacity:1}';
    document.head.appendChild(css);

    var box = document.createElement('div');
    box.className = 'lang-switch';
    box.setAttribute('role', 'group');
    ['ar', 'fr', 'en'].forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-lang', l);
      b.textContent = l.toUpperCase();
      b.addEventListener('click', function () { setLang(l); });
      box.appendChild(b);
    });
    var cart = document.getElementById('open-cart');
    var bar = document.querySelector('.topbar');
    if (cart && cart.parentNode) cart.parentNode.insertBefore(box, cart);
    else if (bar) bar.appendChild(box);
  }

  buildSwitcher();
  setLang(lang);
})();
