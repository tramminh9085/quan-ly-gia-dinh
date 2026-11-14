import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "to-am-so-secret-key-2026-family-hub"
);

export const SESSION_COOKIE_NAME = "giadinh_session";

export interface SessionUser {
  id: number;
  username: string;
  fullName: string;
  roleLabel: string;
  isAdmin: boolean;
  avatarColor: string;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const username = String(payload.username);
    return {
      id: Number(payload.id),
      username,
      fullName: String(payload.fullName),
      roleLabel: String(payload.roleLabel || "Thành viên"),
      isAdmin: Boolean(payload.isAdmin) || username === "bominh",
      avatarColor: String(payload.avatarColor || "#2563EB"),
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
