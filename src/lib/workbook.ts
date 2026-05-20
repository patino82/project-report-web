import fs from "node:fs";
import path from "node:path";

import * as xlsx from "xlsx";
import { format } from "date-fns";

export function buildProjectInfoSheet(project: {
  name: string;
  preparedBy: string | null;
  thisWeekStart: Date;
  structureType: string;
  scopeType: string;
}) {
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

export function buildBlankProjectInfoSheet() {
  return buildProjectInfoSheet({
    name: "",
    preparedBy: "",
    thisWeekStart: new Date(),
    structureType: "House",
    scopeType: "FullRemodel",
  });
}

export function buildCostTrackingSheet(rows: Array<Array<string | number>>) {
  return xlsx.utils.aoa_to_sheet(rows);
}

export function emptyCostTrackingRows(): Array<Array<string | number>> {
  return [[
    "Type",
    "Trade",
    "Vendor",
    "Description",
    "EstimateCode",
    "Amount",
    "Status",
    "TargetDate",
    "ActualDate",
    "Notes",
    "LinkedEstimateId",
  ]];
}

export function resolveWorkbookTemplatePath() {
  return path.join(process.cwd(), "public", "templates", "Project_Report_Template_Empty.xlsx");
}

export function loadBaseWorkbook() {
  const templatePath = resolveWorkbookTemplatePath();
  if (!fs.existsSync(templatePath)) {
    return xlsx.utils.book_new();
  }

  const file = fs.readFileSync(templatePath);
  return xlsx.read(file, { type: "buffer", cellDates: true });
}

export function upsertSheet(workbook: xlsx.WorkBook, name: string, sheet: xlsx.WorkSheet) {
  workbook.Sheets[name] = sheet;
  if (!workbook.SheetNames.includes(name)) {
    workbook.SheetNames.push(name);
  }
}
