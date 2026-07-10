import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "ah_session";
const SESSION_DAYS = 7;

export type Session = {
  userId: number;
  businessId: number;
};

function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? "alwayshere-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ uid: session.userId, bid: session.businessId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(sessionSecret());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (typeof payload.uid !== "number" || typeof payload.bid !== "number") return null;
    return { userId: payload.uid, businessId: payload.bid };
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: Session): Promise<void> {
  const token = await createSessionToken(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** For pages/actions that require a signed-in owner. Redirects to /login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
