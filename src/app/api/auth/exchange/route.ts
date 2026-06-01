import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { getAmplitudeClient, flushAmplitude } from "@/lib/amplitude-server";
import { corsResponse, corsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  let idToken = body?.id_token;
  const code = body?.code;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) return corsResponse(NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 }));

  const client = new OAuth2Client(clientId, clientSecret);

  // If we received a code (from web/hybrid flow), exchange it for an id_token first
  if (code) {
    try {
      // The redirect_uri must match EXACTLY what was sent by the frontend
      const redirectUri = body?.redirect_uri || 'http://localhost:8081/';
      const { tokens } = await client.getToken({
        code,
        redirect_uri: redirectUri,
      });
      idToken = tokens.id_token;
    } catch (err: any) {
      console.error("Code exchange failed", err);
      return corsResponse(NextResponse.json({ error: "failed to exchange code", details: err.message }, { status: 401 }));
    }
  }

  if (!idToken) return corsResponse(NextResponse.json({ error: "id_token or code required" }, { status: 400 }));

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: clientId });
  } catch (err) {
    console.error("Token verification failed", err);
    return corsResponse(NextResponse.json({ error: "invalid id_token" }, { status: 401 }));
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) return corsResponse(NextResponse.json({ error: "invalid token payload" }, { status: 400 }));

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

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return corsResponse(NextResponse.json({ error: "NEXTAUTH_SECRET not configured" }, { status: 500 }));

  // Issue a signed JWT for the app session
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: "7d" });

  const isNewUser = !user.createdAt || (Date.now() - new Date(user.createdAt).getTime() < 5000);
  const amp = getAmplitudeClient();
  if (amp) {
    amp.track("User Logged In", { is_new_user: isNewUser, source: "mobile" }, { user_id: user.id });
    await flushAmplitude();
  }

  return corsResponse(NextResponse.json({ ok: true, token }));
}
