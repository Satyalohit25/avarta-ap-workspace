import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { generateTrackingToken, hashTrackingToken, encryptTrackingToken } from "../../lib/crypto";

const listInclude = {
  supplier: true,
  exceptions: true,
} satisfies Prisma.InvoiceInclude;

const detailInclude = {
  supplier: true,
  workflowInstance: {
    include: {
      transitions: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
  exceptions: true,
  documents: true,
  lines: true,
  validations: {
    orderBy: { createdAt: "asc" },
  },
  approvals: {
    include: { approver: true },
    orderBy: { requestedAt: "asc" },
  },
  payments: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.InvoiceInclude;

interface ListFilters {
  organizationId: string;
  status?: string;
  supplierId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

// Doc 15 §15.69 / AGENTS.md rule 7 — organizationId is always a required,
// server-derived filter on every query. There is no code path in this
// repository that can return another organization's rows.
export async function listInvoices(filters: ListFilters) {
  const where: Prisma.InvoiceWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.status
      ? filters.status.includes(",")
        ? { status: { in: filters.status.split(",").map((s) => s.trim()) as unknown as never } }
        : { status: filters.status as unknown as never }
      : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.search
      ? {
          OR: [
            { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
            { supplier: { displayName: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: listInclude,
      orderBy: { updatedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { rows, total };
}

export async function findInvoiceById(organizationId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, organizationId },
    include: detailInclude,
  });
}

export async function createInvoice(
  organizationId: string,
  data: Prisma.InvoiceUncheckedCreateInput
) {
  let trackingFields = {};
  if (!data.trackingTokenHash) {
    const rawToken = generateTrackingToken();
    trackingFields = {
      trackingTokenHash: hashTrackingToken(rawToken),
      trackingTokenEncrypted: encryptTrackingToken(rawToken, "v1"),
      trackingTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  return prisma.invoice.create({
    data: { ...data, ...trackingFields, organizationId },
    include: listInclude,
  });
}

export async function updateInvoice(
  id: string,
  data: Prisma.InvoiceUncheckedUpdateInput
) {
  return prisma.invoice.update({
    where: { id },
    data,
    include: listInclude,
  });
}

/**
 * Named unscoped lookup for public invoice tracking by SHA-256 token hash.
 * This is the ONLY unauthenticated lookup permitted on Invoice, protected by
 * 256-bit token entropy and rate limiting.
 */
export async function findInvoiceByPublicTrackingHash(hash: string) {
  return prisma.invoice.findFirst({
    where: {
      trackingTokenHash: hash,
    },
    include: {
      supplier: {
        select: { displayName: true, legalName: true },
      },
      payments: {
        select: {
          status: true,
          scheduledDate: true,
          processedAt: true,
          utrNumber: true,
          clearingDate: true,
          clearingDocumentNumber: true,
        },
      },
    },
  });
}

