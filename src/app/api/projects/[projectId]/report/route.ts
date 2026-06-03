import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { buildSummary, computeTwoWeekDates, formatDateKey } from "@/lib/domain";
import { loadProjectBundle } from "@/lib/project-data";
import { prisma } from "@/lib/prisma";
import { getAmplitudeClient, flushAmplitude } from "@/lib/amplitude-server";
import { requireAuth } from "@/lib/api-auth";

function toBuffer(doc: NodeJS.ReadableStream & { end: () => void }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const __auth = await requireAuth(req);

  if (!__auth.ok) return (__auth as any).response;

  const { projectId } = await params;

  try {
    const bundle = await loadProjectBundle(projectId);
    if (!bundle) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const summary = buildSummary({
      projectId,
      projectName: bundle.project.name,
      thisWeekStart: bundle.project.thisWeekStart.toISOString().slice(0, 10),
      tasks: bundle.taskLite,
      statuses: bundle.statusLite,
      contactsByCompany: bundle.contactsByCompany,
    });

    const asJson = req.nextUrl.searchParams.get("format") === "json";
    if (asJson) {
      return NextResponse.json({
        title: `${summary.projectName} - 2 Week Report`,
        summary,
      });
    }

    const dates = computeTwoWeekDates(bundle.project.thisWeekStart);
    const lookahead = await prisma.lookaheadEntry.findMany({
      where: {
        projectId,
        date: { gte: dates[0], lte: dates[dates.length - 1] },
      },
    });

    const symbolMap = new Map<string, string>();
    for (const e of lookahead) {
      symbolMap.set(`${e.taskId}|${formatDateKey(e.date)}`, e.symbol);
    }

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    doc.fontSize(18).text("Superintendent 2-Week Schedule", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(11).text(`Project: ${summary.projectName}`);
    doc.text(`Week of: ${summary.thisWeekStart}`);
    doc.text(`Prepared: ${format(new Date(), "yyyy-MM-dd HH:mm")}`);
    doc.moveDown(0.4);

    doc.fontSize(10).text(`Effective Complete: ${summary.effectiveComplete} / ${summary.totalTasks}    Unlocked: ${summary.unlocked}    Blocked: ${summary.blocked}    Health: ${summary.healthScore}%`);
    doc.text("Legend: X=Performed, /=Scheduled, 0=Behind, !=Inspection");
    doc.moveDown(0.5);

    const startX = 36;
    let y = doc.y;
    const colTask = 240;
    const colCompany = 100;
    const dayWidth = 28;

    doc.fontSize(8).text("Task", startX, y, { width: colTask });
    doc.text("Company", startX + colTask, y, { width: colCompany });
    for (let i = 0; i < dates.length; i += 1) {
      doc.text(format(dates[i], "M/d"), startX + colTask + colCompany + i * dayWidth, y, {
        width: dayWidth,
        align: "center",
      });
    }

    y += 14;
    doc.moveTo(startX, y).lineTo(startX + colTask + colCompany + dates.length * dayWidth, y).stroke();
    y += 4;

    const maxRows = Math.min(bundle.taskLite.length, 32);
    for (let r = 0; r < maxRows; r += 1) {
      const t = bundle.taskLite[r];
      if (y > 520) break;

      doc.fontSize(7).text(`${t.phase ?? ""} | ${t.taskName}`, startX, y, { width: colTask });
      doc.text(t.ownerCompany, startX + colTask, y, { width: colCompany });

      for (let i = 0; i < dates.length; i += 1) {
        const symbol = symbolMap.get(`${t.taskId}|${formatDateKey(dates[i])}`) ?? "";
        doc.text(symbol, startX + colTask + colCompany + i * dayWidth, y, { width: dayWidth, align: "center" });
      }

      y += 12;
      doc.moveTo(startX, y).lineTo(startX + colTask + colCompany + dates.length * dayWidth, y).strokeColor("#dddddd").stroke();
      y += 2;
    }

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("black").text("Call-Now Contact List", startX, y + 6);
    let cy = y + 20;
    for (const item of summary.callNowDetails.slice(0, 8)) {
      const contacts = item.contacts.length
        ? item.contacts.map((c) => `${c.name}${c.phone ? ` ${c.phone}` : ""}`).join("; ")
        : "No contact on file";
      doc.fontSize(8).text(`- ${item.taskId} ${item.taskName} (${item.ownerCompany}): ${contacts}`, startX, cy, {
        width: 760,
      });
      cy += 12;
    }

    const pdf = await toBuffer(doc);
    const bytes = new Uint8Array(pdf);
    const filename = `${summary.projectName.replace(/\s+/g, "_")}_2week_${summary.thisWeekStart}.pdf`;

    const amp = getAmplitudeClient();
    if (amp) {
      amp.track("Report Downloaded", {
        project_id: projectId,
        project_name: summary.projectName,
        format: asJson ? "json" : "pdf",
        task_count: bundle.taskLite.length,
      });
      await flushAmplitude();
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to generate report: ${(error as Error).message}` }, { status: 500 });
  }
}
