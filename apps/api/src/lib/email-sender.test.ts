import { describe, expect, it } from "vitest";
import { sendEmail, testEmailConnection } from "./email-sender";
import { IntegrationsService } from "../modules/integrations/service";

describe("Email sender", () => {
  it("rejects an invalid sender address without calling a provider", async () => {
    const result = await sendEmail(
      {
        provider: "SMTP",
        fromName: "Finance",
        fromEmail: "not-an-email",
        smtpHost: "smtp.example.com",
        smtpPort: 587,
        smtpUser: "user",
        smtpPassword: "secret",
      },
      { to: "ap@example.com", subject: "Test", text: "Hello" }
    );

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/valid sender email/i);
    expect(result.latencyMs).toBe(0);
  });

  it("requires SMTP credentials before connecting", async () => {
    const result = await testEmailConnection({
      provider: "SMTP",
      fromName: "Finance",
      fromEmail: "ap@example.com",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/username and password/i);
  });

  it("requires a Mailgun sending domain", async () => {
    const result = await sendEmail(
      {
        provider: "MAILGUN",
        fromName: "Finance",
        fromEmail: "ap@example.com",
        apiKey: "key-123",
      },
      { to: "ap@example.com", subject: "Test", text: "Hello" }
    );

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/sending domain/i);
  });

  it("reports that no email was sent when the tenant has no connector", async () => {
    const result = await IntegrationsService.sendTransactionalEmail(
      "org-without-email-connector",
      { to: "ap@example.com", subject: "Test", text: "Hello" }
    );

    expect(result.sent).toBe(false);
    expect(result.reason).toMatch(/no email connector/i);
  });

  it("strictly rejects loopback and private IP addresses as SMTP host (B7 SSRF Protection)", async () => {
    const loopbackResult = await testEmailConnection({
      provider: "SMTP",
      fromName: "Finance",
      fromEmail: "ap@example.com",
      smtpHost: "127.0.0.1",
      smtpPort: 25,
      smtpUser: "user",
      smtpPassword: "password",
    });

    expect(loopbackResult.success).toBe(false);
    expect(loopbackResult.message).toContain("SSRF Guard Rejection");
    expect(loopbackResult.message).toContain("Loopback address prohibited");

    const localhostResult = await testEmailConnection({
      provider: "SMTP",
      fromName: "Finance",
      fromEmail: "ap@example.com",
      smtpHost: "localhost",
      smtpPort: 25,
      smtpUser: "user",
      smtpPassword: "password",
    });

    expect(localhostResult.success).toBe(false);
    expect(localhostResult.message).toContain("SSRF Guard Rejection");

    const metadataResult = await testEmailConnection({
      provider: "SMTP",
      fromName: "Finance",
      fromEmail: "ap@example.com",
      smtpHost: "169.254.169.254",
      smtpPort: 25,
      smtpUser: "user",
      smtpPassword: "password",
    });

    expect(metadataResult.success).toBe(false);
    expect(metadataResult.message).toContain("SSRF Guard Rejection");
    expect(metadataResult.message).toContain("metadata");
  });
});
