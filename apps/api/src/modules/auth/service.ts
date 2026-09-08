import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { signAccessToken } from "../../lib/jwt";
import { env } from "../../config/env";

export async function login(email: string, password: string) {
  const cleanEmail = email.toLowerCase().trim();
  const alternateEmail = cleanEmail.endsWith("@avarta.dev")
    ? cleanEmail.replace("@avarta.dev", "@clearops.dev")
    : cleanEmail.endsWith("@clearops.dev")
    ? cleanEmail.replace("@clearops.dev", "@avarta.dev")
    : cleanEmail;

  const user = await prisma.user.findFirst({
    where: {
      email: { in: [cleanEmail, alternateEmail] },
      status: "ACTIVE",
    },
  });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const accessToken = signAccessToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.fullName,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    },
    accessToken,
    expiresIn: env.jwtExpiresIn,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
  };
}
