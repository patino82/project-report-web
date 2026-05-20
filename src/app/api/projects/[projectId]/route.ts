import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureProjectCalendarCurrent } from "@/lib/project-calendar";
import { normalizeProjectProfile, parseOptionalDateInput } from "@/lib/project-profile";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  preparedBy: z.string().optional(),
  thisWeekStart: z.string().optional(),
  structureType: z.enum(["House", "Condo"]).optional(),
  scopeType: z.enum(["BathRemodel", "PartialRemodel", "FullRemodel", "Addition", "NewBuild"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: {
        select: { tasks: true, taskStatuses: true, lookahead: true, dependencies: true, versionLogs: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const currentProject = await ensureProjectCalendarCurrent(project);
  return NextResponse.json({ project: currentProject });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const data: { name?: string; preparedBy?: string | null; thisWeekStart?: Date; structureType?: string; scopeType?: string } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.preparedBy !== undefined) data.preparedBy = parsed.data.preparedBy;
    if (parsed.data.thisWeekStart !== undefined) data.thisWeekStart = parseOptionalDateInput(parsed.data.thisWeekStart);

    const normalized = normalizeProjectProfile(
      parsed.data.structureType ?? (existing.structureType as "House" | "Condo"),
      parsed.data.scopeType ?? (existing.scopeType as "BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild"),
    );

    if (parsed.data.structureType !== undefined || parsed.data.scopeType !== undefined) {
      data.structureType = normalized.structureType;
      data.scopeType = normalized.scopeType;
    }

    const project = await prisma.project.update({ where: { id: projectId }, data });
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: `Failed to update project: ${(error as Error).message}` }, { status: 500 });
  }
}
