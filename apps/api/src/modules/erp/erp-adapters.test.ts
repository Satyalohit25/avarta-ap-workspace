import { describe, it, expect } from "vitest";
import {
  TallyPrimeAdapter,
  QuickBooksAdapter,
  XeroAdapter,
  CsvErpAdapter,
  JournalEntry,
} from "./adapter";

describe("Universal ERP Connectors", () => {
  const sampleEntry: JournalEntry = {
    entryNumber: "JE-2026-001",
    postingDate: "2026-10-13",
    reference: "INV-2026-9901",
    currency: "INR",
    lines: [
      {
        accountCode: "500000",
        accountName: "Operating Expenses",
        debit: 10000,
        credit: 0,
        description: "Materials supply",
      },
      {
        accountCode: "140000",
        accountName: "Input GST Credit",
        debit: 1800,
        credit: 0,
        description: "18% GST",
      },
      {
        accountCode: "200000",
        accountName: "Accounts Payable - Acme Steel",
        debit: 0,
        credit: 11800,
        description: "Payable",
      },
    ],
  };

  it("should generate balanced Tally Prime XML purchase vouchers", async () => {
    const adapter = new TallyPrimeAdapter();
    const result = await adapter.exportJournalEntry(sampleEntry);

    expect(result.format).toBe("XML");
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebits).toBe(11800);
    expect(result.totalCredits).toBe(11800);
    expect(result.content).toContain("<VOUCHER VCHTYPE=\"Purchase\" ACTION=\"Create\">");
    expect(result.content).toContain("<LEDGERNAME>Operating Expenses</LEDGERNAME>");
    expect(result.content).toContain("<LEDGERNAME>Input GST Credit</LEDGERNAME>");
    expect(result.content).toContain("<LEDGERNAME>Accounts Payable - Acme Steel</LEDGERNAME>");
    expect(result.content).toContain("20261013");
  });

  it("should generate balanced QuickBooks Online JSON payloads", async () => {
    const adapter = new QuickBooksAdapter();
    const result = await adapter.exportJournalEntry(sampleEntry);

    expect(result.format).toBe("JSON");
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebits).toBe(11800);
    expect(result.totalCredits).toBe(11800);

    const parsed = JSON.parse(result.content);
    expect(parsed.DocNumber).toBe("JE-2026-001");
    expect(parsed.Line).toHaveLength(3);
    expect(parsed.Line[0].DetailType).toBe("JournalEntryLineDetail");
  });

  it("should generate balanced Xero Accounting JSON payloads", async () => {
    const adapter = new XeroAdapter();
    const result = await adapter.exportJournalEntry(sampleEntry);

    expect(result.format).toBe("JSON");
    expect(result.isBalanced).toBe(true);
    const parsed = JSON.parse(result.content);
    expect(parsed.JournalLines).toHaveLength(3);
    expect(parsed.Narration).toContain("INV-2026-9901");
  });

  it("should generate balanced CSV double-entry general ledger", async () => {
    const adapter = new CsvErpAdapter();
    const result = await adapter.exportJournalEntry(sampleEntry);

    expect(result.format).toBe("CSV");
    expect(result.isBalanced).toBe(true);
    expect(result.content).toContain("EntryNumber,PostingDate,Reference,AccountCode");
    expect(result.content).toContain("JE-2026-001,2026-10-13");
  });
});
