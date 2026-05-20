export type TaskLite = {
  taskId: string;
  taskName: string;
  phase?: string | null;
  trade?: string | null;
  ownerCompany: string;
  durationDays: number;
  predecessors: string[];
  requiresInspection: boolean;
  callNow: boolean;
};

export type StatusLite = {
  taskId: string;
  status: string;
  confirmedComplete: boolean;
  inspectionRequired: boolean;
  inspectionPassed: boolean;
  lastUpdated?: string | null;
};

export type ContactLite = {
  company: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  isPrimary?: boolean;
};

export type UnlockItem = {
  taskId: string;
  taskName: string;
  ownerCompany: string;
  phase?: string | null;
  trade?: string | null;
  complete: boolean;
  unlocked: boolean;
  blockedBy: string[];
  callNow: boolean;
  requiresInspection: boolean;
};

export type DashboardSummary = {
  projectId: string;
  projectName: string;
  thisWeekStart: string;
  effectiveComplete: number;
  totalTasks: number;
  unlocked: number;
  blocked: number;
  callNow: number;
  openInspectionCount: number;
  healthScore: number;
  criticalPathTaskIds: string[];
  criticalPathDays: number;
  callNowDetails: Array<{
    taskId: string;
    taskName: string;
    ownerCompany: string;
    contacts: ContactLite[];
  }>;
  assistantActions: string[];
};
