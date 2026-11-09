import type { Item as PrismaItem } from "@prisma/client";

export interface ItemDTO {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  hsnSac: string;
  unitOfMeasure: string;
  standardPrice: number;
  currency: string;
  status: "ACTIVE" | "INACTIVE";
  description?: string;
  lastUsedDate?: string;
  createdAt: string;
}

// The database stores the catalogue label in `description` (Doc 13) while the
// workspace UI calls it the item name. Keep the translation in one place.
export function toItemDTO(item: PrismaItem): ItemDTO {
  return {
    id: item.id,
    itemCode: item.itemCode,
    name: item.description,
    category: item.category,
    hsnSac: item.hsnSac,
    unitOfMeasure: item.uom,
    standardPrice: Number(item.unitPrice),
    currency: item.currency,
    status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    description: item.description,
    createdAt: item.createdAt.toISOString(),
  };
}
