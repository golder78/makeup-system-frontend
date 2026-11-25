import * as XLSX from "@e965/xlsx";

const reportFilename = (range) =>
  `fanaka-report-${range.from}-to-${range.to}`;

export function downloadReportExcel(summary, range) {
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Fanaka Beauty - Studio Report"],
    ["Reporting period", range.from, "to", range.to],
    ["Generated", new Date().toISOString()],
    [],
    ["Metric", "Value (KES)"],
    ["Total income", Number(summary.totalIncome || 0)],
    ["Total expenses", Number(summary.totalExpenses || 0)],
    [summary.netProfit >= 0 ? "Net profit" : "Net loss", Number(summary.netProfit || 0)],
    ["Completed bookings", Number(summary.totalBookings || 0)],
  ]);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 8 }, { wch: 14 }];

  const incomeSheet = XLSX.utils.aoa_to_sheet([
    ["Payment method", "Amount (KES)"],
    ...(summary.incomeByPaymentMethod || []).map((row) => [
      row.paymentMethod || "Unspecified",
      Number(row.total || 0),
    ]),
  ]);
  incomeSheet["!cols"] = [{ wch: 25 }, { wch: 20 }];

  const expensesSheet = XLSX.utils.aoa_to_sheet([
    ["Category", "Amount (KES)"],
    ...(summary.expensesByCategory || []).map((row) => [
      row.category || "Unspecified",
      Number(row.total || 0),
    ]),
  ]);
  expensesSheet["!cols"] = [{ wch: 25 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income by method");
  XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses by category");
  XLSX.writeFile(workbook, `${reportFilename(range)}.xlsx`);
}
