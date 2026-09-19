import { describe, expect, it, vi } from "vitest";
import { CsvErpAdapter } from "./adapter";
import { buildJournalEntry, syncInvoiceWithErp } from "./service";
import { prisma } from "../../config/database";
import * as workflowEngine from "../../workflow/engine";

describe("ERP Sync (CSV Adapter) (Step 8)", () => {
  it("builds a balanced double-entry journal entry from invoice", () => {
    const mockInvoice = {
      id: "inv-123",
      invoiceNumber: "INV-2026-001",
      currency: "INR",
      subtotalAmount: 100_000,
      taxAmount: 18_000,
      totalAmount: 118_000,
      supplier: { displayName: "Acme Industrial Supplies" },
    };

    const entry = buildJournalEntry(mockInvoice);

    expect(entry.reference).toBe("INV-INV-2026-001");
    expect(entry.lines).toHaveLength(3);

    const debits = entry.lines.reduce((sum, l) => sum + l.debit, 0);
    const credits = entry.lines.reduce((sum, l) => sum + l.credit, 0);
    expect(debits).toBe(118_000);
    expect(credits).toBe(118_000);
    expect(debits).toEqual(credits);
  });

  it("exports valid CSV formatted journal entry via CsvErpAdapter", async () => {
    const adapter = new CsvErpAdapter();
    const entry = {
      entryNumber: "JE-1001",
      postingDate: "2026-09-19",
      reference: "INV-2026-001",
      currency: "INR",
      lines: [
        {
          accountCode: "500000",
          accountName: "Operating Expenses",
          debit: 100000,
          credit: 0,
          description: "Expense booking",
        },
        {
          accountCode: "200000",
          accountName: "Accounts Payable",
          debit: 0,
          credit: 100000,
          description: "Liability booking",
        },
      ],
    };

    const result = await adapter.exportJournalEntry(entry);

    expect(result.format).toBe("CSV");
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebits).toBe(100000);
    expect(result.totalCredits).toBe(100000);
    expect(result.content).toContain("EntryNumber,PostingDate,Reference");
    expect(result.content).toContain("500000");
    expect(result.content).toContain("200000");
  });

  it("syncInvoiceWithErp transitions invoice and stamps clearing document", async () => {
    vi.spyOn(prisma.invoice, "findFirst").mockResolvedValue({
      id: "inv-123",
      organizationId: "org-1",
      invoiceNumber: "INV-2026-001",
      currency: "INR",
      totalAmount: 118000 as any,
      taxAmount: 18000 as any,
      supplier: { displayName: "Acme Industrial" },
    } as any);

    const updateSpy = vi.spyOn(prisma.invoice, "update").mockResolvedValue({} as any);
    const transitionSpy = vi.spyOn(workflowEngine, "applyTransition").mockResolvedValue({} as any);

    const result = await syncInvoiceWithErp({
      organizationId: "org-1",
      invoiceId: "inv-123",
      userId: "user-1",
      targetErp: "SAP S/4HANA",
    });

    expect(result.invoiceNumber).toBe("INV-2026-001");
    expect(result.syncResult.isBalanced).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-123" },
        data: expect.objectContaining({ erpClearingNumber: expect.any(String) }),
      })
    );
    expect(transitionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-123",
        event: "ERP_SUCCESS",
      })
    );
  });
});
