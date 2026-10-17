/**
 * Bank File Generator (NACHA & CSV)
 * Aligned to Doc 24 C8-4:
 * "Bank files parse correctly: expected columns, 94-character NACHA records, control totals, and routing check digits."
 */

export interface BankPaymentRecord {
  paymentId: string;
  amount: number;
  currency: string;
  beneficiaryName: string;
  accountNumber: string;
  routingNumber: string; // 9-digit ABA routing or 11-char IFSC
  invoiceNumber: string;
  dueDate?: Date | string;
}

/**
 * Calculates standard 1-digit NACHA routing transit check digit (Mod 10 algorithm with weights 3, 7, 1).
 */
export function calculateRoutingCheckDigit(routing8Digits: string): number {
  const digits = routing8Digits.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 8) return 0;
  const weights = [3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Pad string to exact width with spaces on the right
 */
function padRight(str: string, width: number): string {
  const clean = (str || "").slice(0, width);
  return clean + " ".repeat(width - clean.length);
}

/**
 * Pad numeric string to exact width with zeros on the left
 */
function padZeros(num: number | string, width: number): string {
  const str = String(num);
  const clean = str.slice(0, width);
  return "0".repeat(width - clean.length) + clean;
}

/**
 * Generates official 94-character fixed-width NACHA format file for US ACH batch processing.
 */
export function generateNachaFile(
  companyName: string,
  companyId: string,
  records: BankPaymentRecord[]
): string {
  const now = new Date();
  const dateYYMMDD = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timeHHMM = now.toTimeString().slice(0, 5).replace(/:/g, "");

  const cleanCompanyName = companyName.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 16);
  const cleanCompanyId = companyId.replace(/[^A-Z0-9]/g, "").slice(0, 10);

  const lines: string[] = [];

  // Record 1: File Header (Exactly 94 characters)
  const fileHeader =
    "1" + // Record Type
    "01" + // Priority Code
    " 121000358" + // Immediate Destination (Fed Reserve Routing, padded to 10)
    " " + padRight(cleanCompanyId, 9) + // Immediate Origin (10 chars)
    dateYYMMDD + // File Creation Date (6)
    timeHHMM + // File Creation Time (4)
    "A" + // File ID Modifier (1)
    "094" + // Record Size (3)
    "10" + // Blocking Factor (2)
    "1" + // Format Code (1)
    padRight("FEDERAL RESERVE BANK", 23) + // Destination Name (23)
    padRight(cleanCompanyName, 23) + // Origin Name (23)
    "        "; // Reference Code (8 spaces)
  lines.push(fileHeader.slice(0, 94));

  // Record 5: Company / Batch Header (Exactly 94 characters)
  const batchHeader =
    "5" + // Record Type
    "200" + // Service Class Code (200: ACH Credits and Debits)
    padRight(cleanCompanyName, 16) + // Company Name (16)
    padRight("VENDOR PAY", 20) + // Company Discretionary Data (20)
    padRight(cleanCompanyId, 10) + // Company ID (10)
    "CCD" + // Standard Entry Class (CCD: Corporate Credit or Debit)
    padRight("PAYMENTS", 10) + // Entry Description (10)
    dateYYMMDD + // Descriptive Date (6)
    dateYYMMDD + // Effective Entry Date (6)
    "   " + // Settlement Date (3 spaces)
    "1" + // Originator Status Code (1)
    "12100035" + // Originating DFI ID (8)
    "0000001"; // Batch Number (7)
  lines.push(batchHeader.slice(0, 94));

  let totalCreditCents = 0;
  let entryHashSum = 0;

  // Record 6: Entry Detail Records (Each exactly 94 characters)
  records.forEach((rec, idx) => {
    const rawRouting = (rec.routingNumber || "121000358").replace(/\D/g, "");
    const routing8 = padZeros(rawRouting.slice(0, 8), 8);
    const checkDigit = calculateRoutingCheckDigit(routing8);
    entryHashSum += parseInt(routing8, 10);

    const amountCents = Math.round(rec.amount * 100);
    totalCreditCents += amountCents;

    const cleanAccount = padRight(rec.accountNumber.replace(/[^A-Za-z0-9]/g, ""), 17);
    const cleanPayee = padRight(rec.beneficiaryName.toUpperCase().replace(/[^A-Z0-9 ]/g, ""), 22);
    const trace = "12100035" + padZeros(idx + 1, 7);

    const entryDetail =
      "6" + // Record Type
      "22" + // Transaction Code (22: Automated Deposit)
      routing8 + // Receiving DFI Routing (8)
      checkDigit.toString() + // Check Digit (1)
      cleanAccount + // DFI Account Number (17)
      padZeros(amountCents, 10) + // Amount in cents (10)
      padRight(rec.invoiceNumber, 15) + // Identification Number (15)
      cleanPayee + // Receiving Individual / Company Name (22)
      "  " + // Discretionary Data (2)
      "0" + // Addenda Record Indicator (1)
      trace; // Trace Number (15)

    lines.push(entryDetail.slice(0, 94));
  });

  const entryHashStr = padZeros(entryHashSum % 10000000000, 10);

  // Record 8: Batch Control Record (Exactly 94 characters)
  const batchControl =
    "8" + // Record Type
    "200" + // Service Class Code (200)
    padZeros(records.length, 6) + // Entry / Addenda Count (6)
    entryHashStr + // Entry Hash (10)
    padZeros(0, 12) + // Total Debit Amount in cents (12)
    padZeros(totalCreditCents, 12) + // Total Credit Amount in cents (12)
    padRight(cleanCompanyId, 10) + // Company ID (10)
    padRight("", 19) + // Message Auth Code (19 blanks)
    padRight("", 6) + // Reserved (6 blanks)
    "12100035" + // Originating DFI (8)
    "0000001"; // Batch Number (7)
  lines.push(batchControl.slice(0, 94));

  // Record 9: File Control Record (Exactly 94 characters)
  const totalRecords = lines.length + 1;
  const blockCount = Math.ceil(totalRecords / 10);

  const fileControl =
    "9" + // Record Type
    "000001" + // Batch Count (6)
    padZeros(blockCount, 6) + // Block Count (6)
    padZeros(records.length, 8) + // Total Detail/Addenda Count (8)
    entryHashStr + // Entry Hash (10)
    padZeros(0, 12) + // Total Debit in cents (12)
    padZeros(totalCreditCents, 12) + // Total Credit in cents (12)
    padRight("", 39); // Reserved (39 blanks)
  lines.push(fileControl.slice(0, 94));

  // Padding blocks to multiple of 10 if necessary per NACHA standard
  while (lines.length % 10 !== 0) {
    lines.push("9".repeat(94));
  }

  return lines.join("\r\n");
}

/**
 * Generates standard Corporate Banking CSV format file.
 */
export function generateBankCsv(records: BankPaymentRecord[]): string {
  const headers = [
    "PaymentReference",
    "InvoiceNumber",
    "BeneficiaryName",
    "AccountNumber",
    "IFSC_Or_Routing",
    "Amount",
    "Currency",
    "DueDate",
  ];

  const rows = records.map((r) => [
    `"${r.paymentId}"`,
    `"${r.invoiceNumber}"`,
    `"${r.beneficiaryName.replace(/"/g, '""')}"`,
    `"${r.accountNumber}"`,
    `"${r.routingNumber}"`,
    r.amount.toFixed(2),
    `"${r.currency}"`,
    `"${r.dueDate || ""}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}
