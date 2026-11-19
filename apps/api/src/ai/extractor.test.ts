import zlib from "zlib";
import fs from "fs";
import path from "path";
import os from "os";
import { describe, expect, it } from "vitest";
import {
  detectCurrency,
  extractInvoiceNumber,
  extractTextFromPdfBuffer,
  extractWithHeuristics,
  MAX_STREAM_COUNT,
} from "./extractor";
import { ApiError } from "../lib/errors";

describe("T-208: Extractor Regexes, Email Parsers & Currency Disambiguation", () => {
  describe("Fixture Set of 20 Invoices and Email Subjects", () => {
    const fixtures: Array<{ input: string; expected: string | null; description: string }> = [
      {
        input: "Invoice Number: ABC-123",
        expected: "ABC-123",
        description: "Captures invoice number without capturing the word 'Number'",
      },
      {
        input: "Invoice for September",
        expected: null,
        description: "Never captures 'for' from 'Invoice for September'",
      },
      {
        input: "Invoice for October 2026",
        expected: null,
        description: "Prepositional month subject returns null",
      },
      {
        input: "Invoice # INV-2026-9041",
        expected: "INV-2026-9041",
        description: "Extracts formatted alphanumeric invoice code with # prefix",
      },
      {
        input: "Bill No: 884712",
        expected: "884712",
        description: "Extracts numeric bill number with 'Bill No:' prefix",
      },
      {
        input: "Tax Invoice - TI/2026/001",
        expected: "TI/2026/001",
        description: "Extracts slash-separated tax invoice format",
      },
      {
        input: "Subject: Invoice of Services rendered",
        expected: null,
        description: "Prepositional 'Invoice of...' subject returns null",
      },
      {
        input: "INV-2026-8812 - Amazon Web Services",
        expected: "INV-2026-8812",
        description: "Extracts leading INV- prefixed invoice code",
      },
      {
        input: "Invoice Number: ACME-99124 - Total Due",
        expected: "ACME-99124",
        description: "Extracts invoice number before hyphenated notes",
      },
      {
        input: "Invoice for Consulting - INV-7721",
        expected: "INV-7721",
        description: "Extracts trailing invoice code even in subject with 'for'",
      },
      {
        input: "Bill # BILL-4412",
        expected: "BILL-4412",
        description: "Extracts BILL- prefixed identifier",
      },
      {
        input: "Monthly Statement for November",
        expected: null,
        description: "General statement subject returns null",
      },
      {
        input: "Invoice dated 15-Oct-2026",
        expected: null,
        description: "Invoice dated without number returns null",
      },
      {
        input: "INV/2026/109",
        expected: "INV/2026/109",
        description: "Extracts slash-delimited invoice code",
      },
      {
        input: "Tax Invoice Number: 2026-8819",
        expected: "2026-8819",
        description: "Extracts code after 'Tax Invoice Number:'",
      },
      {
        input: "Invoice Number",
        expected: null,
        description: "Keyword 'Invoice Number' without value returns null",
      },
      {
        input: "PO-FY26-0902 Invoice # 55192",
        expected: "55192",
        description: "Extracts invoice number following PO number",
      },
      {
        input: "Invoice: ABC-99002",
        expected: "ABC-99002",
        description: "Extracts invoice number with colon prefix",
      },
      {
        input: "Invoice from Vendor XYZ",
        expected: null,
        description: "Prepositional 'Invoice from...' returns null",
      },
      {
        input: "Subtotal 100.00 Total 118.00",
        expected: null,
        description: "Financial summary text without invoice number returns null",
      },
    ];

    fixtures.forEach(({ input, expected, description }, idx) => {
      it(`Fixture #${idx + 1}: ${description} ("${input}")`, () => {
        const result = extractInvoiceNumber(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe("Subtotal vs Total Regex Disambiguation", () => {
    it("extracts subtotal: 100.00 and total: 118.00 without matching total inside subtotal", () => {
      const tmpFile = path.join(os.tmpdir(), `test-inv-totals-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, "Invoice: INV-9988 Subtotal 100.00 Total 118.00 INR");

      try {
        const result = extractWithHeuristics(tmpFile, "text/plain", "invoice.txt");
        expect(result.subtotal).toBe(100.0);
        expect(result.totalAmount).toBe(118.0);
        expect(result.invoiceNumber).toBe("INV-9988");
        expect(result.currency).toBe("INR");
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it("extracts grand total accurately when grand total precedes subtotal", () => {
      const tmpFile = path.join(os.tmpdir(), `test-inv-grand-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, "Grand Total: 236.00 Subtotal: 200.00 Tax Amount: 36.00 INR");

      try {
        const result = extractWithHeuristics(tmpFile, "text/plain", "invoice.txt");
        expect(result.subtotal).toBe(200.0);
        expect(result.totalAmount).toBe(236.0);
        expect(result.taxAmount).toBe(36.0);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });
  });

  describe("Currency Detection & Disambiguation", () => {
    it("detects INR for ₹, Rs, Rs., and INR", () => {
      expect(detectCurrency("Total Amount: ₹ 1,500.00")).toBe("INR");
      expect(detectCurrency("Amount: Rs. 2,500.00")).toBe("INR");
      expect(detectCurrency("Invoice Total Rs 500.00")).toBe("INR");
      expect(detectCurrency("Due: INR 10,000.00")).toBe("INR");
    });

    it("detects USD for explicit USD and US$, but returns null for bare $", () => {
      expect(detectCurrency("Grand Total: USD 500.00")).toBe("USD");
      expect(detectCurrency("Amount: US$ 250.00")).toBe("USD");
      // Bare $ is ambiguous (could be USD, CAD, SGD, AUD) and must not silently mean USD
      expect(detectCurrency("Amount: $100.00")).toBeNull();
    });

    it("detects CAD for CAD, C$, and CA$", () => {
      expect(detectCurrency("Balance: CAD 300.00")).toBe("CAD");
      expect(detectCurrency("Total: C$ 150.00")).toBe("CAD");
      expect(detectCurrency("Invoice: CA$ 200.00")).toBe("CAD");
    });

    it("detects SGD for SGD and S$", () => {
      expect(detectCurrency("Amount Due: SGD 450.00")).toBe("SGD");
      expect(detectCurrency("Total: S$ 225.00")).toBe("SGD");
    });

    it("detects EUR for EUR and €", () => {
      expect(detectCurrency("Total: EUR 600.00")).toBe("EUR");
      expect(detectCurrency("Amount: € 350.00")).toBe("EUR");
    });

    it("detects GBP for GBP and £", () => {
      expect(detectCurrency("Invoice Total: GBP 150.00")).toBe("GBP");
      expect(detectCurrency("Balance Due: £ 85.00")).toBe("GBP");
    });

    it("returns null when ambiguous (multiple conflicting currencies or none)", () => {
      expect(detectCurrency("Converted USD 100 to EUR 90")).toBeNull();
      expect(detectCurrency("No currency listed: 1500.00")).toBeNull();
    });

    it("lowers confidence score when currency is missing or ambiguous", () => {
      const tmpFile = path.join(os.tmpdir(), `test-inv-ambig-${Date.now()}.txt`);
      // Bare dollar sign gives null currency
      fs.writeFileSync(tmpFile, "Invoice Number: INV-8812 Total Amount: $100.00");

      try {
        const result = extractWithHeuristics(tmpFile, "text/plain", "invoice.txt");
        expect(result.currency).toBeNull();
        // Lower confidence when currency is missing/ambiguous (e.g. 50.0 instead of 78.5)
        expect(result.overallConfidence).toBeLessThan(70.0);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });
  });
});

describe("T-209: PDF Decompression Cap & Zip Bomb Defense", () => {
  it("rejects a stream that exceeds 20 MB maxOutputLength with clean HTTP 422", () => {
    // Construct a synthetic PDF with a compressed FlateDecode stream that expands excessively
    // We create a repetitive 25MB block of bytes and deflate it (compresses down to < 50 KB)
    const largePayload = Buffer.alloc(25 * 1024 * 1024, "A"); // 25 MB
    const compressed = zlib.deflateSync(largePayload);

    // Embed into a PDF stream structure
    const pdfContent = Buffer.concat([
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Length " + compressed.length + " /Filter /FlateDecode >>\nstream\n"),
      compressed,
      Buffer.from("\nendstream\nendobj\n%%EOF"),
    ]);

    expect(() => extractTextFromPdfBuffer(pdfContent)).toThrowError(ApiError);

    try {
      extractTextFromPdfBuffer(pdfContent);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.message).toMatch(/decompression exceeded.*safety limit/i);
    }
  });

  it("rejects a PDF that exceeds the maximum stream count (MAX_STREAM_COUNT)", () => {
    // Create a PDF with 205 tiny compressed streams
    const smallCompressed = zlib.deflateSync(Buffer.from("Hello stream"));
    const streamParts: Buffer[] = [Buffer.from("%PDF-1.4\n")];

    for (let i = 0; i < MAX_STREAM_COUNT + 5; i++) {
      streamParts.push(
        Buffer.from(`obj\nstream\n`),
        smallCompressed,
        Buffer.from(`\nendstream\nendobj\n`)
      );
    }
    streamParts.push(Buffer.from("%%EOF"));

    const multiStreamPdf = Buffer.concat(streamParts);

    try {
      extractTextFromPdfBuffer(multiStreamPdf);
      expect.fail("Should have thrown 422 for stream count");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.message).toMatch(/stream count.*exceeded/i);
    }
  });

  it("extracts normal multi-page PDF content cleanly without error", () => {
    // Normal multi-page PDF with 3 legitimate small compressed text streams
    const page1 = zlib.deflateSync(Buffer.from("(Invoice Number: INV-2026-9901) Tj (Total Amount: 1,500.00 INR) Tj"));
    const page2 = zlib.deflateSync(Buffer.from("(Item 1: Professional Consulting) Tj (Line Amount: 1,500.00) Tj"));

    const normalPdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\n"),
      page1,
      Buffer.from("\nendstream\nendobj\n2 0 obj\n<< /Filter /FlateDecode >>\nstream\n"),
      page2,
      Buffer.from("\nendstream\nendobj\n%%EOF"),
    ]);

    const extracted = extractTextFromPdfBuffer(normalPdf);
    expect(extracted).toContain("INV-2026-9901");
    expect(extracted).toContain("1,500.00");
  });
});
