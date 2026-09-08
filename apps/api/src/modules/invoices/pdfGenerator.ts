import fs from "fs";
import path from "path";

export function generateInvoicePdfBuffer(params: {
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number | string;
  currency?: string;
  date?: string;
}): Buffer {
  const {
    invoiceNumber,
    vendorName,
    totalAmount,
    currency = "INR",
    date = new Date().toLocaleDateString("en-IN"),
  } = params;

  const escapePdf = (str: string) =>
    str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const streamContent = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    "(ACME MANUFACTURING PVT LTD) Tj",
    "/F1 10 Tf",
    "0 -18 Td",
    "(Avarta AP Workspace - Statutory Tax Invoice Voucher) Tj",
    "0 -25 Td",
    "/F1 12 Tf",
    `(${escapePdf(`Invoice Number: ${invoiceNumber}`)} ) Tj`,
    "0 -18 Td",
    `(${escapePdf(`Vendor / Beneficiary: ${vendorName}`)} ) Tj`,
    "0 -18 Td",
    `(${escapePdf(`Total Amount: ${currency} ${Number(totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`)} ) Tj`,
    "0 -18 Td",
    `(${escapePdf(`Date: ${date}`)} ) Tj`,
    "0 -18 Td",
    "(GSTIN / Tax ID: 27AAACA1234F1Z5 | HSN / SAC Verified) Tj",
    "0 -30 Td",
    "/F1 10 Tf",
    "(DOCUMENT SOURCE VERIFICATION) Tj",
    "0 -15 Td",
    "(This digital invoice voucher has been verified and registered in the Avarta AP Pipeline.) Tj",
    "0 -15 Td",
    "(Reconciled against 3-way matching rules, statutory GST arithmetic, and departmental approval thresholds.) Tj",
    "0 -30 Td",
    "(Status: Electronically Archived & Non-Repudiable) Tj",
    "ET",
    // Draw a neat border box
    "40 620 515 200 re",
    "0.8 0.8 0.8 RG",
    "1 w",
    "S",
  ].join("\n");

  const streamLength = Buffer.byteLength(streamContent);

  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  ];

  let header = "%PDF-1.4\n";
  let offset = header.length;
  const xrefEntries = ["0000000000 65535 f \n"];

  let body = "";
  for (const obj of objects) {
    xrefEntries.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    body += obj;
    offset += obj.length;
  }

  const xrefOffset = header.length + body.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  for (const entry of xrefEntries) {
    xref += entry;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(header + body + xref + trailer, "utf-8");
}
