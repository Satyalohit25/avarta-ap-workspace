import { ApiError } from "../../lib/errors";
import * as repo from "./repository";
import { toItemDTO } from "./mapper";
import type { z } from "zod";
import type { createItemSchema, listItemsQuerySchema } from "./validation";

type ListQuery = z.infer<typeof listItemsQuerySchema>;
type CreateInput = z.infer<typeof createItemSchema>;

export async function listItems(organizationId: string, query: ListQuery) {
  const rows = await repo.listItems({ organizationId, ...query });
  const data = rows.map(toItemDTO);
  return { data, total: data.length };
}

export async function createItem(organizationId: string, input: CreateInput) {
  const itemCode = input.itemCode.trim().toUpperCase();

  const existing = await repo.findItemByCode(organizationId, itemCode);
  if (existing) {
    throw ApiError.conflict(`An item with code ${itemCode} already exists.`);
  }

  const created = await repo.createItem({
    organizationId,
    itemCode,
    description: input.name.trim(),
    category: input.category.trim(),
    unitPrice: input.standardPrice,
    uom: input.unitOfMeasure.trim(),
    hsnSac: input.hsnSac.trim(),
    currency: input.currency.toUpperCase(),
    status: "ACTIVE",
  });

  return toItemDTO(created);
}

export async function toggleItemStatus(organizationId: string, id: string) {
  const item = await repo.findItemById(organizationId, id);
  if (!item) {
    throw ApiError.notFound("Item not found");
  }

  const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const updated = await repo.updateItemStatus(organizationId, id, nextStatus);
  if (!updated) {
    throw ApiError.notFound("Item not found");
  }
  return toItemDTO(updated);
}
