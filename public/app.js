const API = "/api/listings";
const grid = document.getElementById("listingGrid");
const emptyState = document.getElementById("emptyState");
const message = document.getElementById("message");
const form = document.getElementById("listingForm");
const fields = ["title", "description", "price", "category", "condition", "seller_name", "contact_info"];
let listings = [];

const icons = { Books: "📚", Electronics: "🎧", Clothing: "👕", "Hostel & Home": "🪴", Other: "🛍️" };
const money = value => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "message error" : "message";
  window.setTimeout(() => { if (message.textContent === text) message.textContent = ""; }, 4500);
}

async function request(url, options = {}) {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...options.headers
  };

  if (!isFormData && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}

async function loadListings() {
  grid.innerHTML = '<div class="loading">Loading listings...</div>';
  const params = new URLSearchParams();
  const search = document.getElementById("searchInput").value.trim();
  const category = document.getElementById("categoryFilter").value;
  const status = document.getElementById("statusFilter").value;
  if (search) params.set("search", search);
  if (category !== "All") params.set("category", category);
  if (status !== "All") params.set("status", status);
  try {
    listings = await request(`${API}?${params.toString()}`);
    document.getElementById("totalCount").textContent = listings.length;
    renderListings(listings);
  } catch (error) {
    grid.innerHTML = "";
    showMessage(error.message, true);
  }
}

function renderListings(items) {
  grid.innerHTML = "";
  emptyState.hidden = items.length !== 0;
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "listing-card";
    const art = document.createElement("div");
    art.className = `product-art ${item.category.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`;
    art.textContent = icons[item.category] || "🛍️";
    const category = document.createElement("span");
    category.className = "category-pill";
    category.textContent = item.category;
    const status = document.createElement("span");
    status.className = `status-pill ${item.status === "Sold" ? "sold" : ""}`;
    status.textContent = item.status;
    art.append(category, status);

    const content = document.createElement("div");
    content.className = "listing-content";
    const top = document.createElement("div");
    top.className = "listing-top";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = money(item.price);
    top.append(title, price);

    const description = document.createElement("p");
    description.textContent = item.description;
    const meta = document.createElement("div");
    meta.className = "meta";
    const condition = document.createElement("span");
    condition.textContent = `Condition: ${item.condition}`;
    const seller = document.createElement("span");
    seller.textContent = `By ${item.seller_name}`;
    meta.append(condition, seller);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const contact = document.createElement("button");
    contact.textContent = "View contact";
    contact.addEventListener("click", () => alert(`Seller: ${item.seller_name}\nContact: ${item.contact_info}\n\nDemo only — use fictional details.`));
    const edit = document.createElement("button");
    edit.className = "edit-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => beginEdit(item));
    const sold = document.createElement("button");
    sold.className = "sold-btn";
    sold.textContent = item.status === "Sold" ? "Mark available" : "Mark sold";
    sold.addEventListener("click", () => updateStatus(item, item.status === "Sold" ? "Available" : "Sold"));
    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteListing(item.id));
    actions.append(contact, edit, sold, remove);
    content.append(top, description, meta, actions);
    card.append(art, content);
    grid.append(card);
  });
}

function getFormData() {
  return Object.fromEntries(fields.map(id => [id, document.getElementById(id).value.trim()]));
}

function resetForm() {
  form.reset();
  document.getElementById("listingId").value = "";
  document.getElementById("formHeading").textContent = "Create a listing";
  document.getElementById("submitBtn").innerHTML = 'Publish listing <span>↗</span>';
  document.getElementById("cancelEdit").hidden = true;
}

function beginEdit(item) {
  document.getElementById("listingId").value = item.id;
  fields.forEach(id => { document.getElementById(id).value = item[id]; });
  document.getElementById("formHeading").textContent = "Edit listing";
  document.getElementById("submitBtn").textContent = "Save changes";
  document.getElementById("cancelEdit").hidden = false;
  document.getElementById("sell").scrollIntoView({ behavior: "smooth" });
}

async function updateStatus(item, status) {
  try {
    await request(`${API}/${item.id}`, { method: "PUT", body: JSON.stringify({ ...item, status }) });
    showMessage(`"${item.title}" marked as ${status.toLowerCase()}.`);
    await loadListings();
  } catch (error) { showMessage(error.message, true); }
}

async function deleteListing(id) {
  const item = listings.find(listing => listing.id === id);
  if (!confirm(`Delete "${item?.title || "this listing"}"? This cannot be undone.`)) return;
  try {
    await request(`${API}/${id}`, { method: "DELETE" });
    showMessage("Listing deleted successfully.");
    await loadListings();
  } catch (error) { showMessage(error.message, true); }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const id = document.getElementById("listingId").value;
  const data = getFormData();
  data.price = Number(data.price);
  const formData = new FormData();

Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
});

const imageInput = document.getElementById("listingImage");

if (imageInput && imageInput.files.length > 0) {
    formData.append("listingImage", imageInput.files[0]);
}
  try {
    if (id) {
      await request(`${API}/${id}`, { method: "PUT", body:  formData });
      showMessage("Listing updated successfully.");
    } else {
      await request(API, { method: "POST", body: formData });
      showMessage("Your listing has been published.");
    }
    resetForm();
    await loadListings();
    document.getElementById("market").scrollIntoView({ behavior: "smooth" });
  } catch (error) { showMessage(error.message, true); }
});

document.getElementById("cancelEdit").addEventListener("click", resetForm);
document.getElementById("searchInput").addEventListener("input", () => loadListings());
document.getElementById("categoryFilter").addEventListener("change", loadListings);
document.getElementById("statusFilter").addEventListener("change", loadListings);

// Require a valid student session before showing the marketplace.
async function protectMarketplace() {
  const page = document.getElementById("marketplacePage");
  try {
    const response = await fetch("/api/me", { credentials: "same-origin" });
    if (!response.ok) {
      window.location.replace("/login");
      return;
    }
    const data = await response.json();
    document.getElementById("navStudentName").textContent = data.student.full_name;
    page.hidden = false;
    loadListings();
  } catch (error) {
    window.location.replace("/login");
  }
}

document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("Could not log out. Please try again.");
    window.location.replace("/login");
  } catch (error) {
    showMessage(error.message, true);
  }
});

protectMarketplace();
