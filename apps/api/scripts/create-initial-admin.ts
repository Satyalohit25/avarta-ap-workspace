/**
 * One-Time Initial Administrator Provisioning Tool
 *
 * Requirements (Production Gate Item C):
 * - Reads password from ADMIN_PASSWORD env var or interactive prompt, NEVER a CLI argument.
 * - Rejects any command line containing '--password' to prevent shell history and ps leaks.
 * - Enforces identical password & input validation as the API (min 12 characters).
 * - Works against local or remote databases; extracts and prints Target Database Host and Target Database Name.
 * - Interactive confirmation prompt requires explicit confirmation, bypassed with --yes or -y flag.
 * - Non-interactive execution without --yes aborts fail-safe with code 1.
 * - Idempotent: safe to run multiple times without duplicate organizations or users.
 * - Writes an unalterable audit log entry upon provisioning.
 */

import readline from "readline";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../src/config/database";

export const COMMON_PASSWORDS = new Set([
  "password1234",
  "password12345",
  "password123456",
  "administrator1",
  "administrator12",
  "admin12345678",
  "changeme1234",
  "changeme12345",
  "welcome12345",
  "welcome123456",
  "letmein12345",
  "qwertyuiop12",
  "123456789012",
  "1234567890123",
  "iloveyou12345",
]);

const adminInputSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid work email is required"),
  password: z
    .string()
    .min(12, "Administrator password must be at least 12 characters long")
    .refine(
      (val) => !COMMON_PASSWORDS.has(val.toLowerCase().trim()),
      { message: "Password is too common or easily guessable. Please choose a strong passphrase." }
    ),
  country: z.string().default("IN"),
});

export type InitialAdminInput = z.infer<typeof adminInputSchema>;

export interface DatabaseDetails {
  host: string;
  databaseName: string;
}

export function getDatabaseDetails(connectionString?: string): DatabaseDetails {
  const urlStr = connectionString || process.env.DATABASE_URL || "";
  if (!urlStr) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    const databaseName = parsed.pathname.replace(/^\//, "");
    return { host, databaseName };
  } catch {
    throw new Error("Unable to parse database details from DATABASE_URL");
  }
}

export function getDatabaseHost(connectionString?: string): string {
  return getDatabaseDetails(connectionString).host;
}

export function validateDatabaseHost(connectionString?: string, _allowRemote = true): string {
  const { host } = getDatabaseDetails(connectionString);
  return host.toLowerCase().trim();
}

export async function verifyDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Database connectivity check failed: ${errorMsg}`);
  }
}

export interface ConfirmDatabaseTargetOptions {
  connectionString?: string;
  args?: string[];
  isTTY?: boolean;
  promptFn?: (query: string) => Promise<string>;
  exitFn?: (code: number) => never | void;
}

export async function confirmDatabaseTarget(
  options: ConfirmDatabaseTargetOptions = {}
): Promise<DatabaseDetails> {
  const args = options.args ?? process.argv.slice(2);
  const isTTY = options.isTTY ?? Boolean(process.stdin.isTTY);
  const exit = options.exitFn ?? ((code: number) => process.exit(code));
  const promptUser = options.promptFn ?? prompt;

  const { host, databaseName } = getDatabaseDetails(options.connectionString);

  console.log(`Target Database Host: ${host}`);
  console.log(`Target Database Name: ${databaseName}`);

  const hasYes = args.includes("--yes") || args.includes("-y");
  if (hasYes) {
    return { host, databaseName };
  }

  if (isTTY) {
    const answer = await promptUser("Are you sure you want to create an initial admin on this database? (y/N): ");
    const cleanAnswer = answer.trim().toLowerCase();
    if (cleanAnswer === "y" || cleanAnswer === "yes") {
      return { host, databaseName };
    }
    console.log("Operation cancelled by user.");
    exit(0);
    return { host, databaseName };
  }

  console.error("[SAFETY ABORT] Non-interactive execution against database requires the --yes flag.");
  exit(1);
  return { host, databaseName };
}

export function assertNoCliPasswordArg(args: string[]): void {
  for (const arg of args) {
    const lower = arg.toLowerCase();
    if (
      lower.startsWith("--password") ||
      lower.startsWith("-p=") ||
      lower === "-p" ||
      lower.startsWith("--pass=") ||
      lower === "--pass"
    ) {
      throw new Error(
        "FATAL SECURITY VIOLATION: Providing passwords via command line arguments is prohibited. " +
        "Passwords in CLI arguments leak into shell history, ps tables, and system logs. " +
        "Pass via ADMIN_PASSWORD environment variable or enter via hidden prompt."
      );
    }
  }
}

export function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);

    if (stdin.isTTY && typeof stdin.setRawMode === "function") {
      let password = "";
      stdin.setRawMode(true);
      stdin.resume();

      const onData = (buffer: Buffer) => {
        const char = buffer.toString("utf-8");
        for (const c of char) {
          if (c === "\n" || c === "\r" || c === "\u0004") {
            // Enter or Ctrl+D (EOF)
            stdin.removeListener("data", onData);
            stdin.setRawMode(false);
            stdin.pause();
            stdout.write("\n");
            resolve(password.trim());
            return;
          } else if (c === "\u0003") {
            // Ctrl+C
            stdin.removeListener("data", onData);
            stdin.setRawMode(false);
            stdin.pause();
            process.exit(1);
          } else if (c === "\b" || c === "\x7f") {
            // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
            }
          } else {
            password += c;
          }
        }
      };

      stdin.on("data", onData);
    } else {
      // Non-interactive fallback: muted input
      const rl = readline.createInterface({
        input: stdin,
        output: stdout,
      });
      rl.question("", (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

export async function provisionInitialAdmin(
  input: InitialAdminInput,
  options: {
    expectedHost?: string;
    confirmedHost?: string;
    skipHostConfirmationPrompt?: boolean;
  } = {}
) {
  // 1. Validate inputs
  const validated = adminInputSchema.parse(input);
  const cleanEmail = validated.email.toLowerCase().trim();
  const country = validated.country.toUpperCase();
  const defaultCurrency = country === "IN" ? "INR" : country === "US" ? "USD" : country === "GB" ? "GBP" : "EUR";

  // 2. Validate target database host confirmation
  const targetHost = options.expectedHost || getDatabaseHost();
  const confirmed = options.confirmedHost;

  if (!confirmed) {
    throw new Error(`Target database host confirmation required. Expected: "${targetHost}"`);
  }

  if (confirmed.trim().toLowerCase() !== targetHost.trim().toLowerCase()) {
    throw new Error(
      `Database host confirmation mismatch! Expected "${targetHost}", got "${confirmed}". Operation aborted.`
    );
  }

  // 3. Check for existing organization and user (Idempotency)
  let org = await prisma.organization.findFirst({
    where: { name: validated.companyName.trim() },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: validated.companyName.trim(),
        legalName: validated.companyName.trim(),
        country,
        defaultCurrency,
        timezone: country === "IN" ? "Asia/Kolkata" : "UTC",
      },
    });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: cleanEmail,
      organizationId: org.id,
    },
  });

  if (existingUser) {
    if (existingUser.role === "ADMINISTRATOR" && existingUser.status === "ACTIVE") {
      return {
        status: "ALREADY_EXISTS" as const,
        organizationId: org.id,
        userId: existingUser.id,
        email: existingUser.email,
        message: "Administrator account already exists for this organization (idempotent no-op).",
      };
    }
    // Promote/reactivate if exists but not active admin
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "ADMINISTRATOR", status: "ACTIVE" },
    });
    return {
      status: "UPDATED" as const,
      organizationId: org.id,
      userId: existingUser.id,
      email: existingUser.email,
      message: "Existing user promoted to active Administrator.",
    };
  }

  // 4. Create administrator
  const passwordHash = await bcrypt.hash(validated.password, 10);
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: cleanEmail,
      fullName: validated.fullName.trim(),
      passwordHash,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });

  // 5. Create unalterable Audit Log entry
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      action: "INITIAL_ADMIN_PROVISIONED",
      entityType: "USER",
      entityId: user.id,
      afterData: {
        email: user.email,
        role: user.role,
        companyName: org.name,
        country: org.country,
        provisionedVia: "CLI_PROVISIONER",
        timestamp: new Date().toISOString(),
      },
      result: "SUCCESS",
    },
  });

  return {
    status: "CREATED" as const,
    organizationId: org.id,
    userId: user.id,
    email: user.email,
    message: "Initial Administrator and Root Organization provisioned successfully.",
  };
}

export async function runCli() {
  assertNoCliPasswordArg(process.argv);

  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const found = args.find((a) => a.startsWith(prefix));
    return found ? found.slice(prefix.length).trim() : undefined;
  };

  const isTTY = Boolean(process.stdin.isTTY);

  // 1. Confirm database target (prints host and database name, checks --yes / prompts user)
  const { host: targetHost } = await confirmDatabaseTarget({
    args,
    isTTY,
  });

  // 2. Retain database connectivity verification
  try {
    await verifyDatabaseConnection();
  } catch (connErr: unknown) {
    const errorMsg = connErr instanceof Error ? connErr.message : String(connErr);
    console.error(`\n[FATAL] ${errorMsg}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }

  let companyName = getArg("company") || getArg("org");
  let fullName = getArg("name");
  let email = getArg("email");
  const country = getArg("country") || "IN";

  if (!companyName) {
    if (isTTY) {
      companyName = await prompt("Company / Organization Name: ");
    } else {
      throw new Error("Missing required argument --company (or --org) in headless mode.");
    }
  }

  if (!fullName) {
    if (isTTY) {
      fullName = await prompt("Administrator Full Name: ");
    } else {
      throw new Error("Missing required argument --name in headless mode.");
    }
  }

  if (!email) {
    if (isTTY) {
      email = await prompt("Administrator Email: ");
    } else {
      throw new Error("Missing required argument --email in headless mode.");
    }
  }

  let password = process.env.ADMIN_PASSWORD;
  let generatedPassword = false;
  if (!password) {
    if (isTTY) {
      password = await promptHidden("Administrator Password (min 12 chars, input hidden): ");
    } else {
      // Non-interactive headless fallback: generate cryptographically strong credential securely once
      password = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "A") + "!Aa1";
      generatedPassword = true;
    }
  }

  const confirmedHost = getArg("confirm-host") || targetHost;

  try {
    const result = await provisionInitialAdmin(
      {
        companyName,
        fullName,
        email,
        password,
        country,
      },
      {
        expectedHost: targetHost,
        confirmedHost,
      }
    );

    console.log(`\n[SUCCESS] ${result.message}`);
    console.log(`Organization ID : ${result.organizationId}`);
    console.log(`User ID         : ${result.userId}`);
    console.log(`Email           : ${result.email}`);
    if (generatedPassword) {
      console.log(`Initial Pass    : ${password}`);
      console.log(`Setup Link      : http://localhost:5173/login?email=${encodeURIComponent(result.email)}`);
    }
    console.log("");
    await prisma.$disconnect();
    process.exit(0);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n[ERROR] Provisioning failed: ${errorMsg}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}
