import { DecorationModel } from '@/models/decoration.model.server';

const model = new DecorationModel();

export class DecorationController {
  async listDecoratorUsers() {
    const users = await model.listDecoratorUsers();
    return { data: users, message: 'Decorator users retrieved' };
  }

  async assignLineItem(
    orderId: string,
    lineItemId: string,
    body: unknown,
    admin: { id?: string | null; name?: string | null }
  ) {
    const { assigneeId, dueDate } = parseAssignmentInput(body);
    const assignments = await model.createAssignment({ orderId, lineItemId, assigneeId, dueDate, assignedBy: admin });
    return { data: { assignments }, message: 'Assignment added' };
  }

  async removeAssignment(orderId: string, lineItemId: string, assignmentId: string) {
    const assignments = await model.deleteAssignment(orderId, lineItemId, assignmentId);
    return { data: { assignments }, message: 'Assignment removed' };
  }
}

function parseAssignmentInput(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Assignment data is required');
  }

  const value = body as Record<string, unknown>;
  const assigneeId = typeof value.assigneeId === 'string' ? value.assigneeId.trim() : '';
  if (!assigneeId) {
    throw new Error('Assignee is required');
  }

  let dueDate: string | null = null;
  if (value.dueDate != null && value.dueDate !== '') {
    const raw = typeof value.dueDate === 'string' ? value.dueDate.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new Error('Due date must be a valid date');
    }
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
      throw new Error('Due date must be a valid date');
    }
    dueDate = raw;
  }

  return { assigneeId, dueDate };
}
