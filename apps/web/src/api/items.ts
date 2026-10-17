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

const STORAGE_KEY = "avarta_items_catalogue_v1";

const INITIAL_ITEMS: Item[] = [
  {
    id: "itm-001",
    itemCode: "ITM-STL-001",
    name: "Structural Steel Beam 200mm",
    category: "Raw Materials",
    hsnSac: "7216.31.00",
    unitOfMeasure: "MT",
    standardPrice: 48500,
    currency: "INR",
    status: "ACTIVE",
    description: "IS 2062 Grade E250 standard flange beam",
    lastUsedDate: "2026-10-12",
    createdAt: "2026-09-01T10:00:00Z",
  },
  {
    id: "itm-002",
    itemCode: "ITM-ELC-002",
    name: "Industrial Copper Cable 4-Core 16mm",
    category: "Electricals",
    hsnSac: "8544.49.99",
    unitOfMeasure: "Mtr",
    standardPrice: 1250,
    currency: "INR",
    status: "ACTIVE",
    description: "Heavy duty XLPE armoured underground power cable",
    lastUsedDate: "2026-10-14",
    createdAt: "2026-09-02T11:30:00Z",
  },
  {
    id: "itm-003",
    itemCode: "ITM-MCH-003",
    name: "Hydraulic Solenoid Valve 24V DC",
    category: "Machinery Spares",
    hsnSac: "8481.20.00",
    unitOfMeasure: "Pcs",
    standardPrice: 14200,
    currency: "INR",
    status: "ACTIVE",
    description: "Rexroth proportional directional spool valve",
    lastUsedDate: "2026-10-09",
    createdAt: "2026-09-05T08:15:00Z",
  },
  {
    id: "itm-004",
    itemCode: "ITM-IT-004",
    name: "Dell PowerEdge Rack Server R760",
    category: "IT Hardware",
    hsnSac: "8471.49.00",
    unitOfMeasure: "Units",
    standardPrice: 385000,
    currency: "INR",
    status: "ACTIVE",
    description: "Dual Intel Xeon Silver 4410Y 64GB DDR5 Enterprise Compute",
    lastUsedDate: "2026-09-28",
    createdAt: "2026-09-10T14:20:00Z",
  },
  {
    id: "itm-005",
    itemCode: "ITM-SVC-005",
    name: "Plant Preventive Maintenance Audit",
    category: "Professional Services",
    hsnSac: "9983.19.00",
    unitOfMeasure: "Days",
    standardPrice: 25000,
    currency: "INR",
    status: "ACTIVE",
    description: "Onsite mechanical & electrical safety compliance inspection",
    lastUsedDate: "2026-10-01",
    createdAt: "2026-09-12T09:00:00Z",
  },
  {
    id: "itm-006",
    itemCode: "ITM-PKG-006",
    name: "Corrugated Export Packaging Box 5-Ply",
    category: "Packaging",
    hsnSac: "4819.10.10",
    unitOfMeasure: "Pcs",
    standardPrice: 85,
    currency: "INR",
    status: "INACTIVE",
    description: "Heavy craft carton box 600x400x400mm",
    lastUsedDate: "2026-08-20",
    createdAt: "2026-08-15T16:00:00Z",
  },
];

function getStoredItems(): Item[] {
  if (typeof window === "undefined") return INITIAL_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ITEMS));
      return INITIAL_ITEMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ITEMS;
  }
}

function saveItems(items: Item[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Failed to persist items:", err);
  }
}

export async function listItems(params: {
  search?: string;
  category?: string;
  status?: string;
} = {}): Promise<{ data: Item[]; total: number }> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 80));
  let items = getStoredItems();

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    items = items.filter(
      (it) =>
        it.itemCode.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        it.hsnSac.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
    );
  }

  if (params.category && params.category !== "ALL") {
    items = items.filter((it) => it.category === params.category);
  }

  if (params.status && params.status !== "ALL") {
    items = items.filter((it) => it.status === params.status);
  }

  return { data: items, total: items.length };
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
  await new Promise((resolve) => setTimeout(resolve, 100));
  const items = getStoredItems();
  const newItem: Item = {
    id: `itm-${Date.now().toString(36)}`,
    itemCode: input.itemCode.toUpperCase().trim(),
    name: input.name.trim(),
    category: input.category || "General",
    hsnSac: input.hsnSac.trim(),
    unitOfMeasure: input.unitOfMeasure || "Pcs",
    standardPrice: Number(input.standardPrice) || 0,
    currency: input.currency || "INR",
    status: "ACTIVE",
    description: input.description?.trim(),
    createdAt: new Date().toISOString(),
  };

  const updated = [newItem, ...items];
  saveItems(updated);
  return newItem;
}

export async function toggleItemStatus(id: string): Promise<Item> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const items = getStoredItems();
  const index = items.findIndex((it) => it.id === id);
  if (index === -1) throw new Error("Item not found");

  const item = items[index];
  const updatedStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const updatedItem: Item = { ...item, status: updatedStatus };
  items[index] = updatedItem;
  saveItems(items);
  return updatedItem;
}
