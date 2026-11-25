import { state, toast } from "./core.js";
import { api } from "./api.js";
import { navigate, renderCalendar, renderMoney } from "./pages.js";
import { openRecordForm, submitRecord } from "./forms.js";

const dialog = document.querySelector("#record-dialog");
const dialogForm = document.querySelector("#record-form");

function recordByType(type, id) {
  const source = {
    client: state.clients,
    stock: state.inventory,
    booking: state.bookings,
    income: state.income,
    expense: state.expenses,
    service: state.services,
  }[type];
  return source?.find((item) => item.id === Number(id));
}

async function deleteRecord(type, id) {
  const endpoints = {
    client: "/clients",
    stock: "/inventory",
    booking: "/bookings",
    income: "/income",
    expense: "/expenses",
    service: "/services",
    report: "/reports",
  };
  const labels = {
    client: "this client",
    stock: "this product",
    booking: "this booking",
    income: "this income entry",
    expense: "this expense",
    service: "this service",
    report: "this saved report",
  };
  if (!window.confirm(`Remove ${labels[type]}? This can’t be undone.`)) return;
  try {
    await api(`${endpoints[type]}/${id}`, { method: "DELETE" });
    toast(`${type === "stock" ? "Product" : type[0].toUpperCase() + type.slice(1)} removed.`);
    await navigate(state.page);
  } catch (error) {
    toast(error.message, true);
  }
}

async function changeServiceAvailability(button) {
  const id = button.dataset.toggleService;
  const service = recordByType("service", id);
  if (!service) return;
  try {
    await api(`/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: button.dataset.active !== "true" }),
    });
    toast(`Service ${button.dataset.active === "true" ? "paused" : "activated"}.`);
    await navigate(state.page);
  } catch (error) {
    toast(error.message, true);
  }
}

async function saveReport() {
  const { from, to } = state.summaryRange;
  const reportType = from.slice(0, 7) === to.slice(0, 7) ? "monthly" : "custom";
  try {
    await api("/reports", {
      method: "POST",
      body: JSON.stringify({ reportType, periodStart: from, periodEnd: to, generatedBy: state.user?.email || null }),
    });
    toast("Your report snapshot has been saved.");
    await navigate("reports");
  } catch (error) {
    toast(error.message, true);
  }
}

async function exportReport(format) {
  try {
    if (format === "pdf") {
      const { downloadReportPdf } = await import("./report-pdf.js");
      downloadReportPdf(state.summary, state.summaryRange);
    } else if (format === "excel") {
      const { downloadReportExcel } = await import("./report-excel.js");
      downloadReportExcel(state.summary, state.summaryRange);
    } else {
      throw new Error("Unsupported report format.");
    }
    toast(`Report downloaded as ${format.toUpperCase()}.`);
  } catch (error) {
    toast(`Report export failed: ${error.message}`, true);
  }
}

document.addEventListener("click", async (event) => {
  const pageLink = event.target.closest("[data-page], [data-page-link]");
  if (pageLink) {
    event.preventDefault();
    await navigate(pageLink.dataset.page || pageLink.dataset.pageLink);
    return;
  }
  const action = event.target.closest("[data-action]");
  if (action) {
    const actionName = action.dataset.action;
    if (actionName === "save-report") await saveReport();
    else if (actionName === "export-report-pdf") await exportReport("pdf");
    else if (actionName === "export-report-excel") await exportReport("excel");
    else openRecordForm(actionName.replace("create-", ""));
    return;
  }
  const edit = event.target.closest("[data-edit]");
  if (edit) {
    openRecordForm(edit.dataset.edit, recordByType(edit.dataset.edit, edit.dataset.id));
    return;
  }
  const remove = event.target.closest("[data-delete]");
  if (remove) {
    await deleteRecord(remove.dataset.delete, remove.dataset.id);
    return;
  }
  const tab = event.target.closest("[data-money-tab]");
  if (tab) {
    state.moneyTab = tab.dataset.moneyTab === "expenses" ? "expenses" : "income";
    renderMoney();
    return;
  }
  const monthStep = event.target.closest("[data-calendar-step]");
  if (monthStep) {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + Number(monthStep.dataset.calendarStep));
    renderCalendar();
    return;
  }
  if (event.target.closest("[data-calendar-today]")) {
    state.calendarDate = new Date();
    renderCalendar();
    return;
  }
  const toggle = event.target.closest("[data-toggle-service]");
  if (toggle) await changeServiceAvailability(toggle);
});

document.querySelectorAll(".close-dialog").forEach((button) => {
  button.addEventListener("click", () => dialog.close());
});
dialogForm.addEventListener("submit", submitRecord);
