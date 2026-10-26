const state = {
  cart: loadCart(),
  modalId: null,
  color: 0,
  size: null,
  qty: 1,
  lastFocus: null,
};

const $ = (sel) => document.querySelector(sel);
const grids = {
  bluze: $("#grid-bluze"),
  camasi: $("#grid-camasi"),
  tricouri: $("#grid-tricouri"),
  pijamale: $("#grid-pijamale"),
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

function money(value) {
  return priceText(value);
}

function moneyLocal(amount) {
  return formatAmount(amount);
}

function lineUnit(item) {
  return priceAmount(item.price);
}

function productById(id) {
  return PRODUCTS.find((item) => item.id === id);
}

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem("lina-cart") || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        const product = PRODUCTS.find((entry) => entry.id === item.id);
        let colorIndex = Number.isInteger(item.colorIndex) ? item.colorIndex : -1;
        if (colorIndex < 0 && product) colorIndex = product.colors.findIndex((entry) => entry.name === item.color);
        if (!product || colorIndex < 0 || !item.size) return null;
        return {
          key: `${item.id}|${colorIndex}|${item.size}`,
          id: item.id,
          colorIndex,
          size: item.size,
          price: product.price,
          qty: Math.min(8, Math.max(1, Number(item.qty) || 1)),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("lina-cart", JSON.stringify(state.cart));
}

function loadCustomer() {
  try {
    return JSON.parse(localStorage.getItem("lina-customer") || "{}");
  } catch {
    return {};
  }
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.qty * lineUnit(item), 0);
}

function photoFor(product, alt) {
  const file = String(product.image || "alba.jpg").replace(/[^a-z0-9._-]/gi, "");
  return `<img src="/images/${file}?v=5" alt="${esc(alt || `${product.kind} ${product.name}`)}">`;
}

function renderBrand() {
  const name = STORE_CONFIG.brand || "Lina";
  const market = currentMarket();
  document.documentElement.lang = market.htmlLang;
  document.title = `${name} — ${t("pageTitle")}`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", t("metaDesc"));
  document.querySelectorAll("[data-brand]").forEach((node) => {
    node.textContent = name;
  });
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-model]").forEach((node) => {
    const product = productById(node.dataset.model);
    if (product) node.textContent = localize(product).name;
  });
  document.querySelectorAll("[data-pick]").forEach((node) => {
    node.classList.toggle("is-on", node.dataset.pick === marketCode());
  });
  const currentLang = document.querySelector(".langbar a.is-on");
  const langbar = currentLang && currentLang.parentElement;
  if (langbar && langbar.scrollWidth > langbar.clientWidth + 4) {
    langbar.scrollLeft = currentLang.offsetLeft - langbar.clientWidth / 2 + currentLang.offsetWidth / 2;
  }
  const menu = $("#menu-btn");
  if (menu) menu.textContent = document.body.classList.contains("nav-open") ? t("menuClose") : t("menu");
  const general = $("#wa-general");
  if (general) general.href = waLink(t("waMore", { brand: name }));
  const notice = $("#notice");
  if (notice && STORE_CONFIG.whatsapp === STORE_CONFIG.placeholderNumber) notice.hidden = false;
}

function renderProducts() {
  Object.entries(grids).forEach(([category, grid]) => {
    const featured = { bluze: "frunza", camasi: "alba", tricouri: "rand", pijamale: "luna" }[category];
    const items = PRODUCTS.filter((item) => item.category === category).sort(
      (a, b) => Number(b.id === featured) - Number(a.id === featured)
    );
    grid.innerHTML = items
      .map((product) => {
        const view = localize(product);
        return `
          <button class="card" type="button" data-open="${esc(view.id)}">
            <span class="card-art">${photoFor(view)}</span>
            <span class="card-body">
              <span class="eyebrow">${esc(view.kind)}</span>
              <span class="card-line">
                <span class="name">${esc(view.name)}</span>
                <span class="price">${money(view.price)}</span>
              </span>
              <span class="fabric">${esc(view.fabric)}</span>
            </span>
          </button>`;
      })
      .join("");
  });
}

function renderCart() {
  const box = $("#cart-items");
  const count = cartCount();
  $("#cart-count").textContent = String(count);
  $("#cart-total").textContent = moneyLocal(cartTotal());
  $("#submit-order").disabled = count === 0;

  if (!state.cart.length) {
    box.innerHTML = `<p class="empty">${esc(t("emptyCart"))}</p>`;
    renderPreview();
    return;
  }

  box.innerHTML = state.cart
    .map((item) => {
      const product = productById(item.id);
      const view = product ? localize(product) : null;
      const color = view ? view.colors[item.colorIndex] : null;
      const thumb = view ? photoFor(view, view.name) : "";
      return `
        <article class="line">
          <div class="line-art">${thumb}</div>
          <div>
            <h3>${esc(view ? view.name : item.id)}</h3>
            <p>${esc(view ? view.kind : "")} · ${esc(color ? color.label : "")} · ${esc(t("waSize"))} ${esc(item.size)}</p>
            <div class="line-actions">
              <div class="mini">
                <button type="button" data-cart="dec" data-key="${esc(item.key)}" aria-label="${esc(t("dec"))}">−</button>
                <span>${item.qty}</span>
                <button type="button" data-cart="inc" data-key="${esc(item.key)}" aria-label="${esc(t("inc"))}">+</button>
              </div>
              <strong>${moneyLocal(lineUnit(item) * item.qty)}</strong>
              <button class="linkish" type="button" data-cart="remove" data-key="${esc(item.key)}">${esc(t("remove"))}</button>
            </div>
          </div>
        </article>`;
    })
    .join("");
  renderPreview();
}

function openProduct(id) {
  const product = productById(id);
  if (!product) return;
  state.modalId = id;
  state.color = 0;
  state.size = null;
  state.qty = 1;
  state.lastFocus = document.activeElement;
  renderModal();
  $("#modal").hidden = false;
  $("#modal").classList.add("is-on");
  $("#overlay").classList.add("is-on");
  document.body.classList.add("lock");
  $("#modal-close").focus();
}

function renderModal() {
  const source = productById(state.modalId);
  if (!source) return;
  const product = localize(source);
  $("#modal").innerHTML = `
    <div class="sheet">
      <div class="sheet-art">${photoFor(product)}</div>
      <div class="sheet-copy">
        <button class="close" id="modal-close" type="button" aria-label="${esc(t("closeProduct"))}">×</button>
        <p class="eyebrow">${esc(product.kind)} · ${esc(product.fabric)}</p>
        <h2 id="modal-title">${esc(product.name)}</h2>
        <div class="price-line">
          <strong>${money(product.price)}</strong>
          <span class="fabric">${esc(product.blurb)}</span>
        </div>
        <p class="story">${esc(product.story)}</p>
        <span class="field-label">${esc(t("color"))}</span>
        <div class="swatches">
          ${product.colors
            .map(
              (entry, index) => `
                <button class="swatch" type="button" data-color="${index}" aria-pressed="${index === state.color}">
                  <i style="background:${esc(entry.stripe ? `linear-gradient(135deg, ${entry.hex} 52%, ${entry.stripe} 52%)` : entry.hex)}"></i>${esc(entry.label)}
                </button>`
            )
            .join("")}
        </div>
        <span class="field-label">${esc(t("size"))}</span>
        <div class="sizes" id="size-row">
          ${SIZES.map(
            (size) => `
              <button class="size" type="button" data-size="${size}" aria-pressed="${state.size === size}">${size}</button>`
          ).join("")}
        </div>
        <p class="fine">${esc(t("sizeHelp"))}</p>
        <div class="buy-row">
          <div class="qty">
            <button type="button" data-qty="-1" aria-label="${esc(t("dec"))}">−</button>
            <span>${state.qty}</span>
            <button type="button" data-qty="1" aria-label="${esc(t("inc"))}">+</button>
          </div>
          <button class="btn btn-primary" id="add-cart" type="button">${esc(t("add"))}</button>
        </div>
        <p class="hint" id="size-hint"></p>
        <p class="care">${esc(product.care)} ${esc(t("careStock"))}</p>
      </div>
    </div>`;
}

function closeModal() {
  $("#modal").classList.remove("is-on");
  $("#modal").hidden = true;
  $("#modal").innerHTML = "";
  state.modalId = null;
  if (!$("#drawer").classList.contains("is-on")) {
    $("#overlay").classList.remove("is-on");
    document.body.classList.remove("lock");
  }
  if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
}

function openCart() {
  $("#drawer").hidden = false;
  requestAnimationFrame(() => $("#drawer").classList.add("is-on"));
  $("#overlay").classList.add("is-on");
  document.body.classList.add("lock");
}

function closeCart() {
  $("#drawer").classList.remove("is-on");
  $("#overlay").classList.remove("is-on");
  document.body.classList.remove("lock");
  setTimeout(() => {
    if (!$("#drawer").classList.contains("is-on")) $("#drawer").hidden = true;
  }, 280);
}

function addCurrentToCart() {
  const product = productById(state.modalId);
  if (!product) return;
  if (!state.size) {
    $("#size-row").classList.remove("need");
    void $("#size-row").offsetWidth;
    $("#size-row").classList.add("need");
    $("#size-hint").textContent = t("needSize");
    return;
  }
  const key = `${product.id}|${state.color}|${state.size}`;
  const existing = state.cart.find((item) => item.key === key);
  if (existing) existing.qty = Math.min(8, existing.qty + state.qty);
  else {
    state.cart.push({
      key,
      id: product.id,
      colorIndex: state.color,
      size: state.size,
      price: product.price,
      qty: state.qty,
    });
  }
  saveCart();
  renderCart();
  closeModal();
  openCart();
  toast(t("added"));
}

function updateQty(key, delta) {
  const item = state.cart.find((entry) => entry.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter((entry) => entry.key !== key);
  else item.qty = Math.min(8, item.qty);
  saveCart();
  renderCart();
}

function customerFromForm() {
  const form = $("#order-form");
  return {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    city: form.city.value.trim(),
    address: form.address.value.trim(),
    note: form.note.value.trim(),
  };
}

function orderLine(item) {
  const source = productById(item.id);
  const view = source ? localize(source) : null;
  const color = view ? view.colors[item.colorIndex] : null;
  const unit = lineUnit(item);
  const line = unit * item.qty;
  const model = view && view.name !== view.nameRo ? `${view.name} / ${view.nameRo}` : view ? view.name : item.id;
  const kind = view && view.kind !== view.kindRo ? `${view.kind} / ${view.kindRo}` : view ? view.kind : "";
  const colorText = color && color.label !== color.name ? `${color.label} (${color.name})` : color ? color.name : "";
  return `• ${model} (${kind}) — ${colorText}, ${t("waSize")} ${item.size} — ${pieces(item.qty)} × ${formatAmount(unit)} = ${formatAmount(line)}`;
}

function buildMessage(customer) {
  const lines = [
    t("waHello", { brand: STORE_CONFIG.brand }),
    "",
    ...state.cart.map(orderLine),
    "",
    t("waTotal", { total: moneyLocal(cartTotal()) }),
    "",
    `${t("waName")}: ${customer.name || "—"}`,
    `${t("waPhone")}: ${customer.phone || "—"}`,
    `${t("waCity")}: ${customer.city || "—"}`,
    `${t("waAddress")}: ${customer.address || "—"}`,
  ];
  if (customer.note) lines.push(`${t("waNote")}: ${customer.note}`);
  lines.push("", t("waWait"));
  return lines.join("\n");
}

function renderPreview() {
  const preview = $("#preview");
  if (!preview) return;
  preview.textContent = buildMessage(customerFromForm());
}

function waLink(text) {
  const number = String(STORE_CONFIG.whatsapp || "").replace(/\D/g, "");
  // WhatsApp pentru Windows preface rândurile noi cu spațiu. Separatorul de linie rămâne unul sub altul.
  const kept = text.replace(/\n/g, "\u2028");
  return `https://wa.me/${number}?text=${encodeURIComponent(kept)}`;
}

function toast(text) {
  const node = $("#toast");
  node.textContent = text;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2400);
}

function validate(customer) {
  if (!state.cart.length) return t("errEmpty");
  if (customer.name.length < 2) return t("errName");
  const digits = customer.phone.replace(/\D/g, "");
  if (digits.length < 10) return t("errPhone");
  if (customer.city.length < 2) return t("errCity");
  if (customer.address.length < 5) return t("errAddress");
  return "";
}

function submitOrder(event) {
  event.preventDefault();
  const customer = customerFromForm();
  const error = validate(customer);
  $("#form-error").textContent = error;
  if (error) return;
  localStorage.setItem("lina-customer", JSON.stringify(customer));
  const link = document.createElement("a");
  link.href = waLink(buildMessage(customer));
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
  toast(t("opening"));
}

function fillCustomer() {
  const saved = loadCustomer();
  const form = $("#order-form");
  ["name", "phone", "city", "address", "note"].forEach((key) => {
    if (saved[key]) form[key].value = saved[key];
  });
}

function onClick(event) {
  const open = event.target.closest("[data-open]");
  if (open) {
    openProduct(open.dataset.open);
    return;
  }
  if (event.target.closest("#modal-close")) {
    closeModal();
    return;
  }
  if (event.target.id === "modal") {
    closeModal();
    return;
  }
  const colorBtn = event.target.closest("[data-color]");
  if (colorBtn && state.modalId) {
    const index = colorBtn.dataset.color;
    state.color = Number(index);
    renderModal();
    document.querySelector(`[data-color="${index}"]`)?.focus();
    return;
  }
  const sizeBtn = event.target.closest("[data-size]");
  if (sizeBtn && state.modalId) {
    state.size = sizeBtn.dataset.size;
    renderModal();
    document.querySelector(`[data-size="${state.size}"]`)?.focus();
    return;
  }
  const qtyBtn = event.target.closest("[data-qty]");
  if (qtyBtn && state.modalId) {
    const direction = qtyBtn.dataset.qty;
    state.qty = Math.min(5, Math.max(1, state.qty + Number(direction)));
    renderModal();
    document.querySelector(`[data-qty="${direction}"]`)?.focus();
    return;
  }
  if (event.target.closest("#add-cart")) {
    addCurrentToCart();
    return;
  }
  const cartBtn = event.target.closest("[data-cart]");
  if (cartBtn) {
    const key = cartBtn.dataset.key;
    if (cartBtn.dataset.cart === "remove") updateQty(key, -99);
    if (cartBtn.dataset.cart === "inc") updateQty(key, 1);
    if (cartBtn.dataset.cart === "dec") updateQty(key, -1);
    return;
  }
  if (event.target.closest("#open-cart")) {
    openCart();
    return;
  }
  if (event.target.closest("#close-cart") || event.target.id === "overlay") {
    closeModal();
    closeCart();
    return;
  }
  if (event.target.closest("#menu-btn")) {
    const openNav = document.body.classList.toggle("nav-open");
    $("#menu-btn").setAttribute("aria-expanded", String(openNav));
    $("#menu-btn").textContent = openNav ? t("menuClose") : t("menu");
    return;
  }
  if (event.target.closest(".nav a")) {
    document.body.classList.remove("nav-open");
    $("#menu-btn").setAttribute("aria-expanded", "false");
    $("#menu-btn").textContent = t("menu");
  }
}

function onKey(event) {
  if (event.key === "Escape") {
    closeModal();
    closeCart();
    document.body.classList.remove("nav-open");
  }
}

function watchHeader() {
  const header = $(".header");
  const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

document.addEventListener("click", onClick);
document.addEventListener("keydown", onKey);
$("#order-form").addEventListener("submit", submitOrder);
$("#order-form").addEventListener("input", renderPreview);
$("#year").textContent = String(new Date().getFullYear());

renderBrand();
renderProducts();
fillCustomer();
renderCart();
watchHeader();
refreshRates(() => {
  renderProducts();
  renderCart();
  if (state.modalId) renderModal();
});
