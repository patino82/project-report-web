import { Client } from "@notionhq/client";

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
