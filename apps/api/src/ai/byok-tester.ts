export interface ByokTestResult {
  success: boolean;
  provider: "GEMINI" | "OPENAI" | "TEXTRACT";
  latencyMs: number;
  modelsAvailable?: string[];
  message: string;
}

/**
 * Validates customer-supplied BYOK API keys against live provider APIs using native fetch.
 */
export async function testByokApiKey(
  provider: "GEMINI" | "OPENAI" | "TEXTRACT",
  apiKey: string,
  extraConfig?: { awsRegion?: string; awsSecretKey?: string }
): Promise<ByokTestResult> {
  const start = Date.now();

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: false,
      provider,
      latencyMs: 0,
      message: "API key cannot be empty.",
    };
  }

  const cleanKey = apiKey.trim();

  try {
    if (provider === "GEMINI") {
      // Test Google Gemini API Key via models endpoint
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      const latencyMs = Date.now() - start;

      if (response.ok) {
        const data = (await response.json()) as { models?: Array<{ name: string; displayName?: string }> };
        const geminiModels = (data.models || [])
          .map((m) => m.name.replace("models/", ""))
          .filter((name) => name.includes("gemini") || name.includes("flash"));

        return {
          success: true,
          provider: "GEMINI",
          latencyMs,
          modelsAvailable: geminiModels.slice(0, 5),
          message: `Gemini API Key validated in ${latencyMs}ms. Ready for Multimodal Flash extraction.`,
        };
      } else {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        return {
          success: false,
          provider: "GEMINI",
          latencyMs,
          message: errorData.error?.message || `Google API returned HTTP ${response.status} (${response.statusText}).`,
        };
      }
    }

    if (provider === "OPENAI") {
      // Test OpenAI API Key via models list endpoint
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${cleanKey}` },
      });
      const latencyMs = Date.now() - start;

      if (response.ok) {
        const data = (await response.json()) as { data?: Array<{ id: string }> };
        const gptModels = (data.data || [])
          .map((m) => m.id)
          .filter((id) => id.includes("gpt-4"))
          .slice(0, 5);

        return {
          success: true,
          provider: "OPENAI",
          latencyMs,
          modelsAvailable: gptModels,
          message: `OpenAI API Key validated in ${latencyMs}ms. Ready for GPT-4o Vision extraction.`,
        };
      } else {
        return {
          success: false,
          provider: "OPENAI",
          latencyMs,
          message:
            response.status === 401
              ? "Invalid OpenAI API Key. Please verify in platform.openai.com/api-keys."
              : `OpenAI API returned HTTP ${response.status} (${response.statusText}).`,
        };
      }
    }

    if (provider === "TEXTRACT") {
      // Quick format validation for AWS Access Key
      const latencyMs = Date.now() - start;
      if (!cleanKey.startsWith("AKIA") && !cleanKey.startsWith("ASIA")) {
        return {
          success: false,
          provider: "TEXTRACT",
          latencyMs,
          message: "AWS Access Key ID must typically begin with 'AKIA' or 'ASIA'.",
        };
      }

      return {
        success: true,
        provider: "TEXTRACT",
        latencyMs,
        message: "AWS Textract credentials format validated.",
      };
    }

    return {
      success: false,
      provider,
      latencyMs: 0,
      message: `Unsupported provider: ${provider}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      provider,
      latencyMs,
      message: `Network error reaching ${provider} endpoint: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
