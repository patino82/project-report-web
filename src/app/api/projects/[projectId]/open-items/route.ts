import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pushOpenItemToNotion } from "@/lib/notion-sync";

const createItemSchema = z.object({
  description: z.string().min(1),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  dueDate: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const items = await prisma.openItem.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load open items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { notionId: true },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

    // Sync to Notion first
    const notionId = await pushOpenItemToNotion({
      projectId,
      notionProjectId: project.notionId,
      description: parsed.data.description,
      priority: parsed.data.priority ?? "Medium",
      dueDate,
    });

    const item = await prisma.openItem.create({
      data: {
        projectId,
        notionId,
        description: parsed.data.description,
        priority: parsed.data.priority ?? "Medium",
        dueDate,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: `Failed to create item: ${(error as Error).message}` }, { status: 500 });
  }
}
