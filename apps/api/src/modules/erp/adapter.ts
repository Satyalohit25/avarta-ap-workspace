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
  format: "CSV" | "JSON" | "XML";
  content: string;
  reference: string;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  erpResponse?: string;
}

export interface ErpTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ErpAdapter {
  id: string;
  name: string;
  testConnection(config: Record<string, string>): Promise<ErpTestResult>;
  exportJournalEntry(entry: JournalEntry, config?: Record<string, string>): Promise<ErpSyncResult>;
}

/**
 * Standard Double-Entry General Ledger CSV Adapter.
 */
export class CsvErpAdapter implements ErpAdapter {
  id = "csv";
  name = "Standard CSV General Ledger";

  async testConnection(): Promise<ErpTestResult> {
    return {
      success: true,
      latencyMs: 1,
      message: "CSV export engine is always online and ready for batch export.",
    };
  }

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

/**
 * Tally Prime XML Adapter.
 * Integrates with Tally Prime's local XML Gateway (default port 9000).
 * Generates audit-compliant Tally XML Purchase Vouchers with split GST and vendor accounts.
 */
export class TallyPrimeAdapter implements ErpAdapter {
  id = "tally";
  name = "Tally Prime ERP XML Gateway";

  async testConnection(config: Record<string, string>): Promise<ErpTestResult> {
    const start = Date.now();
    const gatewayUrl = config.gatewayUrl || "http://localhost:9000";

    try {
      const pingXml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Company</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`;

      const response = await fetch(gatewayUrl, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: pingXml,
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Date.now() - start;
      if (response.ok) {
        return {
          success: true,
          latencyMs,
          message: `Connected to Tally Prime Gateway at ${gatewayUrl} in ${latencyMs}ms.`,
        };
      } else {
        return {
          success: false,
          latencyMs,
          message: `Tally Gateway returned HTTP ${response.status}. Ensure ODBC/XML Server is active on port 9000.`,
        };
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const isLocalhost = gatewayUrl.includes("localhost") || gatewayUrl.includes("127.0.0.1");

      return {
        success: false,
        latencyMs,
        message: isLocalhost
          ? `Could not reach Tally Gateway at ${gatewayUrl}. Please ensure Tally Prime is running and 'Enable ODBC & XML Server' is turned ON in F1: Help -> Settings -> Connectivity.`
          : `Gateway unreachable at ${gatewayUrl}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async exportJournalEntry(entry: JournalEntry, config?: Record<string, string>): Promise<ErpSyncResult> {
    const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    // Convert lines to Tally LEDGERENTRIES
    const ledgerEntriesXml = entry.lines
      .map((line) => {
        const isDebit = line.debit > 0;
        const amount = isDebit ? -Math.abs(line.debit) : Math.abs(line.credit); // Tally uses negative for Debits
        return `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXml(line.accountName)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
          <AMOUNT>${amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
      })
      .join("");

    const tallyXml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>${entry.postingDate.replace(/-/g, "")}</DATE>
            <VOUCHERNUMBER>${escapeXml(entry.entryNumber)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXml(entry.reference)}</REFERENCE>
            <NARRATION>Avarta AP Workspace auto-sync for ${escapeXml(entry.reference)}</NARRATION>
            ${ledgerEntriesXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    // Attempt direct dispatch if gatewayUrl configured
    let erpResponse: string | undefined;
    if (config?.gatewayUrl) {
      try {
        const res = await fetch(config.gatewayUrl, {
          method: "POST",
          headers: { "Content-Type": "text/xml" },
          body: tallyXml,
          signal: AbortSignal.timeout(5000),
        });
        erpResponse = await res.text();
      } catch {
        // Fallback: XML generated successfully for download/manual sync
      }
    }

    return {
      format: "XML",
      content: tallyXml,
      reference: entry.entryNumber,
      totalDebits,
      totalCredits,
      isBalanced,
      erpResponse,
    };
  }
}

/**
 * QuickBooks Online Adapter.
 * Prepares Bill and Journal payloads matching Intuit Developer API v3.
 */
export class QuickBooksAdapter implements ErpAdapter {
  id = "quickbooks";
  name = "QuickBooks Online";

  async testConnection(config: Record<string, string>): Promise<ErpTestResult> {
    const start = Date.now();
    const { realmId, accessToken } = config;

    if (!realmId || !accessToken) {
      return {
        success: false,
        latencyMs: 0,
        message: "Missing Realm ID or OAuth Access Token. Connect your Intuit QuickBooks account.",
      };
    }

    try {
      const response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      const latencyMs = Date.now() - start;
      if (response.ok) {
        return {
          success: true,
          latencyMs,
          message: `Connected to QuickBooks Online Company (${realmId}) in ${latencyMs}ms.`,
        };
      } else {
        return {
          success: false,
          latencyMs,
          message: `QuickBooks API returned HTTP ${response.status}. Re-authenticate via OAuth.`,
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `QuickBooks connection failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async exportJournalEntry(entry: JournalEntry): Promise<ErpSyncResult> {
    const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const qboPayload = {
      DocNumber: entry.entryNumber,
      TxnDate: entry.postingDate,
      PrivateNote: `Avarta AP Workspace auto-sync for ${entry.reference}`,
      Line: entry.lines.map((l, index) => ({
        Id: String(index + 1),
        Description: l.description,
        Amount: l.debit > 0 ? l.debit : l.credit,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: l.debit > 0 ? "Debit" : "Credit",
          AccountRef: {
            name: l.accountName,
            value: l.accountCode,
          },
        },
      })),
    };

    return {
      format: "JSON",
      content: JSON.stringify(qboPayload, null, 2),
      reference: entry.entryNumber,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }
}

/**
 * Xero Accounting Adapter.
 */
export class XeroAdapter implements ErpAdapter {
  id = "xero";
  name = "Xero Accounting";

  async testConnection(config: Record<string, string>): Promise<ErpTestResult> {
    const start = Date.now();
    const { tenantId, accessToken } = config;

    if (!tenantId || !accessToken) {
      return {
        success: false,
        latencyMs: 0,
        message: "Missing Xero Tenant ID or OAuth Access Token.",
      };
    }

    try {
      const response = await fetch("https://api.xero.com/api.xro/2.0/Organisation", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Xero-Tenant-Id": tenantId,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - start;
      if (response.ok) {
        return {
          success: true,
          latencyMs,
          message: `Connected to Xero Organisation in ${latencyMs}ms.`,
        };
      } else {
        return {
          success: false,
          latencyMs,
          message: `Xero API returned HTTP ${response.status}. Please check token expiration.`,
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: `Xero connection failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async exportJournalEntry(entry: JournalEntry): Promise<ErpSyncResult> {
    const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const xeroManualJournal = {
      Narration: `Avarta AP Workspace: ${entry.reference}`,
      Date: entry.postingDate,
      JournalLines: entry.lines.map((l) => ({
        LineAmount: l.debit > 0 ? l.debit : -l.credit,
        AccountCode: l.accountCode,
        Description: l.description,
      })),
    };

    return {
      format: "JSON",
      content: JSON.stringify(xeroManualJournal, null, 2),
      reference: entry.entryNumber,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }
}

export function getErpAdapter(providerId?: string): ErpAdapter {
  switch (providerId?.toLowerCase()) {
    case "tally":
      return new TallyPrimeAdapter();
    case "quickbooks":
    case "qbo":
      return new QuickBooksAdapter();
    case "xero":
      return new XeroAdapter();
    default:
      return new CsvErpAdapter();
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case "'":
          return "&apos;";
        case '"':
          return "&quot;";
        default:
          return c;
      }
    });
}
