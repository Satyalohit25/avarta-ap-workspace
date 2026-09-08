export interface CatalogItem {
  desc: string;
  hsnCode?: string;
  unitWeight: number; // proportional split weight
  typicalQty: number;
}

export const VENDOR_CATALOGS: Record<string, CatalogItem[]> = {
  steel: [
    { desc: "Structural Steel Beams (ISMB 300 Grade E250)", hsnCode: "HSN 7216", unitWeight: 0.55, typicalQty: 20 },
    { desc: "Cold Rolled Galvanized Coils (0.80mm Thickness)", hsnCode: "HSN 7210", unitWeight: 0.35, typicalQty: 10 },
    { desc: "High-Tensile Thermo-Mechanically Treated Rebar (Fe 500D)", hsnCode: "HSN 7214", unitWeight: 0.1, typicalQty: 40 },
  ],
  logistics: [
    { desc: "Domestic Air Cargo Priority Freight Consignment", hsnCode: "SAC 9965", unitWeight: 0.6, typicalQty: 15 },
    { desc: "B2B Full-Truckload Express Surface Transit", hsnCode: "SAC 9965", unitWeight: 0.3, typicalQty: 5 },
    { desc: "Aviation Fuel Surcharge & Terminal Handling Fee", hsnCode: "SAC 9967", unitWeight: 0.1, typicalQty: 1 },
  ],
  it_hardware: [
    { desc: "Dell Latitude 7440 Ultrabooks (Intel Core i7 / 32GB / 1TB SSD)", hsnCode: "HSN 8471", unitWeight: 0.65, typicalQty: 5 },
    { desc: "Dell UltraSharp 27\" 4K USB-C Hub Monitors (U2723QE)", hsnCode: "HSN 8528", unitWeight: 0.25, typicalQty: 8 },
    { desc: "Dell Pro Wireless Keyboard and Mouse Combos (KM5221W)", hsnCode: "HSN 8471", unitWeight: 0.1, typicalQty: 10 },
  ],
  office_ecommerce: [
    { desc: "Ergonomic High-Back Mesh Executive Task Chairs", hsnCode: "HSN 9403", unitWeight: 0.5, typicalQty: 6 },
    { desc: "Multi-Purpose Copier Paper (A4 80GSM - 500 Sheets Bulk Box)", hsnCode: "HSN 4802", unitWeight: 0.35, typicalQty: 25 },
    { desc: "Thermal Barcode Label Rolls (100mm x 150mm Premium)", hsnCode: "HSN 4821", unitWeight: 0.15, typicalQty: 30 },
  ],
  industrial_plc: [
    { desc: "SIMATIC S7-1500 Modular PLC CPU Controller (6ES7511)", hsnCode: "HSN 8537", unitWeight: 0.6, typicalQty: 2 },
    { desc: "SINAMICS G120 Variable Frequency Drive Inverter (7.5kW)", hsnCode: "HSN 8504", unitWeight: 0.3, typicalQty: 3 },
    { desc: "Industrial Ethernet Managed Switch (SCALANCE XB005)", hsnCode: "HSN 8517", unitWeight: 0.1, typicalQty: 4 },
  ],
  ocean_freight: [
    { desc: "40ft High-Cube Ocean Freight Container Slot (Nhava Sheva ➔ Rotterdam)", hsnCode: "SAC 9965", unitWeight: 0.7, typicalQty: 2 },
    { desc: "Port Terminal Handling Charges & Bunker Adjustment Factor (BAF)", hsnCode: "SAC 9967", unitWeight: 0.2, typicalQty: 2 },
    { desc: "International Bill of Lading & Documentation Clearance Fee", hsnCode: "SAC 9967", unitWeight: 0.1, typicalQty: 1 },
  ],
  express_intl: [
    { desc: "Priority International Express Document & Parcel Transit", hsnCode: "SAC 9965", unitWeight: 0.65, typicalQty: 8 },
    { desc: "Customs Brokerage, Clearance & Regulatory Compliance", hsnCode: "SAC 9967", unitWeight: 0.25, typicalQty: 4 },
    { desc: "Remote Area Delivery & Special Handling Surcharge", hsnCode: "SAC 9965", unitWeight: 0.1, typicalQty: 2 },
  ],
  saas_software: [
    { desc: "Enterprise Sales Cloud User Licenses (Annual Tier-1)", hsnCode: "SAC 9983", unitWeight: 0.6, typicalQty: 10 },
    { desc: "Service Cloud Digital Engagement Platform Add-on", hsnCode: "SAC 9983", unitWeight: 0.3, typicalQty: 5 },
    { desc: "Premier 24/7 Enterprise Success & Developer Support Plan", hsnCode: "SAC 9983", unitWeight: 0.1, typicalQty: 1 },
  ],
  generic_industrial: [
    { desc: "Industrial Hydraulic Valve Assembly (Standard 3/4\" High-Pressure)", hsnCode: "HSN 8481", unitWeight: 0.55, typicalQty: 10 },
    { desc: "Precision CNC Machined Flange (Alloy Steel Grade 316)", hsnCode: "HSN 7307", unitWeight: 0.35, typicalQty: 25 },
    { desc: "High-Pressure Nitrile Seal Kit & Replacement O-Ring Packs", hsnCode: "HSN 4016", unitWeight: 0.1, typicalQty: 50 },
  ],
};

export function selectCatalog(supplierName?: string | null): CatalogItem[] {
  if (!supplierName) return VENDOR_CATALOGS.generic_industrial;
  const lower = supplierName.toLowerCase();
  if (lower.includes("tata") || lower.includes("steel") || lower.includes("metal")) return VENDOR_CATALOGS.steel;
  if (lower.includes("blue") || lower.includes("dart") || lower.includes("logistics")) return VENDOR_CATALOGS.logistics;
  if (lower.includes("dell") || lower.includes("tech") || lower.includes("computer")) return VENDOR_CATALOGS.it_hardware;
  if (lower.includes("amazon") || lower.includes("office") || lower.includes("supplies")) return VENDOR_CATALOGS.office_ecommerce;
  if (lower.includes("siemens") || lower.includes("electrical") || lower.includes("automation")) return VENDOR_CATALOGS.industrial_plc;
  if (lower.includes("maersk") || lower.includes("ocean") || lower.includes("shipping")) return VENDOR_CATALOGS.ocean_freight;
  if (lower.includes("fedex") || lower.includes("courier") || lower.includes("express")) return VENDOR_CATALOGS.express_intl;
  if (lower.includes("salesforce") || lower.includes("cloud") || lower.includes("software")) return VENDOR_CATALOGS.saas_software;
  return VENDOR_CATALOGS.generic_industrial;
}

export interface GeneratedLineItem {
  id: string;
  lineNumber: number;
  description: string;
  hsnCode?: string;
  poQty: number;
  invQty: number;
  quantity: number;
  poUnitPrice: number;
  invUnitPrice: number;
  unitPrice: number;
  lineAmount: number;
  currency: string;
  status: "MATCHED" | "PRICE_VARIANCE" | "QTY_VARIANCE";
  overrideAccepted?: boolean;
  overrideReason?: string;
}

export function generateSupplierLineItems(
  supplierName?: string | null,
  totalAmountNum: number = 50000,
  currency: string = "INR",
  exceptions: Array<{ type?: string; description?: string }> = []
): GeneratedLineItem[] {
  const catalog = selectCatalog(supplierName);
  const hasPriceException = exceptions.some(
    (e) => e.type === "PRICE_DIFFERENCE" || (e.description && e.description.toLowerCase().includes("price"))
  );
  const hasQtyException = exceptions.some(
    (e) => e.type === "QUANTITY_DIFFERENCE" || (e.description && e.description.toLowerCase().includes("quantity"))
  );

  const amount = totalAmountNum > 0 ? totalAmountNum : 50000;

  const line1Amount = Math.round(amount * catalog[0].unitWeight);
  const line2Amount = Math.round(amount * catalog[1].unitWeight);
  const line3Amount = Math.max(0, amount - line1Amount - line2Amount);
  const amounts = [line1Amount, line2Amount, line3Amount];

  return catalog.map((cat, idx) => {
    const lineAmt = amounts[idx];
    const qty = cat.typicalQty;
    const exactUnitPrice = Math.round((lineAmt / qty) * 100) / 100;

    let poUnitPrice = exactUnitPrice;
    let invUnitPrice = exactUnitPrice;
    let poQty = qty;
    let invQty = qty;
    let status: "MATCHED" | "PRICE_VARIANCE" | "QTY_VARIANCE" = "MATCHED";

    if (idx === 0 && hasPriceException) {
      poUnitPrice = Math.round(exactUnitPrice * 0.9 * 100) / 100;
      invUnitPrice = exactUnitPrice;
      status = "PRICE_VARIANCE";
    } else if (idx === 1 && hasQtyException) {
      poQty = Math.max(1, Math.round(qty * 0.8));
      invQty = qty;
      status = "QTY_VARIANCE";
    }

    return {
      id: `line-gen-${idx + 1}`,
      lineNumber: idx + 1,
      description: cat.desc,
      hsnCode: cat.hsnCode,
      poQty,
      invQty,
      quantity: invQty,
      poUnitPrice,
      invUnitPrice,
      unitPrice: invUnitPrice,
      lineAmount: lineAmt,
      currency,
      status,
    };
  });
}
