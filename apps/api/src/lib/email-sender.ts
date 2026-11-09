import nodemailer from "nodemailer";

export type EmailProvider = "SMTP" | "RESEND" | "SENDGRID" | "POSTMARK" | "MAILGUN";

export interface EmailConfig {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  apiKey?: string;
  /** Mailgun sending domain, e.g. mg.example.com */
  domain?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  provider: EmailProvider;
  latencyMs: number;
  message: string;
  messageId?: string;
}

const TEST_TIMEOUT_MS = 15_000;

function assertConfig(config: EmailConfig): string | null {
  if (!config.fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.fromEmail)) {
    return "A valid sender email address is required.";
  }
  if (!config.provider) return "Email provider is required.";

  switch (config.provider) {
    case "SMTP":
      if (!config.smtpHost) return "SMTP host is required.";
      if (!config.smtpPort || config.smtpPort < 1 || config.smtpPort > 65535) {
        return "A valid SMTP port is required.";
      }
      if (!config.smtpUser || !config.smtpPassword) {
        return "SMTP username and password are required.";
      }
      return null;
    case "RESEND":
    case "SENDGRID":
    case "POSTMARK":
      if (!config.apiKey) return `${config.provider} API key is required.`;
      return null;
    case "MAILGUN":
      if (!config.apiKey) return "Mailgun API key is required.";
      if (!config.domain) return "Mailgun sending domain is required.";
      return null;
    default:
      return "Unsupported email provider.";
  }
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error("Email provider timed out.")), TEST_TIMEOUT_MS)
    ),
  ]);
}

async function sendViaSmtp(config: EmailConfig, message: EmailMessage) {
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure === true,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
    connectionTimeout: TEST_TIMEOUT_MS,
    greetingTimeout: TEST_TIMEOUT_MS,
    socketTimeout: TEST_TIMEOUT_MS,
  });

  const info = await transport.sendMail({
    from: config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail,
    replyTo: config.replyTo || undefined,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return info.messageId as string | undefined;
}

async function sendViaResend(config: EmailConfig, message: EmailMessage) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromName
        ? `${config.fromName} <${config.fromEmail}>`
        : config.fromEmail,
      reply_to: config.replyTo || undefined,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(body.message || `Resend returned HTTP ${res.status}`);
  return body.id;
}

async function sendViaSendGrid(config: EmailConfig, message: EmailMessage) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: message.to }] }],
      from: {
        email: config.fromEmail,
        name: config.fromName || undefined,
      },
      reply_to: config.replyTo ? { email: config.replyTo } : undefined,
      subject: message.subject,
      content: [
        { type: "text/plain", value: message.text },
        ...(message.html ? [{ type: "text/html", value: message.html }] : []),
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`SendGrid returned HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.headers.get("x-message-id") || undefined;
}

async function sendViaPostmark(config: EmailConfig, message: EmailMessage) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": config.apiKey as string,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: config.fromName
        ? `${config.fromName} <${config.fromEmail}>`
        : config.fromEmail,
      ReplyTo: config.replyTo || undefined,
      To: message.to,
      Subject: message.subject,
      TextBody: message.text,
      HtmlBody: message.html,
      MessageStream: "outbound",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    MessageID?: string;
    Message?: string;
  };
  if (!res.ok) throw new Error(body.Message || `Postmark returned HTTP ${res.status}`);
  return body.MessageID;
}

async function sendViaMailgun(config: EmailConfig, message: EmailMessage) {
  const form = new URLSearchParams();
  form.set("from", config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail);
  form.set("to", message.to);
  form.set("subject", message.subject);
  form.set("text", message.text);
  if (message.html) form.set("html", message.html);
  if (config.replyTo) form.set("h:Reply-To", config.replyTo);

  const res = await fetch(
    `https://api.mailgun.net/v3/${encodeURIComponent(config.domain as string)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    }
  );
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(body.message || `Mailgun returned HTTP ${res.status}`);
  return body.id;
}

async function dispatch(config: EmailConfig, message: EmailMessage) {
  switch (config.provider) {
    case "SMTP":
      return sendViaSmtp(config, message);
    case "RESEND":
      return sendViaResend(config, message);
    case "SENDGRID":
      return sendViaSendGrid(config, message);
    case "POSTMARK":
      return sendViaPostmark(config, message);
    case "MAILGUN":
      return sendViaMailgun(config, message);
    default:
      throw new Error("Unsupported email provider.");
  }
}

/**
 * Sends a real email. Used both by the connector test and by transactional
 * flows (invitations, password resets, notifications). Thin wrapper so callers
 * get consistent error handling and latency metrics.
 */
export async function sendEmail(
  config: EmailConfig,
  message: EmailMessage
): Promise<EmailDispatchResult> {
  const invalid = assertConfig(config);
  if (invalid) {
    return {
      success: false,
      provider: config.provider,
      latencyMs: 0,
      message: invalid,
    };
  }

  const startedAt = Date.now();
  try {
    const messageId = await withTimeout(dispatch(config, message));
    return {
      success: true,
      provider: config.provider,
      latencyMs: Date.now() - startedAt,
      message: `Email delivered to ${message.to} via ${config.provider}.`,
      messageId,
    };
  } catch (err) {
    return {
      success: false,
      provider: config.provider,
      latencyMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : "Email delivery failed.",
    };
  }
}

export async function testEmailConnection(
  config: EmailConfig,
  testRecipient?: string
): Promise<EmailDispatchResult> {
  const invalid = assertConfig(config);
  if (invalid) {
    return {
      success: false,
      provider: config.provider,
      latencyMs: 0,
      message: invalid,
    };
  }

  if (config.provider === "SMTP") {
    const startedAt = Date.now();
    try {
      const transport = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure === true,
        auth: { user: config.smtpUser, pass: config.smtpPassword },
        connectionTimeout: TEST_TIMEOUT_MS,
        greetingTimeout: TEST_TIMEOUT_MS,
        socketTimeout: TEST_TIMEOUT_MS,
      });
      await withTimeout(transport.verify());
      return {
        success: true,
        provider: config.provider,
        latencyMs: Date.now() - startedAt,
        message: "SMTP connection verified. Credentials are valid.",
      };
    } catch (err) {
      return {
        success: false,
        provider: config.provider,
        latencyMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : "SMTP verification failed.",
      };
    }
  }

  return sendEmail(config, {
    to: testRecipient || config.fromEmail,
    subject: "Avarta AP Workspace — email connector test",
    text: "This is a test message confirming your email connector is configured correctly.",
    html: "<p>This is a test message confirming your email connector is configured correctly.</p>",
  });
}
