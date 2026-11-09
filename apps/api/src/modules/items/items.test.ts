import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/database";
import { createItem, listItems, toggleItemStatus } from "./service";

const ORG_A = "org-items-test-a";
const ORG_B = "org-items-test-b";

const itemInput = {
  itemCode: "itm-001",
  name: "Copper Wire 2mm",
  category: "Raw Materials",
  hsnSac: "8544",
  unitOfMeasure: "Mtr",
  standardPrice: 42.5,
  currency: "INR",
};

describe("Items catalogue", () => {
  beforeEach(async () => {
    await prisma.item.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
    await prisma.organization.createMany({
      data: [
        { id: ORG_A, name: "Items Test A", defaultCurrency: "INR", country: "IN" },
        { id: ORG_B, name: "Items Test B", defaultCurrency: "INR", country: "IN" },
      ],
    });
  });

  it("creates an item and returns the UI-shaped catalogue record", async () => {
    const created = await createItem(ORG_A, itemInput);

    expect(created.itemCode).toBe("ITM-001");
    expect(created.name).toBe("Copper Wire 2mm");
    expect(created.hsnSac).toBe("8544");
    expect(created.unitOfMeasure).toBe("Mtr");
    expect(created.standardPrice).toBe(42.5);
    expect(created.status).toBe("ACTIVE");
  });

  it("rejects a duplicate item code within the same tenant", async () => {
    await createItem(ORG_A, itemInput);
    await expect(createItem(ORG_A, itemInput)).rejects.toThrow(/already exists/i);
  });

  it("keeps tenant catalogues isolated", async () => {
    await createItem(ORG_A, itemInput);

    const ownList = await listItems(ORG_A, {});
    const otherList = await listItems(ORG_B, {});

    expect(ownList.total).toBe(1);
    expect(otherList.total).toBe(0);
  });

  it("toggles status instead of deleting the item", async () => {
    const created = await createItem(ORG_A, itemInput);
    const archived = await toggleItemStatus(ORG_A, created.id);

    expect(archived.status).toBe("INACTIVE");
    expect(await prisma.item.count({ where: { organizationId: ORG_A } })).toBe(1);

    const restored = await toggleItemStatus(ORG_A, created.id);
    expect(restored.status).toBe("ACTIVE");
  });

  it("does not let another tenant toggle the item", async () => {
    const created = await createItem(ORG_A, itemInput);
    await expect(toggleItemStatus(ORG_B, created.id)).rejects.toThrow(/not found/i);
  });
});
