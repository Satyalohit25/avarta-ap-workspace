export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export interface JournalEntry {
  entryNumber: string;
  postingDate: string;
  reference: string;
  currency: string;
  lines: JournalEntryLine[];
}

export interface ErpSyncResult {
  format: "CSV" | "JSON";
  content: string;
  reference: string;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface ErpAdapter {
  name: string;
  exportJournalEntry(entry: JournalEntry): Promise<ErpSyncResult>;
}

/**
 * Standard Double-Entry General Ledger CSV Adapter.
 * Generates audit-compliant CSV journal entries suitable for SAP, Oracle NetSuite,
 * QuickBooks, and Tally batch ledger imports.
 */
export class CsvErpAdapter implements ErpAdapter {
  name = "Standard CSV General Ledger Adapter";

  async exportJournalEntry(entry: JournalEntry): Promise<ErpSyncResult> {
    const headers = "EntryNumber,PostingDate,Reference,AccountCode,AccountName,Debit,Credit,Currency,Description";
    const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const rows = entry.lines.map((line) =>
      [
        entry.entryNumber,
        entry.postingDate,
        `"${entry.reference.replace(/"/g, '""')}"`,
        line.accountCode,
        `"${line.accountName.replace(/"/g, '""')}"`,
        line.debit.toFixed(2),
        line.credit.toFixed(2),
        entry.currency,
        `"${line.description.replace(/"/g, '""')}"`,
      ].join(",")
    );

    const csvContent = [headers, ...rows].join("\n");

    return {
      format: "CSV",
      content: csvContent,
      reference: entry.entryNumber,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }
}
