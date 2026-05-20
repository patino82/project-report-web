import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const upsertTaskSchema = z.object({
  taskId: z.string().min(1),
  taskName: z.string().min(1),
  phase: z.string().optional().nullable(),
  trade: z.string().optional().nullable(),
  ownerCompany: z.string().min(1),
  durationDays: z.number().int().min(1),
  predecessors: z.array(z.string()).default([]),
  requiresInspection: z.boolean().default(false),
  callNow: z.boolean().default(false),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const [tasks, dependencies, statuses] = await Promise.all([
      prisma.task.findMany({ where: { projectId }, orderBy: [{ phase: "asc" }, { taskId: "asc" }] }),
      prisma.dependency.findMany({ where: { projectId } }),
      prisma.taskStatus.findMany({ where: { projectId }, orderBy: { taskId: "asc" } }),
    ]);

    const predecessorMap = new Map<string, string[]>();
    for (const d of dependencies) {
      const arr = predecessorMap.get(d.toTaskId) ?? [];
      arr.push(d.fromTaskId);
      predecessorMap.set(d.toTaskId, arr);
    }

    return NextResponse.json({
      tasks: tasks.map((t) => ({ ...t, predecessors: predecessorMap.get(t.taskId) ?? [] })),
      statuses,
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to load tasks: ${(error as Error).message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json();
    const parsed = upsertTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const task = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const upserted = await tx.task.upsert({
        where: { projectId_taskId: { projectId, taskId: task.taskId } },
        create: {
          projectId,
          taskId: task.taskId,
          taskName: task.taskName,
          phase: task.phase,
          trade: task.trade,
          ownerCompany: task.ownerCompany,
          durationDays: task.durationDays,
          requiresInspection: task.requiresInspection,
          callNow: task.callNow,
        },
        update: {
          taskName: task.taskName,
          phase: task.phase,
          trade: task.trade,
          ownerCompany: task.ownerCompany,
          durationDays: task.durationDays,
          requiresInspection: task.requiresInspection,
          callNow: task.callNow,
        },
      });

      await tx.dependency.deleteMany({ where: { projectId, toTaskId: task.taskId } });
      if (task.predecessors.length) {
        await tx.dependency.createMany({
          data: task.predecessors.map((fromTaskId) => ({ projectId, fromTaskId, toTaskId: task.taskId })),
        });
      }

      await tx.taskStatus.upsert({
        where: { projectId_taskId: { projectId, taskId: task.taskId } },
        create: {
          projectId,
          taskId: task.taskId,
          status: "Scheduled",
          confirmedComplete: false,
          inspectionRequired: task.requiresInspection,
          inspectionPassed: false,
        },
        update: {
          inspectionRequired: task.requiresInspection,
        },
      });

      return upserted;
    });

    return NextResponse.json({ task: result });
  } catch (error) {
    return NextResponse.json({ error: `Failed to upsert task: ${(error as Error).message}` }, { status: 500 });
  }
}
