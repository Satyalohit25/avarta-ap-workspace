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

  describe("Tally SSRF Guard & ALLOW_LOCAL_TALLY Configuration", () => {
    it("strictly blocks loopback probe http://127.0.0.1:54321 with loopback SSRF rejection", async () => {
      const adapter = new TallyPrimeAdapter();
      const result = await adapter.testConnection({ gatewayUrl: "http://127.0.0.1:54321" });

      expect(result.success).toBe(false);
      expect(result.message).toBe("SSRF Rejection: Loopback address prohibited: 127.0.0.1");
    });

    it("blocks http://localhost:9000 by default when ALLOW_LOCAL_TALLY is unset", async () => {
      const oldVal = process.env.ALLOW_LOCAL_TALLY;
      delete process.env.ALLOW_LOCAL_TALLY;
      try {
        const adapter = new TallyPrimeAdapter();
        const result = await adapter.testConnection({ gatewayUrl: "http://localhost:9000" });

        expect(result.success).toBe(false);
        expect(result.message).toBe("SSRF Rejection: Host 'localhost' is prohibited (SSRF Protection).");
      } finally {
        if (oldVal !== undefined) process.env.ALLOW_LOCAL_TALLY = oldVal;
      }
    });

    it("blocks http://127.0.0.1:9000 by default when ALLOW_LOCAL_TALLY is unset", async () => {
      const oldVal = process.env.ALLOW_LOCAL_TALLY;
      delete process.env.ALLOW_LOCAL_TALLY;
      try {
        const adapter = new TallyPrimeAdapter();
        const result = await adapter.testConnection({ gatewayUrl: "http://127.0.0.1:9000" });

        expect(result.success).toBe(false);
        expect(result.message).toBe("SSRF Rejection: Loopback address prohibited: 127.0.0.1");
      } finally {
        if (oldVal !== undefined) process.env.ALLOW_LOCAL_TALLY = oldVal;
      }
    });

    it("permits local dev exception for port 9000 only when ALLOW_LOCAL_TALLY === 'true'", async () => {
      const oldVal = process.env.ALLOW_LOCAL_TALLY;
      process.env.ALLOW_LOCAL_TALLY = "true";
      try {
        const adapter = new TallyPrimeAdapter();
        const result = await adapter.testConnection({ gatewayUrl: "http://localhost:9000" });

        // SSRF guard bypassed; connection error returned because no live Tally is running
        expect(result.message).not.toContain("SSRF Rejection");
        expect(result.message).toContain("Could not reach Tally Gateway at http://localhost:9000");
      } finally {
        if (oldVal !== undefined) process.env.ALLOW_LOCAL_TALLY = oldVal;
        else delete process.env.ALLOW_LOCAL_TALLY;
      }
    });

    it("continues to block loopback port 54321 even when ALLOW_LOCAL_TALLY === 'true'", async () => {
      const oldVal = process.env.ALLOW_LOCAL_TALLY;
      process.env.ALLOW_LOCAL_TALLY = "true";
      try {
        const adapter = new TallyPrimeAdapter();
        const result = await adapter.testConnection({ gatewayUrl: "http://127.0.0.1:54321" });

        expect(result.success).toBe(false);
        expect(result.message).toBe("SSRF Rejection: Loopback address prohibited: 127.0.0.1");
      } finally {
        if (oldVal !== undefined) process.env.ALLOW_LOCAL_TALLY = oldVal;
        else delete process.env.ALLOW_LOCAL_TALLY;
      }
    });
  });
});
