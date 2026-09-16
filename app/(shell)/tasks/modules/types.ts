export type TaskState = 'completed' | 'pending' | 'overdue' | 'seriously_late';
export type TaskStateFilter = 'all' | 'pending' | 'overdue' | 'seriously_late' | 'completed' | 'recurring';
export type TaskDueType = 'STANDARD' | 'URGENT' | 'CUSTOM';
export type TaskRecurrenceType = 'DAILY' | 'WEEKLY';

export type SavedFile = {
  name: string;
  url: string;
  size: number;
  mimeType: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'COMPLETED';
  state: TaskState;
  dueDate: string;
  dueType: TaskDueType;
  completedAt: string | null;
  proofFiles: SavedFile[];
  assignerId: string;
  assignerName: string;
  assignerEmail: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  unreadCount: number;
  messageCount: number;
  recurringTaskId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringTaskAssignee = {
  id: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  description: string;
  createdAt: string;
};

export type RecurringTaskRow = {
  id: string;
  title: string;
  description: string;
  dueType: TaskDueType;
  recurrenceType: TaskRecurrenceType;
  recurrenceEndDate: string;
  stoppedAt: string | null;
  assignerId: string;
  assignerName: string;
  assignerEmail: string;
  assignees: RecurringTaskAssignee[];
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskMessageRow = {
  id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
};

export type TabCounts = {
  total: number;
  pending: number;
  overdue: number;
  seriouslyLate: number;
  completed: number;
  recurring: number;
};

export type ReportRow = {
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  count: number;
  avgMinutes: number;
  onTime: number;
  overdue: number;
  seriouslyLate: number;
};

export type ReportData = {
  overallAvgMinutes: number;
  totalCompleted: number;
  byAssignee: ReportRow[];
};

export type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type TaskForm = {
  title: string;
  perAssigneeDescription: boolean;
  description: string;
  descriptions: Record<string, string>;
  dueType: TaskDueType;
  dueDate: string;
  assigneeIds: string[];
  recurrence: '' | TaskRecurrenceType;
  recurrenceEndDate: string;
};

export const EMPTY_TASK_FORM: TaskForm = {
  title: '',
  perAssigneeDescription: false,
  description: '',
  descriptions: {},
  dueType: 'STANDARD',
  dueDate: '',
  assigneeIds: [],
  recurrence: '',
  recurrenceEndDate: '',
};
