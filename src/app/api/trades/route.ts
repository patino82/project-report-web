import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return (auth as any).response;

  try {
    const trades = await prisma.trade.findMany({
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("[api/trades] GET error:", error);
    return NextResponse.json({ error: "Failed to load trades" }, { status: 500 });
  }
}
