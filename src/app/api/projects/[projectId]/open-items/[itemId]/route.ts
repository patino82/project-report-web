import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { corsResponse, corsOptions } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api-auth";

const updateItemSchema = z.object({
  description: z.string().min(1).optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  dueDate: z.string().optional().nullable(),
  status: z.string().optional(),
});

export async function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string; itemId: string }> }) {
  const { projectId, itemId } = await params;
  const auth = await requireAuth(req);
  if (!auth.ok) return (auth as any).response;

  try {
    const item = await prisma.openItem.findFirst({
      where: { id: itemId, projectId },
    });
    if (!item) return corsResponse(req, NextResponse.json({ error: "Item not found" }, { status: 404 }));
    return corsResponse(req, NextResponse.json({ item }));
  } catch (error) {
    console.error("[api/open-items/:id] GET error:", error);
    return corsResponse(req, NextResponse.json({ error: "Failed to load item" }, { status: 500 }));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string; itemId: string }> }) {
  const { projectId, itemId } = await params;
  const auth = await requireAuth(req);
  if (!auth.ok) return (auth as any).response;
  const limited = rateLimit(req);
  if (limited) return corsResponse(req, limited);

  try {
    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return corsResponse(req, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
    }

    const existing = await prisma.openItem.findFirst({ where: { id: itemId, projectId } });
    if (!existing) return corsResponse(req, NextResponse.json({ error: "Item not found" }, { status: 404 }));

    const data: Record<string, unknown> = {};
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

    const item = await prisma.openItem.update({
      where: { id: itemId },
      data,
    });
    return corsResponse(req, NextResponse.json({ item }));
  } catch (error) {
    console.error("[api/open-items/:id] PATCH error:", error);
    return corsResponse(req, NextResponse.json({ error: "Failed to update item" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; itemId: string }> }) {
  const { projectId, itemId } = await params;
  const auth = await requireAuth(req);
  if (!auth.ok) return (auth as any).response;
  const limited = rateLimit(req);
  if (limited) return corsResponse(req, limited);

  try {
    const existing = await prisma.openItem.findFirst({ where: { id: itemId, projectId } });
    if (!existing) return corsResponse(req, NextResponse.json({ error: "Item not found" }, { status: 404 }));

    await prisma.openItem.delete({ where: { id: itemId } });
    return corsResponse(req, NextResponse.json({ ok: true }));
  } catch (error) {
    console.error("[api/open-items/:id] DELETE error:", error);
    return corsResponse(req, NextResponse.json({ error: "Failed to delete item" }, { status: 500 }));
  }
}
