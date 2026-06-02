import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { prisma } from "@/lib/prisma";
import {
  buildBlankProjectInfoSheet,
  buildCostTrackingSheet,
  emptyCostTrackingRows,
  loadBaseWorkbook,
  upsertSheet,
} from "@/lib/workbook";

const requiredSheets = [
  "Project Info",
  "Sequence",
  "Task_Status",
  "Company Profiles",
  "LookAhead (Field)",
  "Cost Tracking",
  "Dashboard",
  "Gantt (Print)",
  "Graph Engine",
  "Graph Unlock",
  "Critical Path",
  "Settings",
  "Email_Boss",
  "2-week",
];

function ensureSheet(workbook: xlsx.WorkBook, name: string, rows: Array<Array<string | number>> = [[name]]) {
  if (!workbook.SheetNames.includes(name)) {
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), name);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const workbook = loadBaseWorkbook();

    upsertSheet(workbook, "Project Info", buildBlankProjectInfoSheet());
    upsertSheet(workbook, "Cost Tracking", buildCostTrackingSheet(emptyCostTrackingRows()));

    ensureSheet(workbook, "Sequence", [
      ["Task_ID", "Task_Name", "Duration_Days", "Predecessors", "OwnerCompany", "Requires_Inspection", "Call_Now", "Phase", "Trade"],
    ]);
    ensureSheet(workbook, "Task_Status", [
      [
        "Task_ID",
        "Task_Name",
        "OwnerCompany",
        "Status",
        "Confirmed_Complete",
        "Inspection_Required",
        "Inspection_Passed",
        "Last_Updated",
        "Call_Now",
        "Phase",
        "Trade",
      ],
    ]);
    ensureSheet(workbook, "Company Profiles", [["Company", "Trade", "Contact_Name", "Phone", "Email", "Contact_Role", "Primary"]]);
    ensureSheet(workbook, "LookAhead (Field)", [["Phase", "Company", "Task", "Notes"]]);

    for (const name of requiredSheets) {
      ensureSheet(workbook, name);
    }

    const bin = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(new Uint8Array(bin), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"new-project-template.xlsx\"",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to build workbook template: ${(error as Error).message}` }, { status: 500 });
  }
}
