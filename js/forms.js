import { state, money, esc, dateInputValue, dateOnly, localDateTimeValue, toast, getBookingName } from "./core.js";
import { api } from "./api.js";
import { navigate } from "./pages.js";

const dialog = document.querySelector("#record-dialog");
const dialogForm = document.querySelector("#record-form");
const dialogFields = document.querySelector("#dialog-fields");
const dialogError = document.querySelector("#dialog-error");

const field = (label, name, value = "", type = "text", required = false, extra = "") => `
  <label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} ${extra} /></label>`;

const selectField = (label, name, options, value = "", required = false) => `
  <label>${label}<select name="${name}" ${required ? "required" : ""}>
    ${options.map(([optionValue, optionLabel]) => `<option value="${esc(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${esc(optionLabel)}</option>`).join("")}
  </select></label>`;

const textareaField = (label, name, value = "") => `
  <label>${label}<textarea name="${name}">${esc(value)}</textarea></label>`;

function clientForm(client = {}) {
  return `${field("Client name", "name", client.name || "", "text", true)}
    <div class="field-pair">${field("Phone or email", "contact", client.contact || "")}${field("Skin type", "skinType", client.skinType || "")}</div>`;
}

function stockForm(item = {}) {
  return `${field("Product name", "name", item.name || "", "text", true)}
    <div class="field-pair">${field("Brand", "brand", item.brand || "")}${field("Quantity", "quantity", item.quantity ?? 0, "number", true, 'min="0" step="any"')}</div>
    <div class="field-pair">${field("Category", "category", item.category || "")}${field("Expiry date", "expiryDate", dateInputValue(item.expiryDate), "date")}</div>`;
}

function bookingForm(booking = {}) {
  const clients = state.clients.map((client) => [client.id, client.name || `Client ${client.id}`]);
  const clientOptions = [["", "Choose a client"], ...clients];
  const activeServices = state.services.filter((service) => service.isActive);
  const selectedIds = new Set((booking.services || []).map((item) => item.serviceId));
  const serviceChooser = booking.id ? "" : activeServices.length ? `
    <fieldset class="service-chooser">
      <legend class="eyebrow">SELECT SERVICES (REQUIRED)</legend>
      <div class="form-stack">${activeServices.map((service) => `
        <label class="checkbox-option"><input name="services" type="checkbox" value="${service.id}" ${selectedIds.has(service.id) ? "checked" : ""} /><span>${esc(service.name)} · ${money(service.price)}</span></label>
      `).join("")}</div>
    </fieldset>` : `
      <div class="form-hint"><p>Add and activate a service before creating a booking.</p><button class="button button-outline button-small" type="button" data-page="services">Go to services</button></div>`;
  return `${selectField("Client", "clientId", clientOptions, booking.clientId || booking.client?.id || "", true)}
    ${field("Location", "location", booking.location || "Studio", "text", true)}
    ${field("Date and time", "date", localDateTimeValue(booking.date || new Date()), "datetime-local", true)}
    <div class="field-pair">${field("Deposit", "deposit", booking.deposit ?? 0, "number", false, 'min="0" step="0.01"')}${selectField("Status", "status", [["pending", "Pending"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"]], booking.status || "pending", true)}</div>
    ${textareaField("Notes", "notes", booking.notes || "")}${serviceChooser}
    ${!clients.length ? '<div class="form-hint"><p>Add a client before creating a booking.</p><button class="button button-outline button-small" type="button" data-page="clients">Go to clients</button></div>' : ""}`;
}

function incomeForm(record = {}) {
  const clients = [["", "No client"], ...state.clients.map((client) => [client.id, client.name || `Client ${client.id}`])];
  const bookings = [["", "No booking"], ...state.bookings.map((booking) => [
    booking.id,
    `${dateOnly(booking.date)} · ${getBookingName(booking)}`,
  ])];
  return `${selectField("Income source", "source", [["booking", "Booking"], ["product_sale", "Product sale"], ["tip", "Tip"], ["other", "Other"]], record.source || "booking", true)}
    ${field("Description", "description", record.description || "")}
    <div class="field-pair">${field("Amount (KES)", "amount", record.amount ?? "", "number", true, 'min="0" step="0.01"')}${field("Date", "date", dateInputValue(record.date || new Date()), "date", true)}</div>
    <div class="field-pair">${selectField("Booking", "bookingId", bookings, record.bookingId || "", false)}${selectField("Client", "clientId", clients, record.clientId || "", false)}</div>
    ${selectField("Payment method", "paymentMethod", [["", "Not specified"], ["cash", "Cash"], ["mpesa", "M-Pesa"], ["card", "Card"], ["bank", "Bank"]], record.paymentMethod || "", false)}
    ${selectField("Payment status", "paymentStatus", [["paid", "Paid"], ["partial", "Partial"], ["pending", "Pending"]], record.paymentStatus || "paid", true)}`;
}

function expenseForm(expense = {}) {
  const inventory = [["", "No product"], ...state.inventory.map((item) => [item.id, item.name || `Product ${item.id}`])];
  return `${selectField("Category", "category", [["products", "Products"], ["rent", "Rent"], ["transport", "Transport"], ["salaries", "Salaries"], ["marketing", "Marketing"], ["utilities", "Utilities"]], expense.category || "products", true)}
    ${field("Description", "description", expense.description || "")}
    <div class="field-pair">${field("Amount (KES)", "amount", expense.amount ?? "", "number", true, 'min="0" step="0.01"')}${field("Date", "date", dateInputValue(expense.date || new Date()), "date", true)}</div>
    <div class="field-pair">${field("Supplier", "supplier", expense.supplier || "")}${selectField("Payment method", "paymentMethod", [["", "Not specified"], ["cash", "Cash"], ["mpesa", "M-Pesa"], ["card", "Card"], ["bank", "Bank"]], expense.paymentMethod || "", false)}</div>
    ${selectField("Related product", "inventoryId", inventory, expense.inventoryId || "", false)}
    ${field("Receipt number", "receiptNo", expense.receiptNo || "")}`;
}

function serviceForm(service = {}) {
  return `${field("Service name", "name", service.name || "", "text", true)}
    <div class="field-pair">${field("Category", "category", service.category || "", "text", true)}${field("Price (KES)", "price", service.price ?? "", "number", true, 'min="0" step="0.01"')}</div>
    <div class="field-pair">${field("Duration (minutes)", "durationMinutes", service.durationMinutes ?? 60, "number", true, 'min="1" step="1"')}${selectField("Availability", "isActive", [["true", "Available"], ["false", "Paused"]], String(service.isActive ?? true), true)}</div>
    ${textareaField("Description", "description", service.description || "")}`;
}

const formConfig = {
  client: { title: "Add a client", eyebrow: "A NEW FACE IN YOUR STUDIO", endpoint: "/clients", form: clientForm },
  stock: { title: "Add a product", eyebrow: "A LITTLE MORE ON THE SHELF", endpoint: "/inventory", form: stockForm },
  booking: { title: "Add a booking", eyebrow: "MAKE A MOMENT FOR BEAUTY", endpoint: "/bookings", form: bookingForm },
  income: { title: "Record income", eyebrow: "A LITTLE WIN FOR YOUR STUDIO", endpoint: "/income", form: incomeForm },
  expense: { title: "Record an expense", eyebrow: "CARE FOR YOUR STUDIO", endpoint: "/expenses", form: expenseForm },
  service: { title: "Add a service", eyebrow: "A BEAUTIFUL OFFERING", endpoint: "/services", form: serviceForm },
};

export function openRecordForm(type, record = null) {
  const config = formConfig[type];
  if (!config) return;
  const isEdit = Boolean(record?.id);
  document.querySelector("#dialog-title").textContent = isEdit
    ? `Edit ${type === "stock" ? "product" : type}`
    : config.title;
  document.querySelector("#dialog-eyebrow").textContent = config.eyebrow;
  dialogError.textContent = "";
  dialogFields.innerHTML = config.form(record || {});
  dialogForm.dataset.type = type;
  dialogForm.dataset.id = record?.id || "";
  dialog.showModal();
  dialogFields.querySelector("input, select, textarea")?.focus({ preventScroll: true });
}

export async function openBookingForm() {
  try {
    const [clients, services] = await Promise.all([
      api("/clients"),
      api("/services"),
    ]);
    state.clients = clients;
    state.services = services;
    openRecordForm("booking");
  } catch (error) {
    toast(`Could not load booking options: ${error.message}`, true);
  }
}

function formDataFor(type, form) {
  const data = new FormData(form);
  const value = (name) => String(data.get(name) || "").trim();
  const optional = (name) => value(name) || null;
  const numeric = (name) => Number(value(name));

  if (type === "client") {
    return { name: value("name"), contact: optional("contact"), skinType: optional("skinType") };
  }
  if (type === "stock") {
    return { name: value("name"), brand: optional("brand"), quantity: numeric("quantity"), category: optional("category"), expiryDate: optional("expiryDate") };
  }
  if (type === "booking") {
    const booking = {
      clientId: numeric("clientId"),
      location: value("location"),
      date: new Date(value("date")).toISOString(),
      deposit: numeric("deposit"),
      status: value("status"),
      notes: optional("notes"),
    };
    if (!dialogForm.dataset.id) {
      booking.services = data.getAll("services").map((serviceId) => ({ serviceId: Number(serviceId), quantity: 1 }));
    }
    return booking;
  }
  if (type === "income") {
    return {
      source: value("source"),
      description: optional("description"),
      amount: numeric("amount"),
      date: value("date") || null,
      bookingId: value("bookingId") ? numeric("bookingId") : null,
      clientId: value("clientId") ? numeric("clientId") : null,
      paymentMethod: optional("paymentMethod"),
      paymentStatus: value("paymentStatus"),
    };
  }
  if (type === "expense") {
    return {
      category: value("category"),
      description: optional("description"),
      amount: numeric("amount"),
      date: value("date") || null,
      inventoryId: value("inventoryId") ? numeric("inventoryId") : null,
      supplier: optional("supplier"),
      paymentMethod: optional("paymentMethod"),
      receiptNo: optional("receiptNo"),
    };
  }
  if (type === "service") {
    return {
      name: value("name"),
      category: value("category"),
      price: numeric("price"),
      durationMinutes: numeric("durationMinutes"),
      isActive: value("isActive") === "true",
      description: optional("description"),
    };
  }
  return {};
}

export async function submitRecord(event) {
  event.preventDefault();
  const type = dialogForm.dataset.type;
  const config = formConfig[type];
  const id = dialogForm.dataset.id;
  const saveButton = dialogForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  dialogError.textContent = "";
  try {
    const payload = formDataFor(type, dialogForm);
    if (type === "booking" && !id && payload.services.length === 0) {
      const serviceCheckbox = dialogFields.querySelector('[name="services"]');
      dialogError.textContent = serviceCheckbox
        ? "Select at least one service before saving this booking."
        : "Add and activate a service before saving this booking.";
      serviceCheckbox?.focus();
      return;
    }
    await api(`${config.endpoint}${id ? `/${id}` : ""}`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    dialog.close();
    toast(`${type === "stock" ? "Product" : type[0].toUpperCase() + type.slice(1)} ${id ? "updated" : "added"} with care.`);
    await navigate(state.page);
  } catch (error) {
    dialogError.textContent = error.message || "We couldn’t save that just yet.";
  } finally {
    saveButton.disabled = false;
  }
}
