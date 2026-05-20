import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const isDev = process.env.NODE_ENV !== "production";

  const checks = {
    app: "ok",
    database: "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    checks.database = "error";
    // Never leak raw DB/runtime error messages in production.
    // In non-production environments the details remain visible for debugging.
    if (!isDev) {
      (checks as Record<string, unknown>).databaseError = "connection_failure";
    } else {
      (checks as Record<string, unknown>).databaseError = (error as Error).message;
    }
  }

  if (checks.database === "ok") {
    return NextResponse.json({ ok: true, checks });
  }

  return NextResponse.json(
    {
      ok: false,
      checks: (isDev ? checks : { app: checks.app, database: "error", databaseError: "connection_failure" }) as typeof checks,
    },
    { status: 503 },
  );
}
