import { prisma } from "@/lib/prisma";
import { formatDateKey, isBeforeDateOnly, startOfWorkWeek } from "@/lib/domain";

export async function ensureProjectCalendarCurrent<T extends { id: string; thisWeekStart: Date }>(project: T): Promise<T> {
  const currentWeekStart = startOfWorkWeek();

  if (!isBeforeDateOnly(project.thisWeekStart, currentWeekStart)) {
    return project;
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      thisWeekStart: currentWeekStart,
      versionLogs: {
        create: {
          runType: "CALENDAR_ROLL_FORWARD",
          countsJson: {
            from: formatDateKey(project.thisWeekStart),
            to: formatDateKey(currentWeekStart),
          },
        },
      },
    },
  });

  return { ...project, thisWeekStart: updated.thisWeekStart };
}
