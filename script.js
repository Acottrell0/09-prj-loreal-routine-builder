/* The class-hosted Worker keeps the OpenAI key off the public website. */
const WORKER_URL = "https://chatbot.ajcottr1.workers.dev/";
let savedProductIds = [];
try {
  savedProductIds = JSON.parse(localStorage.getItem("lorealSelectedProducts") || "[]");
} catch (error) {
  localStorage.removeItem("lorealSelectedProducts");
}
let allProducts = [];
let selectedProducts = [];
let messages = [
  {
    role: "system",
    content:
      "You are a warm, careful L'Oréal beauty advisor. Give practical skincare, haircare, makeup, fragrance, or grooming advice. Stay focused on the user's selected products and routine. Do not diagnose medical conditions. Format routine responses with a short welcome, clear numbered AM and PM steps, a helpful usage tip, and a brief caution when needed. Use plain text with short lines and section headings.",
  },
];

const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const selectionEmpty = document.getElementById("selectionEmpty");
const generateRoutineButton = document.getElementById("generateRoutine");
const clearSelectionsButton = document.getElementById("clearSelections");
const rtlToggle = document.getElementById("rtlToggle");
const sendButton = document.getElementById("sendBtn");

productsContainer.innerHTML = `<div class="placeholder-message">Loading your product edit…</div>`;

async function loadProducts() {
  const response = await fetch("products.json");
  if (!response.ok) throw new Error("Products could not be loaded.");
  const data = await response.json();
  return data.products;
}

function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `<div class="placeholder-message">No products match those filters. Try another search.</div>`;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <article class="product-card ${isSelected(product.id) ? "is-selected" : ""}" data-product-id="${product.id}" tabindex="0" role="button" aria-pressed="${isSelected(product.id)}">
      <div class="product-image-wrap">
        <img src="${product.image}" alt="${product.name}">
        <span class="selected-badge"><i class="fa-solid fa-check" aria-hidden="true"></i> Added</span>
      </div>
      <div class="product-info">
        <p class="product-brand">${product.brand}</p>
        <h3>${product.name}</h3>
        <details>
          <summary>View description</summary>
          <p>${product.description}</p>
        </details>
      </div>
    </article>
  `
    )
    .join("");
}

function isSelected(productId) {
  return selectedProducts.some((product) => product.id === productId);
}

function renderFilteredProducts() {
  const searchTerm = productSearch.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const filteredProducts = allProducts.filter((product) => {
    const searchableText = `${product.name} ${product.brand} ${product.description}`.toLowerCase();
    return (!category || product.category === category) && (!searchTerm || searchableText.includes(searchTerm));
  });
  displayProducts(filteredProducts);
}

function saveSelections() {
  localStorage.setItem("lorealSelectedProducts", JSON.stringify(selectedProducts.map((product) => product.id)));
}

function renderSelectedProducts() {
  selectedCount.textContent = selectedProducts.length;
  selectionEmpty.hidden = selectedProducts.length > 0;
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-item">
          <img src="${product.image}" alt="">
          <span>${product.name}</span>
          <button type="button" class="remove-product" data-remove-id="${product.id}" aria-label="Remove ${product.name}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
      `
    )
    .join("");
}

function toggleProduct(productId) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product) return;
  selectedProducts = isSelected(productId)
    ? selectedProducts.filter((item) => item.id !== productId)
    : [...selectedProducts, product];
  saveSelections();
  renderSelectedProducts();
  renderFilteredProducts();
}

function addMessage(role, content, keepInHistory = true) {
  if (keepInHistory) {
    messages.push({ role, content });
  }
  const messageElement = document.createElement("div");
  messageElement.className = `chat-message ${role}`;
  messageElement.textContent = content;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function askWorker() {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error(`Worker returned ${response.status}. Check the Worker URL in script.js.`);
  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error("The Worker returned an unexpected response.");
  return reply;
}

async function submitMessage(content) {
  addMessage("user", content);
  chatForm.classList.add("is-loading");
  userInput.disabled = true;
  sendButton.disabled = true;
  generateRoutineButton.disabled = true;
  try {
    const reply = await askWorker();
    addMessage("assistant", reply);
  } catch (error) {
    addMessage("assistant", `I couldn't reach the routine advisor. ${error.message}`, false);
  } finally {
    chatForm.classList.remove("is-loading");
    userInput.disabled = false;
    sendButton.disabled = false;
    generateRoutineButton.disabled = false;
    userInput.focus();
  }
}

productsContainer.addEventListener("click", (event) => {
  if (event.target.closest("details")) return;
  const card = event.target.closest("[data-product-id]");
  if (card) toggleProduct(Number(card.dataset.productId));
});

productsContainer.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("details")) return;
  event.preventDefault();
  toggleProduct(Number(event.target.dataset.productId));
});

selectedProductsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-id]");
  if (removeButton) toggleProduct(Number(removeButton.dataset.removeId));
});

categoryFilter.addEventListener("change", renderFilteredProducts);
productSearch.addEventListener("input", renderFilteredProducts);

clearSelectionsButton.addEventListener("click", () => {
  selectedProducts = [];
  saveSelections();
  renderSelectedProducts();
  renderFilteredProducts();
});

generateRoutineButton.addEventListener("click", async () => {
  if (!selectedProducts.length) {
    addMessage("assistant", "Choose at least one product first, and I’ll build your routine.");
    return;
  }
  const productContext = selectedProducts.map(({ name, brand, category, description }) => ({
    name,
    brand,
    category,
    description,
  }));
  await submitMessage(`Create a personalized routine using only the selected products below.

Selected products:
${JSON.stringify(productContext, null, 2)}

Please organize the answer for easy reading:
1. Recommend an AM routine and a PM routine.
2. Use each product in a logical order and explain why it belongs in that step.
3. Do not add any products that are not listed.
4. Include a short starting-tip section for sensitive skin or ingredient use.
5. Keep the advice practical, warm, and concise.`);
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = userInput.value.trim();
  if (!content) return;
  userInput.value = "";
  await submitMessage(content);
});

rtlToggle.addEventListener("click", () => {
  const isRtl = document.documentElement.dir === "rtl";
  document.documentElement.dir = isRtl ? "ltr" : "rtl";
  document.documentElement.lang = isRtl ? "en" : "ar";
  rtlToggle.setAttribute("aria-pressed", String(!isRtl));
  rtlToggle.innerHTML = isRtl
    ? 'العربية <span aria-hidden="true">↔</span>'
    : 'English <span aria-hidden="true">↔</span>';
});

async function initialize() {
  try {
    allProducts = await loadProducts();
    selectedProducts = savedProductIds.map((id) => allProducts.find((product) => product.id === id)).filter(Boolean);
    renderSelectedProducts();
    renderFilteredProducts();
    addMessage("assistant", "Select a few products and I’ll shape them into a routine that feels made for you.");
  } catch (error) {
    productsContainer.innerHTML = `<div class="placeholder-message">${error.message}</div>`;
  }
}

initialize();
