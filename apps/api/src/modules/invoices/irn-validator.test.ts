import { describe, it, expect } from "vitest";
import {
  validateIrnFormat,
  computeIrnHash,
  parseSignedQrCode,
  validateEInvoice,
} from "./irn-validator";

describe("e-Invoice IRN & Signed QR Code Validator (T-504)", () => {
  describe("validateIrnFormat", () => {
    it("validates 64-character hexadecimal IRN strings", () => {
      const validIrn = "3b4f995818c8b4f1f5d23382c448bb994c6439c27fef481546874c7e6c0c2a7e";
      expect(validateIrnFormat(validIrn)).toBe(true);
      expect(validateIrnFormat(validIrn.toUpperCase())).toBe(true);

      // Invalid IRNs
      expect(validateIrnFormat("")).toBe(false);
      expect(validateIrnFormat(null)).toBe(false);
      expect(validateIrnFormat(undefined)).toBe(false);
      expect(validateIrnFormat("3b4f995818c8b4f1f5d23382c448bb994c6439c2")).toBe(false); // only 40 chars
      expect(validateIrnFormat(validIrn + "a")).toBe(false); // 65 chars
      expect(validateIrnFormat("3b4f995818c8b4f1f5d23382c448bb994c6439c27fef481546874c7e6c0c2a7z")).toBe(false); // non-hex 'z'
    });
  });

  describe("computeIrnHash", () => {
    it("deterministically calculates SHA-256 IRN hash matching NIC formula", () => {
      const gstin = "29AABCU9603R1ZJ";
      const fy = "2024-25";
      const docType = "INV";
      const docNo = "INV/2024/001";

      const hash = computeIrnHash(gstin, fy, docType, docNo);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);

      // Idempotent
      const hash2 = computeIrnHash(gstin, fy, docType, docNo);
      expect(hash).toBe(hash2);

      // Case insensitive for GSTIN and DocType
      const hashUpper = computeIrnHash("29aabcu9603r1zj", fy, "inv", docNo);
      expect(hashUpper).toBe(hash);
    });
  });

  describe("parseSignedQrCode", () => {
    it("decodes valid signed JWT QR code base64url payload", () => {
      const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const payloadData = {
        SellerGstin: "29AABCU9603R1ZJ",
        BuyerGstin: "27AABCU9603R1ZV",
        DocNo: "INV-001",
        DocTyp: "INV",
        DocDt: "15/05/2026",
        TotInvVal: 118000.0,
        ItemCnt: 2,
        MainHsnCode: "8471",
        Irn: "3b4f995818c8b4f1f5d23382c448bb994c6439c27fef481546874c7e6c0c2a7e",
      };
      const payload = Buffer.from(JSON.stringify(payloadData)).toString("base64url");
      const signature = Buffer.from("mock-signature-bytes").toString("base64url");

      const jwt = `${header}.${payload}.${signature}`;
      const parsed = parseSignedQrCode(jwt);

      expect(parsed).not.toBeNull();
      expect(parsed?.sellerGstin).toBe("29AABCU9603R1ZJ");
      expect(parsed?.buyerGstin).toBe("27AABCU9603R1ZV");
      expect(parsed?.docNo).toBe("INV-001");
      expect(parsed?.totalValue).toBe(118000.0);
      expect(parsed?.irn).toBe("3b4f995818c8b4f1f5d23382c448bb994c6439c27fef481546874c7e6c0c2a7e");
    });

    it("returns null for malformed QR payload string", () => {
      expect(parseSignedQrCode("not-a-valid-jwt-or-json")).toBeNull();
      expect(parseSignedQrCode("")).toBeNull();
      expect(parseSignedQrCode(null)).toBeNull();
    });
  });

  describe("validateEInvoice", () => {
    const validIrn = "3b4f995818c8b4f1f5d23382c448bb994c6439c27fef481546874c7e6c0c2a7e";
    const qrPayload = JSON.stringify({
      SellerGstin: "29AABCU9603R1ZJ",
      BuyerGstin: "27AABCU9603R1ZV",
      DocNo: "INV-001",
      TotInvVal: 50000.0,
      Irn: validIrn,
    });

    it("flags missing IRN when supplier is above statutory turnover threshold (₹5 Cr)", () => {
      const result = validateEInvoice({
        invoiceNumber: "INV-001",
        totalAmount: 50000.0,
        irn: null, // Missing IRN!
        supplierTurnover: 60000000, // 6 Crores >= 5 Crores threshold
        supplierGstin: "29AABCU9603R1ZJ",
      });

      expect(result.isValid).toBe(false);
      expect(result.isMandatory).toBe(true);
      expect(result.discrepancies[0]).toContain("mandatory e-invoicing under Rule 48(4)");
    });

    it("allows missing IRN when supplier turnover is below statutory threshold", () => {
      const result = validateEInvoice({
        invoiceNumber: "INV-001",
        totalAmount: 50000.0,
        irn: null,
        supplierTurnover: 20000000, // 2 Crores < 5 Crores threshold
        supplierGstin: "29AABCU9603R1ZJ",
      });

      expect(result.isValid).toBe(true);
      expect(result.isMandatory).toBe(false);
      expect(result.discrepancies).toHaveLength(0);
    });

    it("validates compliant e-Invoice with valid IRN and matching QR code", () => {
      const result = validateEInvoice({
        invoiceNumber: "INV-001",
        totalAmount: 50000.0,
        irn: validIrn,
        signedQrCode: qrPayload,
        supplierTurnover: 100000000,
        supplierGstin: "29AABCU9603R1ZJ",
        buyerGstin: "27AABCU9603R1ZV",
      });

      expect(result.isValid).toBe(true);
      expect(result.isMandatory).toBe(true);
      expect(result.qrVerified).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
    });

    it("flags discrepancy when QR payload IRN does not match header IRN", () => {
      const mismatchedQr = JSON.stringify({
        SellerGstin: "29AABCU9603R1ZJ",
        DocNo: "INV-001",
        TotInvVal: 50000.0,
        Irn: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });

      const result = validateEInvoice({
        invoiceNumber: "INV-001",
        totalAmount: 50000.0,
        irn: validIrn,
        signedQrCode: mismatchedQr,
      });

      expect(result.isValid).toBe(false);
      expect(result.discrepancies[0]).toContain("QR code IRN mismatch");
    });

    it("flags discrepancy when QR Total Value differs from invoice total", () => {
      const wrongAmountQr = JSON.stringify({
        SellerGstin: "29AABCU9603R1ZJ",
        DocNo: "INV-001",
        TotInvVal: 75000.0, // Invoice total is 50000
        Irn: validIrn,
      });

      const result = validateEInvoice({
        invoiceNumber: "INV-001",
        totalAmount: 50000.0,
        irn: validIrn,
        signedQrCode: wrongAmountQr,
        tolerance: 1.0,
      });

      expect(result.isValid).toBe(false);
      expect(result.discrepancies[0]).toContain("QR code Total Value mismatch");
    });
  });
});
