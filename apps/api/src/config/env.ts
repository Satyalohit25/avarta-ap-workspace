import "dotenv/config";

export function validateEnvironment(): void {
  const isProd = process.env.NODE_ENV === "production";
  const missingOrInvalid: string[] = [];

  // Required in production
  if (isProd) {
    if (!process.env.DATABASE_URL) {
      missingOrInvalid.push("DATABASE_URL is required in production");
    } else {
      // In production Neon, warn if connection pooling flags are missing
      if (!process.env.DATABASE_URL.includes("pgbouncer=true") && !process.env.DATABASE_URL.includes("pooler")) {
        console.warn(
          "[ENV WARNING] DATABASE_URL does not appear to use a Neon pooled connection. " +
          "Ensure '?sslmode=require&pgbouncer=true&connection_limit=10' is configured to prevent connection starvation."
        );
      }
    }

    if (!process.env.DIRECT_URL) {
      missingOrInvalid.push(
        "DIRECT_URL is required in production (unpooled direct endpoint for migrations and advisory locks)"
      );
    }

    if (!process.env.JWT_SECRET) {
      missingOrInvalid.push("JWT_SECRET is required in production");
    }

    if (!process.env.APP_ENCRYPTION_KEY) {
      missingOrInvalid.push("APP_ENCRYPTION_KEY is required in production");
    }

    if (!process.env.WEB_ORIGIN) {
      missingOrInvalid.push("WEB_ORIGIN is required in production");
    }

    if (process.env.MASTER_DEV_PASSWORD || process.env.MASTER_DEV_EMAIL) {
      missingOrInvalid.push(
        "FATAL SECURITY VIOLATION: MASTER_DEV_PASSWORD or MASTER_DEV_EMAIL cannot be configured in production environment."
      );
    }
  }

  // Strict 64-Hex Character Validation for APP_ENCRYPTION_KEY (if present or in production)
  const key = process.env.APP_ENCRYPTION_KEY ?? (isProd ? undefined : "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
  if (key) {
    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      missingOrInvalid.push(
        `APP_ENCRYPTION_KEY format invalid. Expected exactly 64 hexadecimal characters (32 raw bytes) ` +
        `(generate via node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"). Current length: ${key.length}`
      );
    }
  }

  if (missingOrInvalid.length > 0) {
    throw new Error(
      `FATAL BOOT CONFIGURATION ERROR: Missing or invalid required environment variables:\n  - ${missingOrInvalid.join("\n  - ")}`
    );
  }
}

validateEnvironment();

const isProd = process.env.NODE_ENV === "production";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    (isProd ? "" : "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=public"),
  directUrl:
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL ??
    (isProd ? "" : "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=public"),
  jwtSecret: process.env.JWT_SECRET ?? (isProd ? "" : "dev-secret-change-me"),
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  appEncryptionKey:
    process.env.APP_ENCRYPTION_KEY ??
    (isProd ? "" : "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  get masterDevEmail(): string | undefined {
    return process.env.NODE_ENV === "development"
      ? (process.env.MASTER_DEV_EMAIL ?? "dev@avarta.local")
      : undefined;
  },
  get masterDevPassword(): string | undefined {
    return process.env.NODE_ENV === "development"
      ? (process.env.MASTER_DEV_PASSWORD ?? "devpassword123")
      : undefined;
  },
  get nodeEnv(): string | undefined {
    return process.env.NODE_ENV;
  },
};
