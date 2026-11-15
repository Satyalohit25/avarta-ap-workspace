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

  it("does not call OpenAI when tenant specifically configured Gemini BYOK (even if Gemini fails)", async () => {
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

    // Mock global fetch to inspect requests
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        throw new Error("Simulated Gemini quota exceeded");
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

    // Should gracefully fall back to heuristics, never calling OpenAI
    expect(result).toBeDefined();
    expect(result.invoiceNumber).toBeDefined();

    // Verify OpenAI API was never invoked
    const openAiCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("api.openai.com")
    );
    expect(openAiCalls).toHaveLength(0);

    // Verify integration status was marked as ERROR
    expect(IntegrationRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "byok-1",
        status: "ERROR",
      })
    );

    fetchSpy.mockRestore();
  });

  it("does not call Gemini when tenant specifically configured OpenAI BYOK (even if OpenAI fails)", async () => {
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
        throw new Error("Simulated OpenAI rate limit");
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

    // Verify integration status was marked as ERROR
    expect(IntegrationRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "byok-2",
        status: "ERROR",
      })
    );

    fetchSpy.mockRestore();
  });
});
