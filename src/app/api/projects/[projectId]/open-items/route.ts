import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncOpenItemToNotionInBackground } from "@/lib/notion-sync";
import { corsResponse, corsOptions } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";

const createItemSchema = z.object({
  description: z.string().min(1),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  dueDate: z.string().optional(),
});

export async function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const items = await prisma.openItem.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return corsResponse(_req, NextResponse.json({ items }));
  } catch (error) {
    return corsResponse(_req, NextResponse.json({ error: "Failed to load open items" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const limited = rateLimit(req);
  if (limited) return corsResponse(req, limited);

  try {
    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return corsResponse(req, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { notionId: true },
    });

    if (!project) return corsResponse(req, NextResponse.json({ error: "Project not found" }, { status: 404 }));

    const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

    const item = await prisma.openItem.create({
      data: {
        projectId,
        notionId: null,
        description: parsed.data.description,
        priority: parsed.data.priority ?? "Medium",
        dueDate,
      },
    });

    syncOpenItemToNotionInBackground({
      id: item.id,
      projectId,
      notionProjectId: project.notionId,
      description: parsed.data.description,
      priority: parsed.data.priority ?? "Medium",
      dueDate,
    });

    return corsResponse(req, NextResponse.json({ item }, { status: 201 }));
  } catch (error) {
    return corsResponse(req, NextResponse.json({ error: `Failed to create item: ${(error as Error).message}` }, { status: 500 }));
  }
}
