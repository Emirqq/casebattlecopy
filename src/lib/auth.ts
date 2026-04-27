import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "cb_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getCurrentUser() {
  const c = cookies();
  const userId = c.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function setSessionCookie(userId: string) {
  cookies().set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}
