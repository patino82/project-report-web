import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const prisma = new PrismaClient();

const workbookPath = process.argv[2];
if (!workbookPath) {
  console.error("Usage: npm run import:workbook -- /absolute/path/to/workbook.xlsx [--project \"Name\"]");
  process.exit(1);
}

if (!fs.existsSync(workbookPath)) {
  console.error(`Workbook not found: ${workbookPath}`);
  process.exit(1);
}

const projectArgIndex = process.argv.findIndex((a) => a === "--project");
const forcedProjectName = projectArgIndex >= 0 ? process.argv[projectArgIndex + 1] : undefined;
const wb = xlsx.readFile(workbookPath, { cellDates: true });

function clean(v) {
  return String(v ?? "").trim();
}

function yesNo(v) {
  const s = clean(v).toUpperCase();
  return s === "Y" || s === "YES" || s === "TRUE" || s === "1";
}

function toDate(v) {
  if (v instanceof Date && !Number.isNaN(v.valueOf())) return v;
  const s = clean(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? null : d;
}

function toPositiveInt(v, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

function sheetRows(name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

function asObjects(name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return xlsx.utils.sheet_to_json(ws, { defval: "" });
}

function parseProjectInfo() {
  const rows = asObjects("Project Info");
  const kv = new Map();

  for (const row of rows) {
    const key = clean(row.Key ?? row.key);
    const value = clean(row.Value ?? row.value);
    if (key) kv.set(key, value);
  }

  const name =
    forcedProjectName ||
    kv.get("ProjectName") ||
    kv.get("Project Name") ||
    path.basename(workbookPath, path.extname(workbookPath));

  return {
    name,
    preparedBy: kv.get("PreparedBy") || kv.get("Prepared By") || "",
    thisWeekStart: toDate(kv.get("ThisWeekStart") || kv.get("This Week Start") || kv.get("This Week of")) || new Date(),
    structureType: (kv.get("StructureType") || "House"),
    scopeType: (kv.get("ScopeType") || "FullRemodel"),
  };
}

function parseSequence() {
  const rows = sheetRows("Sequence");
  if (!rows.length) return [];

  const headerIdx = rows.findIndex((r) => r.some((c) => clean(c).toLowerCase() === "nodeid"));
  if (headerIdx === -1) {
    const objects = asObjects("Sequence");
    return objects
      .map((r) => ({
        taskId: clean(r.Task_ID),
        taskName: clean(r.Task_Name),
        durationDays: toPositiveInt(r.Duration_Days, 1),
        predecessors: clean(r.Predecessors)
          .split(",")
          .map((x) => clean(x))
          .filter(Boolean),
        ownerCompany: clean(r.OwnerCompany),
        phase: clean(r.Phase) || null,
        trade: clean(r.Trade) || null,
        requiresInspection: yesNo(r.Requires_Inspection),
        callNow: yesNo(r.Call_Now),
      }))
      .filter((r) => r.taskId && r.taskName && r.ownerCompany);
  }

  const data = rows.slice(headerIdx + 1);
  const out = [];

  for (const r of data) {
    const taskId = clean(r[0]);
    const phase = clean(r[1]) || null;
    const taskName = clean(r[2]);
    const ownerCompany = clean(r[3]);
    const requiresInspection = yesNo(r[4]);
    const durationDays = toPositiveInt(r[6], 1);
    const include = clean(r[7]).toLowerCase();
    const pred = [clean(r[8]), clean(r[9]), clean(r[10])].filter(Boolean);

    if (!taskId || !taskName || !ownerCompany) continue;
    if (include && include !== "yes" && include !== "y") continue;

    out.push({
      taskId,
      taskName,
      durationDays,
      predecessors: pred,
      ownerCompany,
      phase,
      trade: null,
      requiresInspection,
      callNow: requiresInspection,
    });
  }

  return out;
}

function parseTaskStatus() {
  const rows = sheetRows("Task_Status");
  const out = new Map();
  if (!rows.length) return out;

  for (const r of rows.slice(1)) {
    const taskId = clean(r[0]);
    if (!taskId) continue;

    out.set(taskId, {
      status: clean(r[3]) || "Scheduled",
      confirmedComplete: yesNo(r[4]),
      inspectionRequired: yesNo(r[5]),
      inspectionPassed: yesNo(r[6]),
      lastUpdated: toDate(r[7]),
      callNow: yesNo(r[8]),
      phase: clean(r[9]) || null,
      trade: clean(r[10]) || null,
      contactName: clean(r[11]) || "",
      phone: clean(r[12]) || "",
      email: clean(r[13]) || "",
    });
  }

  return out;
}

function parseCompanies() {
  const rows = asObjects("Company Profiles");
  return rows
    .map((r) => ({
      company: clean(r.Company),
      trade: clean(r.Trade) || null,
      contactName: clean(r.Contact_Name),
      phone: clean(r.Phone) || null,
      email: clean(r.Email) || null,
      role: clean(r.Contact_Role || r.Role) || null,
      primary: yesNo(r.Primary || r.Is_Primary),
    }))
    .filter((r) => r.company);
}

function parseLookahead(sequenceByTaskName, sequenceByTaskId) {
  const rows = sheetRows("LookAhead (Field)");
  if (!rows.length) return [];

  const headerIdx = rows.findIndex((r) => clean(r[0]).toLowerCase() === "phase" && clean(r[2]).toLowerCase() === "task");
  if (headerIdx === -1) return [];

  const dateRow = rows[headerIdx + 1] || [];
  const dayCols = [];

  for (let i = 4; i < dateRow.length; i += 1) {
    const d = toDate(dateRow[i]);
    if (d) dayCols.push({ col: i, date: d });
  }

  const marks = [];
  for (const r of rows.slice(headerIdx + 2)) {
    const taskName = clean(r[2]);
    if (!taskName) continue;

    const taskId = sequenceByTaskName.get(taskName);
    if (!taskId || !sequenceByTaskId.has(taskId)) continue;

    for (const dc of dayCols) {
      const symbol = clean(r[dc.col]);
      if (!["X", "/", "0", "!"].includes(symbol)) continue;
      marks.push({ taskId, date: dc.date, symbol, notes: clean(r[3]) || null });
    }
  }

  return marks;
}

async function run() {
  const projectMeta = parseProjectInfo();
  const sequence = parseSequence();
  if (!sequence.length) {
    throw new Error("Sequence parsed zero tasks. Confirm Sequence sheet has NodeID/Task rows.");
  }

  const statusByTask = parseTaskStatus();
  const companyRows = parseCompanies();

  const projectId =
    projectMeta.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "project";

  const project = await prisma.project.upsert({
    where: { id: projectId },
    create: {
      id: projectId,
      name: projectMeta.name,
      preparedBy: projectMeta.preparedBy || null,
      structureType: projectMeta.structureType,
      scopeType: projectMeta.scopeType,
      thisWeekStart: projectMeta.thisWeekStart,
    },
    update: {
      name: projectMeta.name,
      preparedBy: projectMeta.preparedBy || null,
      structureType: projectMeta.structureType,
      scopeType: projectMeta.scopeType,
      thisWeekStart: projectMeta.thisWeekStart,
    },
  });

  const existingStatuses = await prisma.taskStatus.findMany({ where: { projectId: project.id } });
  const existingStatusMap = new Map(existingStatuses.map((s) => [s.taskId, s]));

  const sequenceByTaskName = new Map(sequence.map((t) => [t.taskName, t.taskId]));
  const sequenceByTaskId = new Set(sequence.map((t) => t.taskId));
  const lookaheadMarks = parseLookahead(sequenceByTaskName, sequenceByTaskId);

  await prisma.$transaction(async (tx) => {
    await tx.dependency.deleteMany({ where: { projectId: project.id } });
    await tx.task.deleteMany({ where: { projectId: project.id } });
    await tx.lookaheadEntry.deleteMany({ where: { projectId: project.id } });

    for (const task of sequence) {
      const status = statusByTask.get(task.taskId);
      const existing = existingStatusMap.get(task.taskId);

      await tx.task.create({
        data: {
          projectId: project.id,
          taskId: task.taskId,
          taskName: task.taskName,
          phase: status?.phase || task.phase,
          trade: status?.trade || task.trade,
          ownerCompany: task.ownerCompany,
          durationDays: task.durationDays,
          requiresInspection: task.requiresInspection,
          callNow: status?.callNow ?? task.callNow,
        },
      });

      await tx.taskStatus.upsert({
        where: { projectId_taskId: { projectId: project.id, taskId: task.taskId } },
        create: {
          projectId: project.id,
          taskId: task.taskId,
          status: status?.status || existing?.status || "Scheduled",
          confirmedComplete: status?.confirmedComplete || existing?.confirmedComplete || false,
          inspectionRequired: status?.inspectionRequired ?? task.requiresInspection,
          inspectionPassed: status?.inspectionPassed || existing?.inspectionPassed || false,
          lastUpdated: status?.lastUpdated || existing?.lastUpdated || null,
        },
        update: {
          status: status?.status || existing?.status || "Scheduled",
          confirmedComplete: status?.confirmedComplete || existing?.confirmedComplete || false,
          inspectionRequired: status?.inspectionRequired ?? task.requiresInspection,
          inspectionPassed: status?.inspectionPassed || existing?.inspectionPassed || false,
          lastUpdated: status?.lastUpdated || existing?.lastUpdated || new Date(),
        },
      });

      for (const p of task.predecessors) {
        await tx.dependency.create({
          data: { projectId: project.id, fromTaskId: p, toTaskId: task.taskId },
        });
      }
    }

    const taskStatusContacts = Array.from(statusByTask.entries())
      .map(([taskId, s]) => ({
        company: sequence.find((t) => t.taskId === taskId)?.ownerCompany || "",
        trade: s.trade,
        contactName: s.contactName,
        phone: s.phone,
        email: s.email,
        role: "Imported from Task_Status",
        primary: true,
      }))
      .filter((r) => r.company && r.contactName);

    const combinedCompanyRows = [...companyRows, ...taskStatusContacts];
    const companyNames = new Set(sequence.map((t) => t.ownerCompany));
    for (const row of combinedCompanyRows) companyNames.add(row.company);

    const companyIdByName = new Map();
    for (const name of companyNames) {
      const company = await tx.company.upsert({ where: { name }, create: { name }, update: {} });
      companyIdByName.set(name, company.id);
    }

    for (const row of combinedCompanyRows) {
      const companyId = companyIdByName.get(row.company);
      if (!companyId) continue;

      if (row.contactName) {
        await tx.contact.create({
          data: {
            companyId,
            name: row.contactName,
            phone: row.phone,
            email: row.email,
            role: row.role,
            isPrimary: row.primary,
          },
        });
      }

      if (row.trade) {
        const trade = await tx.trade.upsert({ where: { name: row.trade }, create: { name: row.trade }, update: {} });
        await tx.companyTradeMap.upsert({
          where: { companyId_tradeId: { companyId, tradeId: trade.id } },
          create: {
            companyId,
            tradeId: trade.id,
            isPrimary: row.primary,
          },
          update: {
            isPrimary: row.primary,
          },
        });
      }
    }

    for (const m of lookaheadMarks) {
      await tx.lookaheadEntry.create({
        data: {
          projectId: project.id,
          taskId: m.taskId,
          date: m.date,
          symbol: m.symbol,
          notes: m.notes,
        },
      });
    }

    await tx.versionLog.create({
      data: {
        projectId: project.id,
        runType: "WORKBOOK_IMPORT",
        countsJson: {
          tasks: sequence.length,
          statuses: statusByTask.size,
          contacts: combinedCompanyRows.length,
          lookaheadMarks: lookaheadMarks.length,
          sourceWorkbook: workbookPath,
        },
      },
    });
  });

  console.log(`Imported workbook: ${workbookPath}`);
  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`Tasks: ${sequence.length} | Status rows: ${statusByTask.size} | Lookahead marks: ${lookaheadMarks.length}`);
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
