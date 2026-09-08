import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../lib/errors";
import { findTransition, WorkflowEvent } from "./transitions";
import { STATE_TO_INVOICE_STATUS, WorkflowState } from "./states";

interface ApplyTransitionInput {
  invoiceId: string;
  event: WorkflowEvent;
  triggeredBy?: string | null;
  reason?: string | null;
}

/**
 * The single entry point for changing an invoice's workflow state.
 *
 * AGENTS.md rule 4 / Doc 18 §18.7: workflow_instances.current_state is the
 * source of truth; invoices.status is a denormalized projection updated
 * here as a side effect, in the same transaction, and NOWHERE else.
 * Application/controller code must call this function rather than writing
 * to either field directly.
 */
export async function applyTransition({ invoiceId, event, triggeredBy, reason }: ApplyTransitionInput) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const instance = await tx.workflowInstance.findUnique({ where: { invoiceId } });
    if (!instance) {
      throw ApiError.notFound("Workflow instance not found for this invoice");
    }

    const currentState = instance.currentState as unknown as WorkflowState;
    const rule = findTransition(currentState, event);
    if (!rule) {
      throw ApiError.conflict(
        `Event "${event}" is not valid from state "${currentState}"`,
        { currentState, event }
      );
    }

    const updatedInstance = await tx.workflowInstance.update({
      where: { invoiceId },
      data: {
        currentState: rule.to as unknown as never,
        completedAt: rule.to === "ARCHIVED" ? new Date() : undefined,
      },
    });

    await tx.workflowTransition.create({
      data: {
        workflowInstanceId: instance.id,
        fromState: rule.from,
        toState: rule.to,
        event,
        triggeredBy: triggeredBy ?? null,
        reason: reason ?? null,
      },
    });

    const projectedStatus = STATE_TO_INVOICE_STATUS[rule.to];
    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        workflowState: rule.to as unknown as never,
        status: projectedStatus as unknown as never,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: invoice.organizationId,
        userId: triggeredBy ?? null,
        action: "WORKFLOW_TRANSITION",
        entityType: "invoice",
        entityId: invoiceId,
        beforeData: { state: rule.from },
        afterData: { state: rule.to, event },
      },
    });

    return { invoice, workflowInstance: updatedInstance };
  });
}

/** Creates the initial workflow instance for a newly received invoice. */
export async function startWorkflow(invoiceId: string) {
  return prisma.workflowInstance.create({
    data: { invoiceId, currentState: "RECEIVED" },
  });
}
