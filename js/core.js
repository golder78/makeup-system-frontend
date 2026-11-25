const state = {
  user: null,
  page: "home",
  moneyTab: "income",
  calendarDate: new Date(),
  clients: [],
  bookings: [],
  services: [],
  inventory: [],
  income: [],
  expenses: [],
  reports: [],
  summary: null,
  summaryRange: null,
};

const pageNames = {
  home: "HOME",
  calendar: "CALENDAR",
  clients: "CLIENTS",
  stock: "STOCK",
  money: "MONEY",
  reports: "REPORTS",
  services: "SERVICES",
};

const money = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const asText = (value) => (value == null || value === "" ? "—" : esc(value));

function dateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateOnly(value) {
  const parsed = dateInputValue(value);
  if (!parsed) return "—";
  const [year, month, day] = parsed.split("-").map(Number);
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function shortDate(value) {
  const parsed = dateInputValue(value);
  if (!parsed) return "—";
  const [year, month, day] = parsed.split("-").map(Number);
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

function timeOf(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function localDateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toast(message, isError = false) {
  const item = document.createElement("div");
  item.className = `toast${isError ? " is-error" : ""}`;
  item.textContent = message;
  document.querySelector("#toast-region").append(item);
  window.setTimeout(() => item.remove(), 4200);
}

function pageHeading(eyebrow, title, description, action = "") {
  return `
    <div class="page-heading">
      <div>
        <p class="eyebrow">${eyebrow}</p>
        <h1 class="page-title">${title}</h1>
        ${description ? `<p class="page-description">${description}</p>` : ""}
      </div>
      ${action}
    </div>`;
}

function sectionRow(title, note = "", action = "") {
  return `
    <div class="section-row">
      <div><h2>${title}</h2>${note ? `<p>${note}</p>` : ""}</div>
      ${action}
    </div>`;
}

function panel(title, subtitle, content, action = "") {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ""}</div>
        ${action}
      </div>
      ${content}
    </section>`;
}

function emptyState(title, message, action = "") {
  return `<div class="empty-state"><strong>${title}</strong>${message}${action}</div>`;
}

function statusPill(status) {
  const value = String(status || "unknown").toLowerCase();
  return `<span class="pill is-${esc(value)}">${esc(value.replaceAll("_", " "))}</span>`;
}

function getClientName(id) {
  return state.clients.find((client) => client.id === id)?.name || "Client";
}

function getBookingName(booking) {
  return booking.client?.name || getClientName(booking.clientId) || "Client";
}

function within(date, start, end) {
  if (!date) return false;
  const value = new Date(date);
  return value >= start && value < end;
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}


export {
  state, pageNames, money, esc, asText, dateInputValue, dateOnly, shortDate,
  timeOf, localDateTimeValue, toast, pageHeading, sectionRow, panel,
  emptyState, statusPill, getClientName, getBookingName, within, startOfWeek,
};
