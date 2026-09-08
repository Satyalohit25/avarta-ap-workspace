import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/pagination";

export async function listExceptions(params: {
  organizationId: string;
  status?: string;
  severity?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page, pageSize } = parsePagination(params);
  const where = {
    organizationId: params.organizationId,
    ...(params.status ? { status: params.status as unknown as never } : {}),
    ...(params.severity ? { severity: params.severity as unknown as never } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.exception.findMany({
      where,
      include: { invoice: { include: { supplier: true } }, assignedTo: true },
      // Doc 06.5 default sort: severity, then age, then newest.
      orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exception.count({ where }),
  ]);

  return {
    data: rows.map((e) => ({
      id: e.id,
      invoiceId: e.invoiceId,
      invoiceNumber: e.invoice.invoiceNumber,
      vendor: e.invoice.supplier?.displayName ?? "Unknown",
      type: e.type,
      title: e.title,
      severity: e.severity,
      status: e.status,
      owner: e.assignedTo ? e.assignedTo.fullName : null,
      createdAt: e.createdAt,
    })),
    meta: paginationMeta(page, pageSize, total),
  };
}

export async function assignException(organizationId: string, exceptionId: string, userId: string) {
  const exception = await prisma.exception.findFirst({ where: { id: exceptionId, organizationId } });
  if (!exception) throw ApiError.notFound("Exception not found");
  return prisma.exception.update({
    where: { id: exceptionId },
    data: { assignedToId: userId, status: "ASSIGNED" },
  });
}

/**
 * Doc 18 §18.4 Path 2: Documented manual resolution.
 * Requires a non-empty resolution note, updates the exception status,
 * and triggers re-validation server-side.
 */
export async function resolveException(
  organizationId: string,
  exceptionId: string,
  resolution: string,
  userId?: string
) {
  if (!resolution || resolution.trim().length === 0) {
    throw ApiError.badRequest("Resolution note is required to manually resolve an exception.");
  }

  const exception = await prisma.exception.findFirst({
    where: { id: exceptionId, organizationId },
  });
  if (!exception) throw ApiError.notFound("Exception not found");

  const updatedException = await prisma.exception.update({
    where: { id: exceptionId },
    data: {
      status: "RESOLVED",
      resolution: resolution.trim(),
      resolvedAt: new Date(),
    },
  });

  // Re-trigger validation via workflow engine
  const { applyTransition } = await import("../../workflow/engine");
  await applyTransition({
    invoiceId: exception.invoiceId,
    event: "EXCEPTION_RESOLVED",
    triggeredBy: userId,
    reason: resolution.trim(),
  });


  return updatedException;
}

