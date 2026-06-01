import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startOfWorkWeek } from "@/lib/domain";
import { normalizeProjectProfile, parseOptionalDateInput } from "@/lib/project-profile";
import { pushProjectToNotion } from "@/lib/notion-sync";
import { corsResponse, corsOptions } from "@/lib/cors";

const createProjectSchema = z.object({
  name: z.string().min(1),
  preparedBy: z.string().optional(),
  location: z.string().optional(),
  thisWeekStart: z.string().optional(),
  structureType: z.enum(["House", "Condo"]).optional(),
  scopeType: z.enum(["BathRemodel", "PartialRemodel", "FullRemodel", "Addition", "NewBuild"]).optional(),
});

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            tasks: true,
            taskStatuses: true,
            lookahead: true,
          },
        },
      },
    });
    return corsResponse(NextResponse.json({ projects }));
  } catch (error) {
    return corsResponse(NextResponse.json({ error: `Failed to load projects: ${(error as Error).message}` }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return corsResponse(NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
    }

    const normalized = normalizeProjectProfile(
      parsed.data.structureType ?? "House",
      parsed.data.scopeType ?? "FullRemodel",
    );

    // Sync to Notion first
    const notionId = await pushProjectToNotion({
      name: parsed.data.name,
      location: parsed.data.location,
    });

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        location: parsed.data.location,
        notionId: notionId,
        preparedBy: parsed.data.preparedBy,
        structureType: normalized.structureType,
        scopeType: normalized.scopeType,
        thisWeekStart: parseOptionalDateInput(parsed.data.thisWeekStart) ?? startOfWorkWeek(),
      },
    });

    return corsResponse(NextResponse.json({ project }, { status: 201 }));
  } catch (error) {
    return corsResponse(NextResponse.json({ error: `Failed to create project: ${(error as Error).message}` }, { status: 500 }));
  }
}
