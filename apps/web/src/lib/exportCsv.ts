/**
 * Utilities for secure CSV export with full CSV Formula Injection (CWE-1236) defense.
 * Cells starting with '=', '+', '-', '@', '\t', or '\r' are escaped with a leading
 * single quote (') to neutralize formula execution in Excel, Google Sheets, and LibreOffice.
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);

  // Neutralize CSV Formula Injection (OWASP / CWE-1236)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Quote fields containing commas, double quotes, or line breaks
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv<T>(
  filename: string,
  columns: Array<{ header: string; key: keyof T | ((row: T) => unknown) }>,
  data: T[]
): void {
  const headerRow = columns.map((col) => sanitizeCsvCell(col.header)).join(",");
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const val = typeof col.key === "function" ? col.key(row) : row[col.key];
        return sanitizeCsvCell(val);
      })
      .join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
