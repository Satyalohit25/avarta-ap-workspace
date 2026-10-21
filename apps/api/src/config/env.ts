import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    if (process.env.MASTER_DEV_PASSWORD || process.env.MASTER_DEV_EMAIL) {
      throw new Error(
        "FATAL SECURITY VIOLATION: MASTER_DEV_PASSWORD or MASTER_DEV_EMAIL cannot be configured in production environment."
      );
    }
  }
}

validateEnvironment();

const isProd = process.env.NODE_ENV === "production";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required(
    "DATABASE_URL",
    isProd ? undefined : "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=public"
  ),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  appEncryptionKey: required(
    "APP_ENCRYPTION_KEY",
    isProd ? undefined : "avarta-dev-encryption-key-32chars!!"
  ),
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


