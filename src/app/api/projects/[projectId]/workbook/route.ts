import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { computeTwoWeekDates, formatDateKey } from "@/lib/domain";
import { loadProjectBundle } from "@/lib/project-data";

function buildProjectInfoSheet(project: { name: string; preparedBy: string | null; thisWeekStart: Date; structureType: string; scopeType: string }) {
  const rows = [
    ["Key", "Value"],
    ["ProjectName", project.name],
    ["PreparedBy", project.preparedBy ?? ""],
    ["ThisWeekStart", format(project.thisWeekStart, "yyyy-MM-dd")],
    ["StructureType", project.structureType],
    ["ScopeType", project.scopeType],
  ];
  return xlsx.utils.aoa_to_sheet(rows);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const bundle = await loadProjectBundle(projectId);
    if (!bundle) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const wb = xlsx.utils.book_new();

    const sequenceRows: Array<Array<string | number>> = [["Task_ID", "Task_Name", "Duration_Days", "Predecessors", "OwnerCompany", "Requires_Inspection", "Call_Now", "Phase", "Trade"]];
    for (const t of bundle.taskLite) {
      sequenceRows.push([
        t.taskId,
        t.taskName,
        t.durationDays,
        t.predecessors.join(","),
        t.ownerCompany,
        t.requiresInspection ? "Y" : "N",
        t.callNow ? "Y" : "N",
        t.phase ?? "",
        t.trade ?? "",
      ]);
    }
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(sequenceRows), "Sequence");

    const statusByTask = new Map(bundle.statusLite.map((s) => [s.taskId, s]));
    const taskStatusRows: string[][] = [["Task_ID", "Task_Name", "OwnerCompany", "Status", "Confirmed_Complete", "Inspection_Required", "Inspection_Passed", "Last_Updated", "Call_Now", "Phase", "Trade"]];
    for (const t of bundle.taskLite) {
      const s = statusByTask.get(t.taskId);
      taskStatusRows.push([
        t.taskId,
        t.taskName,
        t.ownerCompany,
        s?.status ?? "Scheduled",
        s?.confirmedComplete ? "Y" : "N",
        (s?.inspectionRequired ?? t.requiresInspection) ? "Y" : "N",
        s?.inspectionPassed ? "Y" : "N",
        s?.lastUpdated ?? "",
        t.callNow ? "Y" : "N",
        t.phase ?? "",
        t.trade ?? "",
      ]);
    }
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(taskStatusRows), "Task_Status");

    const companyRows: string[][] = [["Company", "Trade", "Contact_Name", "Phone", "Email", "Contact_Role", "Primary"]];
    const companies = await prisma.company.findMany({
      include: {
        contacts: true,
        trades: { include: { trade: true } },
      },
      orderBy: { name: "asc" },
    });

    for (const c of companies) {
      const trades = c.trades.map((t) => t.trade.name);
      if (!c.contacts.length) {
        companyRows.push([c.name, trades.join(", "), "", "", "", "", "N"]);
        continue;
      }

      for (const contact of c.contacts) {
        companyRows.push([
          c.name,
          trades.join(", "),
          contact.name,
          contact.phone ?? "",
          contact.email ?? "",
          contact.role ?? "",
          contact.isPrimary ? "Y" : "N",
        ]);
      }
    }
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(companyRows), "Company Profiles");

    const weekDates = computeTwoWeekDates(bundle.project.thisWeekStart);
    const lookaheadEntries = await prisma.lookaheadEntry.findMany({
      where: { projectId, date: { gte: weekDates[0], lte: weekDates[weekDates.length - 1] } },
    });

    const marks = new Map(lookaheadEntries.map((e) => [`${e.taskId}|${formatDateKey(e.date)}`, e.symbol]));
    const lookaheadRows: (string | Date)[][] = [];
    lookaheadRows.push([`LookAhead (Field) — Week of ${format(bundle.project.thisWeekStart, "M/d/yyyy")}`, "", "", "", "Legend"]);
    lookaheadRows.push(["Phase", "Company", "Task", "Notes", ...weekDates.map((d) => format(d, "EEE"))]);
    lookaheadRows.push(["", "", "", "", ...weekDates.map((d) => d)]);

    for (const t of bundle.taskLite) {
      lookaheadRows.push([
        t.phase ?? "",
        t.ownerCompany,
        t.taskName,
        "",
        ...weekDates.map((d) => marks.get(`${t.taskId}|${formatDateKey(d)}`) ?? ""),
      ]);
    }
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(lookaheadRows), "LookAhead (Field)");

    xlsx.utils.book_append_sheet(wb, buildProjectInfoSheet(bundle.project), "Project Info");

    const requiredNames = [
      "Dashboard",
      "Gantt (Print)",
      "Graph Engine",
      "Graph Unlock",
      "Critical Path",
      "Sequence_Condo",
      "Sequence_FullRemodel",
      "Sequence_PartialRemodel",
      "Settings",
      "Email_Boss",
      "2-week",
    ];

    for (const name of requiredNames) {
      if (!wb.SheetNames.includes(name)) {
        xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([[name], ["Generated from web app"]]), name);
      }
    }

    const bin = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    const bytes = new Uint8Array(bin);
    const filename = `${bundle.project.name.replace(/\s+/g, "_")}_${bundle.project.structureType}_${bundle.project.scopeType}.xlsx`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to build workbook: ${(error as Error).message}` }, { status: 500 });
  }
}
