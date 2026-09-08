import { parsePagination, paginationMeta } from "../../lib/pagination";
import { ApiError } from "../../lib/errors";
import * as repo from "./repository";

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
    data: rows.map((s) => ({
      id: s.id,
      supplierCode: s.supplierCode,
      displayName: s.displayName,
      legalName: s.legalName,
      gstNumber: s.gstNumber,
      country: s.country,
      currency: s.currency,
      paymentTermsDays: s.paymentTermsDays,
      status: s.status,
      outstandingBalance: s.outstandingBalance.toString(),
      openInvoiceCount: s._count.invoices,
      email: s.email,
      phone: s.phone,
      address: s.address,
    })),
    meta: paginationMeta(page, pageSize, total),
  };
}

export async function getSupplier(organizationId: string, id: string) {
  const supplier = await repo.findSupplierById(organizationId, id);
  if (!supplier) throw ApiError.notFound("Supplier not found");
  return supplier;
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
  } = data;
  return repo.createSupplier(organizationId, {
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
  });
}
