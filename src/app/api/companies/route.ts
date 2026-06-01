import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const companySchema = z.object({
  name: z.string().min(1),
});

const contactSchema = z.object({
  company: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const tradeMapSchema = z.object({
  company: z.string().min(1),
  trade: z.string().min(1),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function GET() {
  const companies = await prisma.company.findMany({
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      trades: { include: { trade: true }, orderBy: [{ isPrimary: "desc" }] },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode as string | undefined;

    if (mode === "company") {
      const parsed = companySchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      const company = await (prisma.company as any).upsert({
        where: { name: parsed.data.name },
        create: { name: parsed.data.name },
        update: {},
      });
      return NextResponse.json({ company });
    }

    if (mode === "contact") {
      const parsed = contactSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

      const company = await (prisma.company as any).upsert({ where: { name: parsed.data.company }, create: { name: parsed.data.company }, update: {} });
      const contact = await prisma.contact.create({
        data: {
          companyId: company.id,
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email || null,
          role: parsed.data.role,
          isPrimary: parsed.data.isPrimary,
        },
      });
      return NextResponse.json({ contact }, { status: 201 });
    }

    if (mode === "tradeMap") {
      const parsed = tradeMapSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

      const [company, trade] = await Promise.all([
        (prisma.company as any).upsert({ where: { name: parsed.data.company }, create: { name: parsed.data.company }, update: {} }),
        (prisma.trade as any).upsert({ where: { name: parsed.data.trade }, create: { name: parsed.data.trade }, update: {} }),
      ]);

      const map = await prisma.companyTradeMap.upsert({
        where: { companyId_tradeId: { companyId: company.id, tradeId: trade.id } },
        create: {
          companyId: company.id,
          tradeId: trade.id,
          isPrimary: parsed.data.isPrimary,
          notes: parsed.data.notes,
        },
        update: {
          isPrimary: parsed.data.isPrimary,
          notes: parsed.data.notes,
        },
      });

      return NextResponse.json({ map });
    }

    return NextResponse.json({ error: "Unsupported mode. Use: company, contact, tradeMap" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: `Failed company op: ${(error as Error).message}` }, { status: 500 });
  }
}
