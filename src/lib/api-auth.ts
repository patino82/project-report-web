import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getToken } from "next-auth/jwt";

export type AuthResult =
  | { ok: true; userId: string; role: string; email: string }
  | { ok: false; response: NextResponse };

async function verifyBearerToken(
  request: NextRequest,
  secret: string,
): Promise<{ userId: string; role: string; email: string } | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    const userId = payload.sub ?? (payload.userId as string | undefined);
    const role = (payload.role as string | undefined) ?? "user";
    const email = (payload.email as string | undefined) ?? "";
    if (!userId) return null;
    return { userId, role, email };
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest,
): Promise<AuthResult> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("[api-auth] NEXTAUTH_SECRET not configured");
    return { ok: false, response: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }

  // 1) Try Bearer token first (mobile clients)
  const bearer = await verifyBearerToken(request, secret);
  if (bearer) {
    return { ok: true, userId: bearer.userId, role: bearer.role, email: bearer.email };
  }

  // 2) Try NextAuth session cookie (web clients)
  const sessionToken = await getToken({ req: request, secret });
  if (sessionToken) {
    const userId = sessionToken.sub ?? (sessionToken.id as string | undefined);
    const role = (sessionToken.role as string | undefined) ?? "user";
    const email = (sessionToken.email as string | undefined) ?? "";
    if (userId) {
      return { ok: true, userId, role, email };
    }
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    ),
  };
}

/**
 * Optionally check that the authenticated user belongs to a
 * configured email-domain allowlist.  Skipped when the env var
 * is not set (backward-compatible / dev mode).
 */
export function checkDomainAllowlist(
  email: string,
): NextResponse | null {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS;
  if (!raw) return null; // no allowlist → allow all

  const domains = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain || !domains.includes(emailDomain)) {
    return NextResponse.json(
      { error: "Domain not authorized" },
      { status: 403 },
    );
  }

  return null;
}
