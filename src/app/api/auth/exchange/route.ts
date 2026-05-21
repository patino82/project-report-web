import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";
import { PrismaAdapter } from "@auth/prisma-adapter";
import jwt from "jsonwebtoken";

// POST /api/auth/exchange
// Accepts { id_token } from mobile clients and exchanges/verifies it with Google.
// If the request originates from the same origin as NEXTAUTH_URL, this endpoint
// will set the NextAuth session cookie (via server-side adapter signIn flow).
// For mobile clients, it returns a signed JWT in JSON so the client can store it.
// Note: CORS and credentials handling should be configured at the edge or via
// middleware depending on your deployment. This handler intentionally keeps
// cookie handling explicit; allowCredentials: true and appropriate CORS headers
// may be required for cross-origin web flows.

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const idToken = body?.id_token;
  if (!idToken) return NextResponse.json({ error: "id_token required" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });

  const client = new OAuth2Client(clientId);
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: clientId });
  } catch (err) {
    return NextResponse.json({ error: "invalid id_token" }, { status: 401 });
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) return NextResponse.json({ error: "invalid token payload" }, { status: 400 });

  // Find or create user via Prisma
  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name || undefined,
        image: payload.picture || undefined,
      },
    });
  }

  // For same-origin web flows, prefer setting a cookie-based session.
  const nextauthUrl = process.env.NEXTAUTH_URL;
  const isSameOrigin = nextauthUrl && nextauthUrl.startsWith("http") && new URL(nextauthUrl).origin === new URL(request.url).origin;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "NEXTAUTH_SECRET not configured" }, { status: 500 });

  // Issue a signed JWT (suitable for mobile). Payload includes minimal claims.
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: "7d" });

  if (isSameOrigin) {
    // If same-origin, set a cookie compatible with NextAuth's session cookie naming.
    // NextAuth sets a cookie named `next-auth.session-token` when using JWT strategy
    // in some configurations; to be robust, we set `next-auth.session-token` here.
    const res = NextResponse.json({ ok: true });
    res.cookies.set("next-auth.session-token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  // Otherwise return the signed JWT so mobile can store it.
  return NextResponse.json({ ok: true, token });
}
