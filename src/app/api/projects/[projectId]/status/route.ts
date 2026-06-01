import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  taskId: z.string().min(1),
  status: z.string().min(1),
  confirmedComplete: z.boolean().default(false),
  inspectionRequired: z.boolean().default(false),
  inspectionPassed: z.boolean().default(false),
  lastUpdated: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const statuses = await prisma.taskStatus.findMany({
      where: { projectId },
      select: {
        taskId: true,
        status: true,
        confirmedComplete: true,
        inspectionRequired: true,
        inspectionPassed: true,
        lastUpdated: true,
      },
      orderBy: { taskId: "asc" },
    });

    return NextResponse.json({ statuses });
  } catch (error) {
    return NextResponse.json({ error: `Failed to load statuses: ${(error as Error).message}` }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;
    const task = await prisma.task.findUnique({
      where: { projectId_taskId: { projectId, taskId: payload.taskId } },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found for project" }, { status: 404 });
    }

    const record = await prisma.taskStatus.upsert({
      where: { projectId_taskId: { projectId, taskId: payload.taskId } },
      create: {
        projectId,
        taskId: payload.taskId,
        status: payload.status,
        confirmedComplete: payload.confirmedComplete,
        inspectionRequired: payload.inspectionRequired,
        inspectionPassed: payload.inspectionPassed,
        lastUpdated: payload.lastUpdated ? new Date(payload.lastUpdated) : new Date(),
      },
      update: {
        status: payload.status,
        confirmedComplete: payload.confirmedComplete,
        inspectionRequired: payload.inspectionRequired,
        inspectionPassed: payload.inspectionPassed,
        lastUpdated: payload.lastUpdated ? new Date(payload.lastUpdated) : new Date(),
      },
    });

    return NextResponse.json({ status: record });
  } catch (error) {
    return NextResponse.json({ error: `Failed to save status: ${(error as Error).message}` }, { status: 500 });
  }
}
