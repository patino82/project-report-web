import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startOfWorkWeek } from "@/lib/domain";
import { normalizeProjectProfile, parseOptionalDateInput } from "@/lib/project-profile";
import { syncProjectToNotionInBackground } from "@/lib/notion-sync";
import { corsResponse, corsOptions } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api-auth";

const createProjectSchema = z.object({
  name: z.string().min(1),
  preparedBy: z.string().optional(),
  location: z.string().optional(),
  thisWeekStart: z.string().optional(),
  structureType: z.enum(["House", "Condo"]).optional(),
  scopeType: z.enum(["BathRemodel", "PartialRemodel", "FullRemodel", "Addition", "NewBuild"]).optional(),
});

export async function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(request: Request) {
  const _auth = await requireAuth(request as any);
  if (!_auth.ok) return (_auth as any).response;
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
    return corsResponse(request, NextResponse.json({ projects }));
  } catch (error) {
    console.error("[api/projects] GET error:", error);
    return corsResponse(request, NextResponse.json({ error: "Failed to load projects" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return corsResponse(req, limited);

  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return corsResponse(req, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
    }

    const normalized = normalizeProjectProfile(
      parsed.data.structureType ?? "House",
      parsed.data.scopeType ?? "FullRemodel",
    );

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        location: parsed.data.location,
        notionId: null,
        preparedBy: parsed.data.preparedBy,
        structureType: normalized.structureType,
        scopeType: normalized.scopeType,
        thisWeekStart: parseOptionalDateInput(parsed.data.thisWeekStart) ?? startOfWorkWeek(),
      },
    });

    syncProjectToNotionInBackground(project);

    return corsResponse(req, NextResponse.json({ project }, { status: 201 }));
  } catch (error) {
    console.error("[api/projects] POST error:", error);
    return corsResponse(req, NextResponse.json({ error: "Failed to create project" }, { status: 500 }));
  }
}
