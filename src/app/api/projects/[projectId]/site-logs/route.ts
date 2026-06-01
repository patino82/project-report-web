import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pushDailyLogToNotion } from "@/lib/notion-sync";

const createLogSchema = z.object({
  content: z.string().min(1),
  author: z.string().min(1),
  date: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const logs = await prisma.siteLog.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const body = await req.json();
    const parsed = createLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { notionId: true },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const logDate = parsed.data.date ? new Date(parsed.data.date) : new Date();

    // Sync to Notion first
    const notionId = await pushDailyLogToNotion({
      projectId,
      notionProjectId: project.notionId,
      content: parsed.data.content,
      author: parsed.data.author,
      date: logDate,
    });

    const log = await prisma.siteLog.create({
      data: {
        projectId,
        notionId,
        content: parsed.data.content,
        author: parsed.data.author,
        date: logDate,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: `Failed to create log: ${(error as Error).message}` }, { status: 500 });
  }
}
