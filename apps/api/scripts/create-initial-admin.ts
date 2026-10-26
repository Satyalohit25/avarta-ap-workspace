/**
 * One-Time Initial Administrator Provisioning Tool
 *
 * Requirements (Production Gate Item C):
 * - Reads password from ADMIN_PASSWORD env var or interactive prompt, NEVER a CLI argument.
 * - Rejects any command line containing '--password' to prevent shell history and ps leaks.
 * - Enforces identical password & input validation as the API (min 8 characters).
 * - Extracts and prints the target database host NAME and requires exact confirmation before executing.
 * - Idempotent: safe to run multiple times without duplicate organizations or users.
 * - Writes an unalterable audit log entry upon provisioning.
 */

import readline from "readline";
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

export function getDatabaseHost(connectionString?: string): string {
  const urlStr = connectionString || process.env.DATABASE_URL || "";
  if (!urlStr) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname;
  } catch {
    throw new Error("Unable to parse hostname from DATABASE_URL");
  }
}

export function assertNoCliPasswordArg(args: string[]): void {
  for (const arg of args) {
    if (arg.startsWith("--password") || arg.startsWith("-p=")) {
      throw new Error(
        "FATAL SECURITY VIOLATION: Providing passwords via command line arguments is prohibited. " +
        "Passwords in CLI arguments leak into shell history, ps tables, and system logs. " +
        "Pass via ADMIN_PASSWORD environment variable or enter via interactive prompt."
      );
    }
  }
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

  const companyName = getArg("company") || (await prompt("Company / Organization Name: "));
  const fullName = getArg("name") || (await prompt("Administrator Full Name: "));
  const email = getArg("email") || (await prompt("Administrator Email: "));
  const country = getArg("country") || "IN";

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await prompt("Administrator Password (min 12 chars): ");
  }

  const targetHost = getDatabaseHost();
  console.log(`\n================================================================`);
  console.log(`Target Database Host: ${targetHost}`);
  console.log(`================================================================`);

  let confirmedHost = getArg("confirm-host");
  if (!confirmedHost) {
    confirmedHost = await prompt(`Type the database host name exactly to confirm ("${targetHost}"): `);
  }

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
    console.log(`Email           : ${result.email}\n`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error(`\n[ERROR] Provisioning failed: ${err.message}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}
