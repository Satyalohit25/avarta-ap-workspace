import { apiRequest } from "./client";

export interface Item {
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

export async function listItems(params: {
  search?: string;
  category?: string;
  status?: string;
} = {}): Promise<{ data: Item[]; total: number }> {
  // Errors surface to the caller. A failed catalogue request must never be
  // masked by an empty in-memory list (which reads as "no items exist").
  return await apiRequest<{ data: Item[]; total: number }>("/items", { query: params });
}

export interface CreateItemInput {
  itemCode: string;
  name: string;
  category: string;
  hsnSac: string;
  unitOfMeasure: string;
  standardPrice: number;
  currency?: string;
  description?: string;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  return await apiRequest<Item>("/items", {
    method: "POST",
    body: {
      ...input,
      itemCode: input.itemCode.toUpperCase().trim(),
      name: input.name.trim(),
      standardPrice: Number(input.standardPrice) || 0,
    },
  });
}

export async function toggleItemStatus(id: string): Promise<Item> {
  return await apiRequest<Item>(`/items/${id}/toggle-status`, { method: "POST" });
}
