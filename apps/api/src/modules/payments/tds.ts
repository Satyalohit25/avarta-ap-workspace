/**
 * Payment TDS Deduction & Ledger Integration (T-501)
 *
 * Integrates statutory TDS calculation into the payment execution pipeline.
 */

import {
  calculateTds,
  tdsLedger,
  TdsLedgerEntry,
} from "../invoices/tds";

export * from "../invoices/tds";

export interface CreatePaymentWithTdsParams {
  organizationId: string;
  invoiceId: string;
  invoiceNumber?: string;
  supplierId: string;
  supplierName: string;
  supplierPan?: string | null;
  grossAmount: number;
  sectionCode?: string;
  customTdsRatePercent?: number | null;
  deductionDate?: string;
}

export interface PaymentTdsResult {
  grossAmount: number;
  tdsRatePercent: number;
  tdsAmount: number;
  netPayableAmount: number;
  sectionCode: string;
  sectionName: string;
  isSection206AAApplied: boolean;
  ledgerEntry: TdsLedgerEntry;
}

/**
 * Calculates TDS for a payable invoice and records a formal entry in the TDS Payable Ledger.
 */
export function applyPaymentTds(params: CreatePaymentWithTdsParams): PaymentTdsResult {
  const {
    organizationId,
    invoiceId,
    invoiceNumber,
    supplierId,
    supplierName,
    supplierPan,
    grossAmount,
    sectionCode = "194C",
    customTdsRatePercent,
    deductionDate = new Date().toISOString().split("T")[0],
  } = params;

  const calculation = calculateTds({
    grossAmount,
    sectionCode,
    pan: supplierPan,
    customRatePercent: customTdsRatePercent,
  });

  const ledgerEntry = tdsLedger.recordEntry({
    organizationId,
    invoiceId,
    invoiceNumber,
    supplierId,
    supplierName,
    supplierPan: calculation.pan || "PANNOTAVBL",
    sectionCode: calculation.sectionCode,
    sectionDescription: calculation.sectionName,
    tdsRatePercent: calculation.tdsRatePercent,
    grossAmount: calculation.grossAmount,
    tdsAmount: calculation.tdsAmount,
    netPayableAmount: calculation.netPayableAmount,
    deductionDate,
    isSection206AAApplied: calculation.isSection206AAApplied,
  });

  return {
    grossAmount: calculation.grossAmount,
    tdsRatePercent: calculation.tdsRatePercent,
    tdsAmount: calculation.tdsAmount,
    netPayableAmount: calculation.netPayableAmount,
    sectionCode: calculation.sectionCode,
    sectionName: calculation.sectionName,
    isSection206AAApplied: calculation.isSection206AAApplied,
    ledgerEntry,
  };
}
