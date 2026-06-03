import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSequenceTemplate } from "@/lib/sequence-templates";
import { requireAuth } from "@/lib/api-auth";

const schema = z.object({
  constructionType: z.enum(["Condo", "House"]),
  scope: z.enum(["BathRemodel", "PartialRemodel", "FullRemodel", "Addition", "NewBuild", "NewConstruction"]),
  clearExisting: z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const __auth = await requireAuth(req);

  if (!__auth.ok) return (__auth as any).response;

  const { projectId } = await params;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { constructionType, scope, clearExisting } = parsed.data;
    const tasks = getSequenceTemplate(constructionType, scope);

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { structureType: constructionType, scopeType: scope === "NewConstruction" ? "NewBuild" : scope },
      });

      if (clearExisting) {
        await tx.dependency.deleteMany({ where: { projectId } });
        await tx.task.deleteMany({ where: { projectId } });
        await tx.taskStatus.deleteMany({ where: { projectId } });
      }

      for (const t of tasks) {
        await tx.task.upsert({
          where: { projectId_taskId: { projectId, taskId: t.taskId } },
          create: {
            projectId,
            taskId: t.taskId,
            taskName: t.taskName,
            durationDays: t.durationDays,
            ownerCompany: t.ownerCompany,
            requiresInspection: t.requiresInspection,
            callNow: t.callNow,
            phase: t.phase,
            trade: t.trade,
          },
          update: {
            taskName: t.taskName,
            durationDays: t.durationDays,
            ownerCompany: t.ownerCompany,
            requiresInspection: t.requiresInspection,
            callNow: t.callNow,
            phase: t.phase,
            trade: t.trade,
          },
        });

        await tx.taskStatus.upsert({
          where: { projectId_taskId: { projectId, taskId: t.taskId } },
          create: {
            projectId,
            taskId: t.taskId,
            status: "Scheduled",
            confirmedComplete: false,
            inspectionRequired: t.requiresInspection,
            inspectionPassed: false,
          },
          update: {
            inspectionRequired: t.requiresInspection,
          },
        });
      }

      await tx.dependency.deleteMany({ where: { projectId } });
      const dependencyRows = tasks.flatMap((t) => t.predecessors.map((fromTaskId) => ({ projectId, fromTaskId, toTaskId: t.taskId })));
      if (dependencyRows.length) {
        await tx.dependency.createMany({ data: dependencyRows });
      }

      await tx.versionLog.create({
        data: {
          projectId,
          runType: "APPLY_SEQUENCE_TEMPLATE",
          countsJson: {
            constructionType,
            scope,
            tasks: tasks.length,
          },
        },
      });
    });

    return NextResponse.json({ ok: true, tasksImported: tasks.length, constructionType, scope });
  } catch (error) {
    return NextResponse.json({ error: `Failed template apply: ${(error as Error).message}` }, { status: 500 });
  }
}
