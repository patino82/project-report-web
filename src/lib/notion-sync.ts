import { Client } from "@notionhq/client";
import { prisma } from "@/lib/prisma";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DB_PROJECTS = "2608b7ee283b8080b2fed4ea9e15e2f3";
const DB_TASKS = "2608b7ee283b80e1b7d4d05719293505";
const DB_DAILY_LOGS = "2608b7ee283b805793aaccb78b9ca7db";
const DB_OPEN_ITEMS = "2688b7ee283b80d6959ed3b0eb190e1b"; // Mapped to Risks/Blockers

export async function pushProjectToNotion(project: { name: string; location?: string | null }) {
  if (!process.env.NOTION_TOKEN) return null;

  try {
    const response = await notion.pages.create({
      parent: { database_id: DB_PROJECTS },
      properties: {
        Name: {
          title: [{ text: { content: project.name } }],
        },
        Location: {
          rich_text: [{ text: { content: project.location || "" } }],
        },
      },
    });
    return response.id;
  } catch (error) {
    console.error("Failed to push project to Notion", error);
    return null;
  }
}

export function syncProjectToNotionInBackground(project: { id: string; name: string; location?: string | null }) {
  void (async () => {
    try {
      const notionId = await pushProjectToNotion({
        name: project.name,
        location: project.location,
      });

      if (!notionId) return;

      await prisma.project.update({
        where: { id: project.id },
        data: { notionId },
      });
    } catch (error) {
      console.error("Failed to store project Notion ID", error);
    }
  })();
}

export async function retryPendingProjectNotionSync(limit = 25) {
  const projects = await prisma.project.findMany({
    where: { notionId: null },
    take: limit,
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, location: true },
  });

  for (const project of projects) {
    const notionId = await pushProjectToNotion({
      name: project.name,
      location: project.location,
    });

    if (!notionId) continue;

    await prisma.project.update({
      where: { id: project.id },
      data: { notionId },
    });
  }
}

export async function pushDailyLogToNotion(log: {
  projectId: string;
  notionProjectId?: string | null;
  content: string;
  author: string;
  date: Date;
}) {
  if (!process.env.NOTION_TOKEN || !log.notionProjectId) return null;

  try {
    const response = await notion.pages.create({
      parent: { database_id: DB_DAILY_LOGS },
      properties: {
        Date: {
          date: { start: log.date.toISOString().split("T")[0] },
        },
        Content: {
          rich_text: [{ text: { content: log.content } }],
        },
        Author: {
          rich_text: [{ text: { content: log.author } }],
        },
        Project: {
          relation: [{ id: log.notionProjectId }],
        },
      },
    });
    return response.id;
  } catch (error) {
    console.error("Failed to push daily log to Notion", error);
    return null;
  }
}

export function syncDailyLogToNotionInBackground(log: {
  id: string;
  projectId: string;
  notionProjectId?: string | null;
  content: string;
  author: string;
  date: Date;
}) {
  void (async () => {
    try {
      const notionId = await pushDailyLogToNotion(log);
      if (!notionId) return;

      await prisma.siteLog.update({
        where: { id: log.id },
        data: { notionId },
      });
    } catch (error) {
      console.error("Failed to store daily log Notion ID", error);
    }
  })();
}

export async function pushOpenItemToNotion(item: {
  projectId: string;
  notionProjectId?: string | null;
  description: string;
  priority: string;
  dueDate?: Date | null;
}) {
  if (!process.env.NOTION_TOKEN || !item.notionProjectId) return null;

  try {
    const properties: any = {
      Description: {
        title: [{ text: { content: item.description } }],
      },
      Priority: {
        select: { name: item.priority },
      },
      Project: {
        relation: [{ id: item.notionProjectId }],
      },
    };

    if (item.dueDate) {
      properties["Due Date"] = {
        date: { start: item.dueDate.toISOString().split("T")[0] },
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: DB_OPEN_ITEMS },
      properties,
    });
    return response.id;
  } catch (error) {
    console.error("Failed to push open item to Notion", error);
    return null;
  }
}

export function syncOpenItemToNotionInBackground(item: {
  id: string;
  projectId: string;
  notionProjectId?: string | null;
  description: string;
  priority: string;
  dueDate?: Date | null;
}) {
  void (async () => {
    try {
      const notionId = await pushOpenItemToNotion(item);
      if (!notionId) return;

      await prisma.openItem.update({
        where: { id: item.id },
        data: { notionId },
      });
    } catch (error) {
      console.error("Failed to store open item Notion ID", error);
    }
  })();
}
