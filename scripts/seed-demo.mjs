import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env.mjs";

// Reject production deploys: seed-demo is a local/private-beta convenience
// only. It must not run in production unless the caller is explicit.
const overrideProd = process.env.SEED_DEMO_ALLOW_PRODUCTION;
if (process.env.NODE_ENV === "production" && overrideProd !== "1" && overrideProd !== "true") {
  console.error(
    "seed-demo refuses to run in NODE_ENV=production. " +
      "Set SEED_DEMO_ALLOW_PRODUCTION=1 to override (not recommended).",
  );
  process.exit(1);
}

loadEnv();

const prisma = new PrismaClient();

const projectId = "craig-f10";
const monday = startOfWorkWeek(new Date());

const tasks = [
  {
    taskId: "MOB1",
    taskName: "Mobilize site and verify protection",
    phase: "Startup",
    trade: "General Conditions",
    ownerCompany: "Castlerock",
    durationDays: 1,
    requiresInspection: false,
    callNow: true,
    predecessors: [],
  },
  {
    taskId: "FRM1",
    taskName: "Frame cabana shell walls",
    phase: "Shell",
    trade: "Framing",
    ownerCompany: "Castlerock",
    durationDays: 3,
    requiresInspection: true,
    callNow: true,
    predecessors: ["MOB1"],
  },
  {
    taskId: "MEP1",
    taskName: "Rough electrical and plumbing",
    phase: "MEP Rough",
    trade: "MEP",
    ownerCompany: "Trade Partners",
    durationDays: 4,
    requiresInspection: true,
    callNow: false,
    predecessors: ["FRM1"],
  },
  {
    taskId: "STU1",
    taskName: "Stucco prep and scratch coat",
    phase: "Exterior",
    trade: "Stucco",
    ownerCompany: "Advantage",
    durationDays: 2,
    requiresInspection: false,
    callNow: false,
    predecessors: ["MEP1"],
  },
];

function startOfWorkWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const project = await prisma.project.upsert({
    where: { id: projectId },
    create: {
      id: projectId,
      name: "Craig Guest Cabana Demo",
      preparedBy: "Project Lookahead",
      structureType: "House",
      scopeType: "Addition",
      thisWeekStart: monday,
    },
    update: {
      name: "Craig Guest Cabana Demo",
      preparedBy: "Project Lookahead",
      structureType: "House",
      scopeType: "Addition",
      thisWeekStart: monday,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.dependency.deleteMany({ where: { projectId: project.id } });
    await tx.lookaheadEntry.deleteMany({ where: { projectId: project.id } });
    await tx.taskStatus.deleteMany({ where: { projectId: project.id } });
    await tx.task.deleteMany({ where: { projectId: project.id } });

    for (const task of tasks) {
      await tx.task.create({
        data: {
          projectId: project.id,
          taskId: task.taskId,
          taskName: task.taskName,
          phase: task.phase,
          trade: task.trade,
          ownerCompany: task.ownerCompany,
          durationDays: task.durationDays,
          requiresInspection: task.requiresInspection,
          callNow: task.callNow,
        },
      });

      await tx.taskStatus.create({
        data: {
          projectId: project.id,
          taskId: task.taskId,
          status: task.taskId === "MOB1" ? "In Progress" : "Scheduled",
          confirmedComplete: false,
          inspectionRequired: task.requiresInspection,
          inspectionPassed: false,
          lastUpdated: new Date(),
        },
      });

      for (const fromTaskId of task.predecessors) {
        await tx.dependency.create({ data: { projectId: project.id, fromTaskId, toTaskId: task.taskId } });
      }
    }

    await tx.lookaheadEntry.createMany({
      data: [
        { projectId: project.id, taskId: "MOB1", date: monday, symbol: "/", notes: "Demo schedule" },
        { projectId: project.id, taskId: "FRM1", date: addDays(monday, 1), symbol: "/", notes: "Frame start" },
        { projectId: project.id, taskId: "FRM1", date: addDays(monday, 3), symbol: "!", notes: "Frame inspection target" },
      ],
    });

    await tx.company.upsert({ where: { name: "Castlerock" }, create: { name: "Castlerock" }, update: {} });
    await tx.company.upsert({ where: { name: "Advantage" }, create: { name: "Advantage" }, update: {} });

    await tx.versionLog.create({
      data: {
        projectId: project.id,
        runType: "DEMO_SEED",
        countsJson: { tasks: tasks.length, lookaheadMarks: 3 },
      },
    });
  });

  console.log(`Seeded demo project: ${project.name}`);
  console.log(`Open: /projects/${project.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
