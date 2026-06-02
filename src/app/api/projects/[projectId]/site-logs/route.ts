import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncDailyLogToNotionInBackground } from "@/lib/notion-sync";
import { corsResponse, corsOptions } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";

const createLogSchema = z.object({
  content: z.string().min(1),
  author: z.string().min(1),
  date: z.string().optional(),
});

export async function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const logs = await prisma.siteLog.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
    });
    return corsResponse(_req, NextResponse.json({ logs }));
  } catch (error) {
    return corsResponse(_req, NextResponse.json({ error: "Failed to load logs" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const limited = rateLimit(req);
  if (limited) return corsResponse(req, limited);

  try {
    const body = await req.json();
    const parsed = createLogSchema.safeParse(body);

    if (!parsed.success) {
      return corsResponse(req, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { notionId: true },
    });

    if (!project) return corsResponse(req, NextResponse.json({ error: "Project not found" }, { status: 404 }));

    const logDate = parsed.data.date ? new Date(parsed.data.date) : new Date();

    const log = await prisma.siteLog.create({
      data: {
        projectId,
        notionId: null,
        content: parsed.data.content,
        author: parsed.data.author,
        date: logDate,
      },
    });

    syncDailyLogToNotionInBackground({
      id: log.id,
      projectId,
      notionProjectId: project.notionId,
      content: parsed.data.content,
      author: parsed.data.author,
      date: logDate,
    });

    return corsResponse(req, NextResponse.json({ log }, { status: 201 }));
  } catch (error) {
    return corsResponse(req, NextResponse.json({ error: `Failed to create log: ${(error as Error).message}` }, { status: 500 }));
  }
}
