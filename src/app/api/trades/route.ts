import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
}
