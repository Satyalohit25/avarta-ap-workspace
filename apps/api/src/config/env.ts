import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
