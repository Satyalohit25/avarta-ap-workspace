import { parsePagination, paginationMeta } from "../../lib/pagination";
import { ApiError } from "../../lib/errors";
import * as repo from "./repository";
import { supplierMsmeStore, isMsmeProtected, MsmeCategory } from "./msme";

function computeSupplierMetrics(
  invoices: Array<{ status: string; workflowState: string; createdAt: Date; updatedAt: Date }>,
  gstNumber?: string | null
) {
  const total = invoices.length;
  const exceptions = invoices.filter(
    (i) => i.status === "EXCEPTION" || i.workflowState === "MATCHING_FAILED" || i.workflowState === "VALIDATION_FAILED"
  ).length;
  const touchless = invoices.filter(
    (i) => i.workflowState === "MATCHED" || i.status === "APPROVED" || i.status === "PAID" || i.status === "SCHEDULED"
  ).length;

  const disputeRateNum = total > 0 ? (exceptions / total) * 100 : 0;
  const stpRateNum = total > 0 ? (touchless / total) * 100 : null;
  const gstClean = gstNumber?.trim() || "";
  const panNumber = gstClean.length >= 12 ? gstClean.substring(2, 12).toUpperCase() : null;

  let totalTurnaroundHours = 0;
  let settledCount = 0;
  for (const inv of invoices) {
    if (inv.status === "PAID" || inv.status === "APPROVED" || inv.status === "SCHEDULED") {
      const diffHours = Math.max(0, (new Date(inv.updatedAt).getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60));
      totalTurnaroundHours += diffHours;
      settledCount++;
    }
  }

  const avgDays = settledCount > 0 ? (totalTurnaroundHours / (settledCount * 24)).toFixed(1) + " Days" : "N/A";
  const riskScore = disputeRateNum > 20 ? "HIGH" : disputeRateNum > 5 ? "MEDIUM" : "LOW";

  return {
    panNumber,
    stpMatchRate: stpRateNum !== null ? `${stpRateNum.toFixed(1)}%` : "No data",
    disputeRate: `${disputeRateNum.toFixed(1)}%`,
    avgTurnaroundDays: avgDays,
    riskScore,
  };
}

export async function listSuppliers(params: {
  organizationId: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page, pageSize } = parsePagination(params);
  const { rows, total } = await repo.listSuppliers({ ...params, page, pageSize });
  return {
    data: rows.map((s) => {
      const metrics = computeSupplierMetrics(s.invoices || [], s.gstNumber);
      return {
        id: s.id,
        supplierCode: s.supplierCode,
        displayName: s.displayName,
        legalName: s.legalName,
        gstNumber: s.gstNumber,
        panNumber: metrics.panNumber,
        country: s.country,
        currency: s.currency,
        paymentTermsDays: s.paymentTermsDays,
        status: s.status,
        outstandingBalance: s.outstandingBalance.toString(),
        openInvoiceCount: s._count.invoices,
        email: s.email,
        phone: s.phone,
        address: s.address,
        stpMatchRate: metrics.stpMatchRate,
        disputeRate: metrics.disputeRate,
        avgTurnaroundDays: metrics.avgTurnaroundDays,
        riskScore: metrics.riskScore,
        msmeCategory: supplierMsmeStore.getProfile(params.organizationId, s.id)?.msmeCategory || "NON_MSME",
        udyamNumber: supplierMsmeStore.getProfile(params.organizationId, s.id)?.udyamNumber || null,
        isMsmeProtected: isMsmeProtected(supplierMsmeStore.getProfile(params.organizationId, s.id)?.msmeCategory),
      };
    }),
    meta: paginationMeta(page, pageSize, total),
  };
}

export async function getSupplier(organizationId: string, id: string) {
  const supplier = await repo.findSupplierById(organizationId, id);
  if (!supplier) throw ApiError.notFound("Supplier not found");
  const metrics = computeSupplierMetrics(supplier.invoices || [], supplier.gstNumber);
  const msme = supplierMsmeStore.getProfile(organizationId, id) || supplierMsmeStore.getProfile(organizationId, supplier.supplierCode);
  return {
    ...supplier,
    ...metrics,
    msmeCategory: msme?.msmeCategory || "NON_MSME",
    udyamNumber: msme?.udyamNumber || null,
    isMsmeProtected: isMsmeProtected(msme?.msmeCategory),
  };
}

export async function createSupplier(organizationId: string, data: Record<string, unknown>) {
  const {
    supplierCode,
    legalName,
    displayName,
    gstNumber,
    country,
    currency,
    paymentTermsDays,
    email,
    phone,
    address,
    panNumber,
    msmeCategory,
    udyamNumber,
  } = data;
  const created = await repo.createSupplier(organizationId, {
    // organizationId is added here to satisfy Prisma type; repo.createSupplier will authoratively override it
    organizationId,
    supplierCode: supplierCode as string,
    legalName: legalName as string,
    displayName: displayName as string,
    gstNumber: gstNumber ? (gstNumber as string) : undefined,
    country: (country as string) ?? "IN",
    currency: (currency as string) ?? "INR",
    paymentTermsDays: Number(paymentTermsDays) || 30,
    email: email ? (email as string) : undefined,
    phone: phone ? (phone as string) : undefined,
    address: address ? (address as string) : undefined,
    panNumber: panNumber ? (panNumber as string).toUpperCase() : undefined,
  });

  if (msmeCategory || udyamNumber) {
    supplierMsmeStore.setProfile({
      organizationId,
      supplierId: created.id,
      supplierCode: created.supplierCode,
      msmeCategory: (msmeCategory as MsmeCategory) || "NON_MSME",
      udyamNumber: udyamNumber ? String(udyamNumber).toUpperCase() : null,
      hasWrittenAgreement: true,
    });
  }

  return created;
}
