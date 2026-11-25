import { jsPDF } from "jspdf";

const currency = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const displayDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const reportFilename = (range) =>
  `fanaka-report-${range.from}-to-${range.to}`;

function drawTable(doc, title, headers, rows, widths) {
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - margin * 2;
  let y = doc.lastAutoTableY || 0;
  if (!y) y = 24;
  y += 8;

  if (y > pageHeight - 32) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(120, 49, 38);
  doc.text(title, margin, y);
  y += 7;

  const drawRow = (values, isHeader = false) => {
    const cellLines = values.map((value, index) =>
      doc.splitTextToSize(String(value), tableWidth * widths[index] - 8),
    );
    const rowHeight = Math.max(...cellLines.map((lines) => lines.length)) * 5 + 5;

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = 20;
    }

    if (isHeader) {
      doc.setFillColor(243, 240, 233);
      doc.rect(margin, y - 4, tableWidth, rowHeight, "F");
    } else {
      doc.setDrawColor(232, 226, 217);
      doc.line(margin, y + rowHeight - 2, pageWidth - margin, y + rowHeight - 2);
    }

    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(31, 30, 29);
    let x = margin + 4;
    cellLines.forEach((lines, index) => {
      doc.text(lines, x, y);
      x += tableWidth * widths[index];
    });
    y += rowHeight;
  };

  drawRow(headers, true);
  rows.forEach((row) => drawRow(row));
  doc.lastAutoTableY = y;
}

export function downloadReportPdf(summary, range) {
  const doc = new jsPDF();
  const margin = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(120, 49, 38);
  doc.text("Fanaka Beauty - Studio Report", margin, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 95, 85);
  doc.text(`Reporting period: ${displayDate(range.from)} to ${displayDate(range.to)}`, margin, 29);
  doc.text(`Generated: ${new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date())}`, margin, 35);

  drawTable(doc, "Summary", ["Metric", "Value"], [
    ["Total income", currency(summary.totalIncome)],
    ["Total expenses", currency(summary.totalExpenses)],
    [summary.netProfit >= 0 ? "Net profit" : "Net loss", currency(summary.netProfit)],
    ["Completed bookings", String(summary.totalBookings)],
  ], [0.62, 0.38]);
  drawTable(doc, "Income by payment method", ["Payment method", "Amount"], (
    summary.incomeByPaymentMethod || []
  ).map((row) => [row.paymentMethod || "Unspecified", currency(row.total)]), [0.62, 0.38]);
  drawTable(doc, "Expenses by category", ["Category", "Amount"], (
    summary.expensesByCategory || []
  ).map((row) => [row.category || "Unspecified", currency(row.total)]), [0.62, 0.38]);

  doc.save(`${reportFilename(range)}.pdf`);
}
