import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthTokenPayload {
  userId: string;
  organizationId: string;
  role: string;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
