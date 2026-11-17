import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractInvoiceFromFile } from "./extractor";
import { IntegrationRepository } from "../modules/integrations/repository";
import { encryptSecret } from "../lib/crypto";
import fs from "fs";

vi.mock("../modules/integrations/repository", () => ({
  IntegrationRepository: {
    findByType: vi.fn(),
    upsert: vi.fn(),
  },
}));

describe("BYOK Provider Isolation & Non-Cross-Fallback (F2 Verification)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = "platform-gemini-key";
    process.env.OPENAI_API_KEY = "platform-openai-key";
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("dummy pdf content"));
  });

  it("does not call OpenAI when tenant configured Gemini BYOK (even on transient failure)", async () => {
    const tenantOrgId = "org-gemini-tenant";
    vi.mocked(IntegrationRepository.findByType).mockResolvedValue([
      {
        id: "byok-1",
        organizationId: tenantOrgId,
        type: "BYOK_AI",
        provider: "GEMINI",
        encryptedConfig: encryptSecret("tenant-gemini-key-123"),
        status: "CONNECTED",
      },
    ] as any);

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        throw new Error("Simulated Gemini quota exceeded (rate limit 429)");
      }
      if (urlStr.includes("api.openai.com")) {
        throw new Error("SHOULD_NOT_BE_CALLED: Cross-provider platform key leaked!");
      }
      return new Response("{}", { status: 200 });
    });

    const result = await extractInvoiceFromFile(
      "/fake/path/invoice.pdf",
      "application/pdf",
      "invoice.pdf",
      tenantOrgId
    );

    expect(result).toBeDefined();
    expect(result.invoiceNumber).toBeDefined();

    // Verify OpenAI API was never invoked
    const openAiCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("api.openai.com")
    );
    expect(openAiCalls).toHaveLength(0);

    // Transient failure must NOT mark connector as ERROR
    expect(IntegrationRepository.upsert).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("does not call Gemini when tenant configured OpenAI BYOK (even on transient failure)", async () => {
    const tenantOrgId = "org-openai-tenant";
    vi.mocked(IntegrationRepository.findByType).mockResolvedValue([
      {
        id: "byok-2",
        organizationId: tenantOrgId,
        type: "BYOK_AI",
        provider: "OPENAI",
        encryptedConfig: encryptSecret("tenant-openai-key-456"),
        status: "CONNECTED",
      },
    ] as any);

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("api.openai.com")) {
        throw new Error("Simulated OpenAI rate limit (429)");
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        throw new Error("SHOULD_NOT_BE_CALLED: Cross-provider platform key leaked!");
      }
      return new Response("{}", { status: 200 });
    });

    const result = await extractInvoiceFromFile(
      "/fake/path/invoice.png",
      "image/png",
      "invoice.png",
      tenantOrgId
    );

    expect(result).toBeDefined();

    // Verify Gemini API was never invoked
    const geminiCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("generativelanguage.googleapis.com")
    );
    expect(geminiCalls).toHaveLength(0);

    // Transient failure must NOT mark connector as ERROR
    expect(IntegrationRepository.upsert).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("marks BYOK as ERROR on authentication failure (401/403/invalid key)", async () => {
    const tenantOrgId = "org-gemini-bad-key";
    vi.mocked(IntegrationRepository.findByType).mockResolvedValue([
      {
        id: "byok-3",
        organizationId: tenantOrgId,
        type: "BYOK_AI",
        provider: "GEMINI",
        encryptedConfig: encryptSecret("invalid-key"),
        status: "CONNECTED",
      },
    ] as any);

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        throw new Error("Gemini API returned HTTP 401: Unauthorized API key");
      }
      return new Response("{}", { status: 200 });
    });

    const result = await extractInvoiceFromFile(
      "/fake/path/invoice.pdf",
      "application/pdf",
      "invoice.pdf",
      tenantOrgId
    );

    expect(result).toBeDefined();

    // Authentication failure SHOULD mark connector as ERROR
    expect(IntegrationRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "byok-3",
        status: "ERROR",
      })
    );

    fetchSpy.mockRestore();
  });

  it("never falls back to platform keys when tenant BYOK is in ERROR status", async () => {
    const tenantOrgId = "org-error-status-tenant";
    // BYOK connector was already marked ERROR from a previous failure
    vi.mocked(IntegrationRepository.findByType).mockResolvedValue([
      {
        id: "byok-4",
        organizationId: tenantOrgId,
        type: "BYOK_AI",
        provider: "GEMINI",
        encryptedConfig: encryptSecret("bad-key"),
        status: "ERROR",
      },
    ] as any);

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async () => {
      throw new Error("SHOULD_NOT_BE_CALLED: Platform key was used for a BYOK tenant in ERROR state!");
    });

    const result = await extractInvoiceFromFile(
      "/fake/path/invoice.pdf",
      "application/pdf",
      "invoice.pdf",
      tenantOrgId
    );

    // Should gracefully fall back to heuristics without calling any external API
    expect(result).toBeDefined();
    expect(result.extractionProvider).toBe("HEURISTIC_PARSER");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
