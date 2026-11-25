import { state, pageNames, money, esc, asText, dateInputValue, dateOnly, shortDate, timeOf, toast, pageHeading, sectionRow, panel, emptyState, statusPill, getClientName, getBookingName, within, startOfWeek } from "./core.js";
import { api } from "./api.js";

const pageView = document.querySelector("#page-view");

function setLoading() {
  pageView.innerHTML = '<div class="loading-state">Taking a moment to gather your studio details…</div>';
}

function showPageError(error, retry) {
  pageView.innerHTML = `
    <div class="error-panel" role="alert">
      <strong>We couldn’t load this part of your studio.</strong>
      ${esc(error.message || "Please try again.")}
      <div><button class="button button-outline button-small" id="retry-button" type="button">Try again</button></div>
    </div>`;
  pageView.querySelector("#retry-button").addEventListener("click", retry);
}

async function loadDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [bookings, clients, inventory, income, expenses] = await Promise.all([
    api("/bookings"),
    api("/clients"),
    api("/inventory"),
    api("/income"),
    api("/expenses"),
  ]);
  state.bookings = bookings;
  state.clients = clients;
  state.inventory = inventory;
  state.income = income;
  state.expenses = expenses;

  let summary = null;
  try {
    summary = await api(
      `/reports/summary?from=${dateInputValue(monthStart)}&to=${dateInputValue(monthEnd)}`,
    );
  } catch (error) {
    toast(`Dashboard totals could not be calculated: ${error.message}`, true);
  }
  state.summary = summary;
  renderDashboard(now, summary);
}

function renderDashboard(now, summary) {
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const todaysBookings = state.bookings
    .filter((booking) => within(booking.date, dayStart, dayEnd))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const weekBookings = state.bookings.filter((booking) => within(booking.date, weekStart, weekEnd));
  const lowStock = state.inventory.filter((item) => Number(item.quantity) <= 5);
  const paidIncome = state.income
    .filter((item) => item.paymentStatus !== "pending" && within(item.date, monthStart, monthEnd))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  pageView.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">${new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now)}</p>
        <h1 class="hero-title">Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"},<br /><em>${esc(state.user?.email?.split("@")[0] || "beautiful")}.</em></h1>
        <p class="hero-copy">${todaysBookings.length ? `${todaysBookings.length} booking${todaysBookings.length === 1 ? "" : "s"} today` : "A little space to plan the day ahead"}${lowStock.length ? `, ${lowStock.length} product${lowStock.length === 1 ? "" : "s"} running low` : ""}${summary ? `, and ${money(summary.totalIncome)} collected this month.` : "."}</p>
        <div class="hero-links">
          <button class="button button-primary" data-action="create-booking">Add a booking <span aria-hidden="true">↗</span></button>
          <button class="text-button" data-page-link="reports">View this month’s numbers</button>
        </div>
      </div>
    </section>
    <div class="metrics-grid">
      <article class="metric-card"><div class="metric-top"><span>Collected this month</span><span class="metric-icon">↗</span></div><p class="metric-value">${money(summary?.totalIncome ?? paidIncome)}</p><p class="metric-note">Received payments</p></article>
      <article class="metric-card"><div class="metric-top"><span>Studio expenses</span><span class="metric-icon">−</span></div><p class="metric-value">${money(summary?.totalExpenses ?? 0)}</p><p class="metric-note">This month</p></article>
      <article class="metric-card"><div class="metric-top"><span>Bookings this week</span><span class="metric-icon">▦</span></div><p class="metric-value">${weekBookings.length}</p><p class="metric-note">${todaysBookings.length} on your calendar today</p></article>
      <article class="metric-card"><div class="metric-top"><span>Your clients</span><span class="metric-icon">♡</span></div><p class="metric-value">${state.clients.length}</p><p class="metric-note">${lowStock.length} products need a little love</p></article>
    </div>
    <div class="dashboard-grid">
      ${panel("A look at today", "Your next appointments", `
        <div class="panel-body">
          ${todaysBookings.length ? todaysBookings.slice(0, 5).map((booking) => `
            <div class="appointment-row">
              <span class="time-block">${timeOf(booking.date)}</span>
              <div class="row-main"><strong>${esc(getBookingName(booking))}</strong><small>${esc(booking.location || "Studio")} · ${esc((booking.services || []).map((item) => item.service?.name).filter(Boolean).join(", ") || "Beauty appointment")}</small></div>
              <span class="row-price">${booking.totalPrice == null ? "" : money(booking.totalPrice)}</span>
            </div>`).join("") : emptyState("Room to breathe.", "Your calendar is clear for today.", '<button class="button button-outline button-small" data-action="create-booking">Add a booking</button>')}
        </div>`, '<button class="text-button" data-page-link="calendar">Full calendar ↗</button>')}
      ${panel("A little restock?", "Products with five or fewer left", `
        <div class="panel-body">
          ${lowStock.length ? lowStock.slice(0, 5).map((item) => `
            <div class="list-row"><span class="stock-mark ${Number(item.quantity) <= 2 ? "is-low" : ""}"></span><div class="row-main"><strong>${esc(item.name || "Untitled product")}</strong><small>${esc(item.brand || item.category || "Studio stock")}</small></div><span class="row-price">${Number(item.quantity) || 0} left</span></div>`).join("") : emptyState("All stocked up.", "Low-stock products will appear here.")}
        </div>`, '<button class="text-button" data-page-link="stock">View stock ↗</button>')}
    </div>
    ${sectionRow("A note from your studio", "Your business, gently in view")}
    <div class="dashboard-grid">
      ${panel("The people behind the glow", "Your most recent clients", `
        <div class="panel-body">${state.clients.slice(0, 4).map((client) => `
          <div class="list-row"><span class="avatar">${esc((client.name || "C")[0].toUpperCase())}</span><div class="row-main"><strong>${esc(client.name || "Unnamed client")}</strong><small>${esc(client.contact || client.skinType || "Client profile")}</small></div></div>
        `).join("") || emptyState("Your client book starts here.", "Add a client after your next consultation.", '<button class="button button-outline button-small" data-action="create-client">Add your first client</button>')}</div>
      `, '<button class="text-button" data-page-link="clients">All clients ↗</button>')}
      ${panel("A little money in", "Latest income received", `
        <div class="panel-body">${state.income.slice(0, 4).map((record) => `
          <div class="list-row"><div class="row-main"><strong>${esc(record.description || record.source?.replaceAll("_", " ") || "Studio income")}</strong><small>${shortDate(record.date)} · ${esc(record.client?.name || record.paymentMethod || "Income")}</small></div><span class="row-price">${money(record.amount)}</span></div>
        `).join("") || emptyState("Your first sale is waiting.", "Income entries will show here when recorded.", '<button class="button button-outline button-small" data-action="create-income">Record income</button>')}</div>
      `, '<button class="text-button" data-page-link="money">Money overview ↗</button>')}
    </div>`;
}

async function loadCalendar() {
  const [bookings, clients, services] = await Promise.all([
    api("/bookings"),
    api("/clients"),
    api("/services?active=true"),
  ]);
  state.bookings = bookings;
  state.clients = clients;
  state.services = services;
  renderCalendar();
}

export function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const monthName = new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(firstDay);
  const today = new Date();
  const calendarDays = days.map((date) => {
    const events = state.bookings
      .filter((booking) => {
        if (!booking.date) return false;
        const eventDate = new Date(booking.date);
        return eventDate.getFullYear() === date.getFullYear() && eventDate.getMonth() === date.getMonth() && eventDate.getDate() === date.getDate();
      })
      .slice(0, 2);
    const classes = [
      "calendar-day",
      date.getMonth() !== month ? "is-outside" : "",
      date.toDateString() === today.toDateString() ? "is-today" : "",
    ].filter(Boolean).join(" ");
    return `<div class="${classes}">
      <span class="calendar-number">${date.getDate()}</span>
      ${events.map((booking) => `<div class="calendar-event" title="${esc(getBookingName(booking))} · ${esc(booking.location || "Studio")}">${timeOf(booking.date)} ${esc(getBookingName(booking))}</div>`).join("")}
    </div>`;
  }).join("");
  const upcoming = [...state.bookings]
    .filter((booking) => booking.date && new Date(booking.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  pageView.innerHTML = `
    ${pageHeading("A LITTLE SPACE, JUST FOR YOU", "Your calendar.", "Keep every appointment and every client moment in one thoughtful place.", '<button class="button button-primary" data-action="create-booking">Add a booking <span aria-hidden="true">↗</span></button>')}
    ${panel("The month ahead", "Your appointments, at a glance", `
      <div class="panel-body">
        <div class="calendar-controls">
          <div class="calendar-toolbar">
            <button class="icon-button" data-calendar-step="-1" aria-label="Previous month">‹</button>
            <strong class="calendar-month">${monthName}</strong>
            <button class="icon-button" data-calendar-step="1" aria-label="Next month">›</button>
          </div>
          <button class="text-button" data-calendar-today>Today</button>
        </div>
        <div class="calendar-wrap"><div class="calendar-grid">
          ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
          ${calendarDays}
        </div></div>
      </div>
    `)}
    ${sectionRow("Coming up", "The next few moments in your studio")}
    ${panel("Upcoming appointments", "A little preparation goes a long way", `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Date & time</th><th>Client</th><th>Location</th><th>Services</th><th>Status</th><th></th></tr></thead>
        <tbody>${upcoming.map((booking) => `
          <tr>
            <td><strong>${dateOnly(booking.date)}</strong><br />${timeOf(booking.date)}</td>
            <td><strong>${esc(getBookingName(booking))}</strong></td>
            <td>${asText(booking.location)}</td>
            <td>${esc((booking.services || []).map((item) => item.service?.name).filter(Boolean).join(", ") || "Beauty appointment")}</td>
            <td>${statusPill(booking.status)}</td>
            <td><div class="table-actions"><button class="table-action" data-edit="booking" data-id="${booking.id}">Edit</button><button class="table-action" data-delete="booking" data-id="${booking.id}">Remove</button></div></td>
          </tr>`).join("") || '<tr><td class="table-empty" colspan="6">Nothing on the calendar just yet. Add a booking when you’re ready.</td></tr>'}</tbody>
      </table></div>`)}
  `;
}

async function loadClients() {
  const [clients, bookings] = await Promise.all([api("/clients"), api("/bookings")]);
  state.clients = clients;
  state.bookings = bookings;
  renderClients();
}

function renderClients(search = "") {
  const rows = state.clients.filter((client) =>
    [client.name, client.contact, client.skinType].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase()),
    ),
  );
  pageView.innerHTML = `
    ${pageHeading("THE PEOPLE WHO MAKE IT BEAUTIFUL", "Your clients.", "Remember the little things. Keep every client detail close and considered.", '<button class="button button-primary" data-action="create-client">Add a client <span aria-hidden="true">↗</span></button>')}
    <div class="filter-bar"><input class="field-control search-control" id="client-search" type="search" placeholder="Find someone by name or contact…" value="${esc(search)}" aria-label="Search clients" /><span class="metric-note">${rows.length} ${rows.length === 1 ? "client" : "clients"}</span></div>
    ${panel("Your client book", "A lovely place to remember everyone", `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Client</th><th>Contact</th><th>Skin type</th><th>Bookings</th><th></th></tr></thead>
        <tbody>${rows.map((client) => `
          <tr>
            <td><strong>${esc(client.name || "Unnamed client")}</strong></td>
            <td>${asText(client.contact)}</td>
            <td>${asText(client.skinType)}</td>
            <td>${state.bookings.filter((booking) => booking.clientId === client.id).length}</td>
            <td><div class="table-actions"><button class="table-action" data-edit="client" data-id="${client.id}">Edit</button><button class="table-action" data-delete="client" data-id="${client.id}">Remove</button></div></td>
          </tr>`).join("") || `<tr><td class="table-empty" colspan="5">${search ? "No clients match that search." : "Your client book is ready for its first name."}</td></tr>`}</tbody>
      </table></div>`)}
  `;
  pageView.querySelector("#client-search").addEventListener("input", (event) => renderClients(event.target.value));
}

async function loadStock() {
  state.inventory = await api("/inventory");
  renderStock();
}

function renderStock(search = "") {
  const rows = state.inventory.filter((item) =>
    [item.name, item.brand, item.category].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase()),
    ),
  );
  pageView.innerHTML = `
    ${pageHeading("THE LITTLE THINGS THAT MAKE THE MAGIC", "Your stock.", "Keep an eye on the products that keep your studio glowing.", '<button class="button button-primary" data-action="create-stock">Add a product <span aria-hidden="true">↗</span></button>')}
    <div class="filter-bar"><input class="field-control search-control" id="stock-search" type="search" placeholder="Search products…" value="${esc(search)}" aria-label="Search stock" /><span class="metric-note">${rows.length} ${rows.length === 1 ? "product" : "products"} · ${state.inventory.filter((item) => Number(item.quantity) <= 5).length} running low</span></div>
    ${panel("Studio shelf", "Everything you use, all in one place", `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Quantity</th><th>Expires</th><th></th></tr></thead>
        <tbody>${rows.map((item) => `
          <tr>
            <td><strong>${esc(item.name || "Untitled product")}</strong></td>
            <td>${asText(item.brand)}</td>
            <td>${asText(item.category)}</td>
            <td>${Number(item.quantity) <= 5 ? '<span class="pill is-pending">' : '<span class="pill is-active">'}${Number(item.quantity) || 0} left</span></td>
            <td>${dateOnly(item.expiryDate)}</td>
            <td><div class="table-actions"><button class="table-action" data-edit="stock" data-id="${item.id}">Edit</button><button class="table-action" data-delete="stock" data-id="${item.id}">Remove</button></div></td>
          </tr>`).join("") || `<tr><td class="table-empty" colspan="6">${search ? "No products match that search." : "Your studio shelf is waiting for its first product."}</td></tr>`}</tbody>
      </table></div>`)}
  `;
  pageView.querySelector("#stock-search").addEventListener("input", (event) => renderStock(event.target.value));
}

async function loadMoney() {
  const [income, expenses, clients, bookings, inventory] = await Promise.all([
    api("/income"),
    api("/expenses"),
    api("/clients"),
    api("/bookings"),
    api("/inventory"),
  ]);
  state.income = income;
  state.expenses = expenses;
  state.clients = clients;
  state.bookings = bookings;
  state.inventory = inventory;
  renderMoney();
}

export function renderMoney() {
  const isIncome = state.moneyTab === "income";
  const records = isIncome ? state.income : state.expenses;
  const total = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const incomeTotal = state.income.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const expenseTotal = state.expenses.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const button = `<button class="button button-primary" data-action="create-${isIncome ? "income" : "expense"}">Add ${isIncome ? "income" : "expense"} <span aria-hidden="true">↗</span></button>`;
  pageView.innerHTML = `
    ${pageHeading("THE BUSINESS SIDE, MADE A LITTLE EASIER", "Your money.", "A clear, kind view of what comes in and what keeps your studio going.", button)}
    <div class="summary-cards">
      <article class="summary-card"><span>Income recorded</span><strong>${money(incomeTotal)}</strong></article>
      <article class="summary-card"><span>Expenses recorded</span><strong>${money(expenseTotal)}</strong></article>
      <article class="summary-card ${incomeTotal >= expenseTotal ? "is-profit" : "is-loss"}"><span>Balance so far</span><strong>${money(incomeTotal - expenseTotal)}</strong></article>
      <article class="summary-card"><span>Recorded ${isIncome ? "income" : "expenses"}</span><strong>${records.length}</strong></article>
    </div>
    <div class="tabs" role="tablist" aria-label="Money records">
      <button class="tab-button ${isIncome ? "is-active" : ""}" data-money-tab="income" role="tab" aria-selected="${isIncome}">Income (${state.income.length})</button>
      <button class="tab-button ${!isIncome ? "is-active" : ""}" data-money-tab="expenses" role="tab" aria-selected="${!isIncome}">Expenses (${state.expenses.length})</button>
    </div>
    <div class="filter-bar filter-summary"><span class="metric-note">${records.length} ${isIncome ? "income entries" : "expenses"} · ${money(total)} total recorded</span></div>
    ${isIncome ? renderIncomeTable(records) : renderExpensesTable(records)}
  `;
}

function renderIncomeTable(records) {
  return panel("Money coming in", "Keep each little win in view", `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Date</th><th>Details</th><th>Client</th><th>Method</th><th>Status</th><th>Amount</th><th></th></tr></thead>
      <tbody>${records.map((record) => `
        <tr>
          <td>${dateOnly(record.date)}</td>
          <td><strong>${esc(record.description || record.source?.replaceAll("_", " ") || "Income")}</strong></td>
          <td>${asText(record.client?.name || (record.clientId ? getClientName(record.clientId) : ""))}</td>
          <td>${asText(record.paymentMethod)}</td>
          <td>${statusPill(record.paymentStatus || "paid")}</td>
          <td><strong>${money(record.amount)}</strong></td>
          <td><div class="table-actions"><button class="table-action" data-edit="income" data-id="${record.id}">Edit</button><button class="table-action" data-delete="income" data-id="${record.id}">Remove</button></div></td>
        </tr>`).join("") || '<tr><td class="table-empty" colspan="7">No income recorded yet. Every little win counts.</td></tr>'}</tbody>
    </table></div>`);
}

function renderExpensesTable(records) {
  return panel("Money going out", "Your studio is worth taking care of", `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Supplier</th><th>Method</th><th>Amount</th><th></th></tr></thead>
      <tbody>${records.map((record) => `
        <tr>
          <td>${dateOnly(record.date)}</td>
          <td>${statusPill(record.category || "other")}</td>
          <td><strong>${esc(record.description || "Studio expense")}</strong></td>
          <td>${asText(record.supplier)}</td>
          <td>${asText(record.paymentMethod)}</td>
          <td><strong>${money(record.amount)}</strong></td>
          <td><div class="table-actions"><button class="table-action" data-edit="expense" data-id="${record.id}">Edit</button><button class="table-action" data-delete="expense" data-id="${record.id}">Remove</button></div></td>
        </tr>`).join("") || '<tr><td class="table-empty" colspan="7">No expenses recorded. We’ll keep this space ready.</td></tr>'}</tbody>
    </table></div>`);
}

async function loadReports() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const from = dateInputValue(start);
  const to = dateInputValue(end);
  const [summary, reports] = await Promise.all([
    api(`/reports/summary?from=${from}&to=${to}`),
    api("/reports"),
  ]);
  state.summary = summary;
  state.summaryRange = { from, to };
  state.reports = reports;
  renderReports();
}

function breakdown(rows, key) {
  if (!rows.length) return emptyState("Nothing to compare just yet.", "This breakdown will fill in as your records grow.");
  const max = Math.max(...rows.map((row) => Number(row.total) || 0), 1);
  return `<div class="chart-list">${rows.map((row) => {
    const percent = Math.max(3, Math.round((Number(row.total) / max) * 100));
    return `<div class="chart-row"><span>${esc(row[key] || "Unspecified")}</span><progress class="chart-progress" max="100" value="${percent}" aria-label="${esc(row[key] || "Unspecified")} ${money(row.total)}"></progress><strong>${money(row.total)}</strong></div>`;
  }).join("")}</div>`;
}

function renderReports() {
  const summary = state.summary;
  pageView.innerHTML = `
    ${pageHeading("A CLEAR LOOK AT YOUR HARD WORK", "Your reports.", "Take a breath and see how your studio is doing, one thoughtful period at a time.", '<div class="report-export-actions"><button class="button button-outline" data-action="export-report-pdf">Download PDF</button><button class="button button-outline" data-action="export-report-excel">Download Excel</button><button class="button button-primary" data-action="save-report">Save this report <span aria-hidden="true">↗</span></button></div>')}
    <div class="filter-bar filter-summary">
      <label class="eyebrow" for="report-from">FROM</label><input class="field-control" id="report-from" type="date" value="${esc(state.summaryRange.from)}" />
      <label class="eyebrow" for="report-to">TO</label><input class="field-control" id="report-to" type="date" value="${esc(state.summaryRange.to)}" />
      <button class="button button-outline button-small" id="update-report">Update view</button>
    </div>
    <div class="summary-cards">
      <article class="summary-card"><span>Total income</span><strong>${money(summary.totalIncome)}</strong></article>
      <article class="summary-card"><span>Total expenses</span><strong>${money(summary.totalExpenses)}</strong></article>
      <article class="summary-card ${summary.netProfit >= 0 ? "is-profit" : "is-loss"}"><span>Net ${summary.netProfit >= 0 ? "profit" : "loss"}</span><strong>${money(summary.netProfit)}</strong></article>
      <article class="summary-card"><span>Completed bookings</span><strong>${summary.totalBookings}</strong></article>
    </div>
    <div class="dashboard-grid">
      ${panel("Income by payment method", "Collected, by the way it arrived", breakdown(summary.incomeByPaymentMethod || [], "paymentMethod"))}
      ${panel("Expenses by category", "The ways you care for your studio", breakdown(summary.expensesByCategory || [], "category"))}
    </div>
    ${sectionRow("Saved snapshots", "A record of the moments you chose to keep")}
    ${panel("Report history", "Saved totals won’t change when your records do", `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Period</th><th>Dates covered</th><th>Income</th><th>Expenses</th><th>Net profit</th><th>Bookings</th><th></th></tr></thead>
        <tbody>${state.reports.map((report) => `
          <tr><td><strong>${esc(report.reportType)}</strong></td><td>${dateOnly(report.periodStart)} – ${dateOnly(report.periodEnd)}</td><td>${money(report.totalIncome)}</td><td>${money(report.totalExpenses)}</td><td>${money(report.netProfit)}</td><td>${report.totalBookings}</td><td><div class="table-actions"><button class="table-action" data-delete="report" data-id="${report.id}">Remove</button></div></td></tr>
        `).join("") || '<tr><td class="table-empty" colspan="7">No saved reports yet. Save a snapshot whenever you’d like to remember this view.</td></tr>'}</tbody>
      </table></div>`)}
  `;
  pageView.querySelector("#update-report").addEventListener("click", updateReportRange);
}

async function updateReportRange() {
  const from = pageView.querySelector("#report-from").value;
  const to = pageView.querySelector("#report-to").value;
  if (!from || !to || from > to) {
    toast("Choose a valid date range before updating.", true);
    return;
  }
  try {
    const [summary, reports] = await Promise.all([
      api(`/reports/summary?from=${from}&to=${to}`),
      api("/reports"),
    ]);
    state.summary = summary;
    state.summaryRange = { from, to };
    state.reports = reports;
    renderReports();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadServices() {
  state.services = await api("/services");
  renderServices();
}

function renderServices() {
  pageView.innerHTML = `
    ${pageHeading("THE ART OF WHAT YOU DO", "Your services.", "Keep your offerings and pricing just as considered as the experience itself.", '<button class="button button-primary" data-action="create-service">Add a service <span aria-hidden="true">↗</span></button>')}
    ${panel("Your menu", "Services offered by your studio", `
      <div>${state.services.map((service) => `
        <article class="service-card">
          <div><h3>${esc(service.name)}</h3><p>${esc(service.category)} · ${Number(service.durationMinutes)} min${service.description ? ` · ${esc(service.description)}` : ""}</p></div>
          <div class="service-detail"><span class="service-price">${money(service.price)}</span>${statusPill(service.isActive ? "active" : "inactive")}<div class="table-actions"><button class="table-action" data-edit="service" data-id="${service.id}">Edit</button><button class="table-action" data-toggle-service="${service.id}" data-active="${service.isActive}">${service.isActive ? "Pause" : "Activate"}</button><button class="table-action" data-delete="service" data-id="${service.id}">Remove</button></div></div>
        </article>`).join("") || emptyState("A menu made by you.", "Add your first service to make it easy to book.")}</div>`)}
  `;
}

const loaders = {
  home: loadDashboard,
  calendar: loadCalendar,
  clients: loadClients,
  stock: loadStock,
  money: loadMoney,
  reports: loadReports,
  services: loadServices,
};

export async function navigate(page) {
  if (!loaders[page]) return;
  state.page = page;
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector("#section-name").textContent = pageNames[page];
  document.querySelector(".sidebar").classList.remove("is-open");
  setLoading();
  try {
    await loaders[page]();
  } catch (error) {
    showPageError(error, () => navigate(page));
  }
}
