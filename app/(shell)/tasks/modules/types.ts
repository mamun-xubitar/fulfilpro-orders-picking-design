export type TaskState = 'completed' | 'pending' | 'overdue' | 'seriously_late';
export type TaskStateFilter = 'all' | 'pending' | 'overdue' | 'seriously_late' | 'completed';
export type TaskDueType = 'STANDARD' | 'URGENT' | 'CUSTOM';

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
  description: string;
  dueType: TaskDueType;
  dueDate: string;
  assigneeId: string;
};

export const EMPTY_TASK_FORM: TaskForm = {
  title: '',
  description: '',
  dueType: 'STANDARD',
  dueDate: '',
  assigneeId: '',
};
