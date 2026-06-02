import { NextRequest, NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeTwoWeekDates, formatDateKey, parseDateKey } from "@/lib/domain";
import { ensureProjectCalendarCurrent } from "@/lib/project-calendar";

const upsertSchema = z.object({
  taskId: z.string().min(1),
  date: z.string(),
  symbol: z.enum(["X", "/", "0", "!", ""]),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const onlyTwoWeek = req.nextUrl.searchParams.get("twoWeek") === "1";

  try {
    const projectRecord = await prisma.project.findUnique({ where: { id: projectId } });
    if (!projectRecord) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const project = await ensureProjectCalendarCurrent(projectRecord);

    const weekDates = computeTwoWeekDates(project.thisWeekStart);
    const rangeStart = weekDates[0] ?? project.thisWeekStart;
    const rangeEnd = weekDates[weekDates.length - 1] ?? addDays(project.thisWeekStart, 13);

    const [entries, tasks] = await Promise.all([
      prisma.lookaheadEntry.findMany({
        where: onlyTwoWeek
          ? { projectId, date: { gte: rangeStart, lte: rangeEnd } }
          : { projectId },
        orderBy: [{ date: "asc" }, { taskId: "asc" }],
      }),
      prisma.task.findMany({ where: { projectId }, orderBy: [{ phase: "asc" }, { taskId: "asc" }] }),
    ]);

    const entryMap = new Map<string, string>();
    for (const e of entries) {
      entryMap.set(`${e.taskId}|${formatDateKey(e.date)}`, e.symbol);
    }

    const matrix = tasks.map((t) => ({
      taskId: t.taskId,
      taskName: t.taskName,
      phase: t.phase,
      trade: t.trade,
      ownerCompany: t.ownerCompany,
      days: weekDates.map((d) => {
        const key = formatDateKey(d);
        return {
          date: key,
          label: format(d, "EEE M/d"),
          symbol: entryMap.get(`${t.taskId}|${key}`) ?? "",
        };
      }),
    }));

    return NextResponse.json({
      legend: {
        X: "Work performed",
        "/": "Scheduled",
        "0": "Behind schedule",
        "!": "Inspection milestone",
        "": "No mark",
      },
      weekDates: weekDates.map((d) => formatDateKey(d)),
      entries,
      matrix,
    });
  } catch (error) {
    return NextResponse.json({ error: `Lookahead read failed: ${(error as Error).message}` }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;
    const date = parseDateKey(payload.date);
    const task = await prisma.task.findUnique({
      where: { projectId_taskId: { projectId, taskId: payload.taskId } },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found for project" }, { status: 404 });
    }

    if (payload.symbol === "") {
      await prisma.lookaheadEntry.deleteMany({
        where: { projectId, taskId: payload.taskId, date },
      });

      await prisma.versionLog.create({
        data: {
          projectId,
          runType: "LOOKAHEAD_UPDATE",
          countsJson: { taskId: payload.taskId, date: payload.date, symbol: payload.symbol, cleared: true },
        },
      });

      return NextResponse.json({ entry: null, cleared: true });
    }

    const entry = await (prisma.lookaheadEntry as any).upsert({
      where: { projectId_taskId_date: { projectId, taskId: payload.taskId, date } },
      create: { projectId, taskId: payload.taskId, date, symbol: payload.symbol, notes: payload.notes },
      update: { symbol: payload.symbol, notes: payload.notes },
    });

    await prisma.versionLog.create({
      data: {
        projectId,
        runType: "LOOKAHEAD_UPDATE",
        countsJson: { taskId: payload.taskId, date: payload.date, symbol: payload.symbol },
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: `Lookahead write failed: ${(error as Error).message}` }, { status: 500 });
  }
}
