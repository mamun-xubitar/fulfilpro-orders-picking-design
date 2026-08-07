import {
  DecorationModel,
  normalizeFileRefs,
  type DecorationWorkComment,
  type OrderDecorationAttachments,
} from '@/models/decoration.model.server';
import { DecorationEditRequestModel } from '@/models/decoration-request.model.server';

const model = new DecorationModel();
const requestModel = new DecorationEditRequestModel();

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

  async markWorkDone(
    orderId: string,
    lineItemId: string,
    body: unknown,
    worker: { id: string; name: string; email: string; role: string }
  ) {
    const { quantityDone, comments } = parseWorkInput(body);
    await model.createWork({ orderId, lineItemId, worker, quantityDone, comments });
    const decoration = await model.getLineDecorationState(orderId, lineItemId, { id: worker.id, role: worker.role });
    return { data: { orderId, lineItemId, decoration }, message: 'Marked as done' };
  }

  async removeWork(orderId: string, lineItemId: string, workId: string, viewer: { id: string; role: string }) {
    await model.deleteWork({ orderId, lineItemId, workId, viewer });
    const decoration = await model.getLineDecorationState(orderId, lineItemId, viewer);
    return { data: { orderId, lineItemId, decoration }, message: 'Work removed' };
  }

  async requestEditAccess(
    orderId: string,
    lineItemId: string,
    body: unknown,
    requestedBy: { id: string; name: string; email: string; role: string },
    originUrl: string
  ) {
    const reason = parseReason(body);
    const order = await model.getLineItemMeta(orderId, lineItemId);
    const request = await requestModel.create({
      orderId,
      orderNumber: order.orderNumber,
      lineItemId,
      productTitle: order.productTitle,
      requestedBy,
      reason,
      originUrl,
    });
    return { data: { request }, message: 'Edit access requested' };
  }

  async approveRequestByToken(requestId: string, token: string) {
    return requestModel.approveByToken(requestId, token);
  }

  async rejectRequestByToken(requestId: string, token: string) {
    return requestModel.rejectByToken(requestId, token);
  }

  async updateOrderAttachments(orderId: string, body: unknown) {
    const patch = parseOrderAttachmentsInput(body);
    const attachments = await model.upsertOrderAttachments(orderId, patch);
    return { data: { orderId, attachments }, message: 'Attachments updated' };
  }

  async actOnRequest(requestId: string, action: string, admin: { id: string; name: string }) {
    if (action === 'approve') {
      const request = await requestModel.approveById(requestId, admin.id, admin.name);
      return { data: { request }, message: 'Request approved' };
    }
    if (action === 'reject') {
      const request = await requestModel.rejectById(requestId, admin.id, admin.name);
      return { data: { request }, message: 'Request rejected' };
    }
    throw new Error("action must be 'approve' or 'reject'");
  }
}

function parseWorkInput(body: unknown): { quantityDone: number; comments: DecorationWorkComment[] } {
  if (!body || typeof body !== 'object') throw new Error('Work data is required');
  const value = body as Record<string, unknown>;
  const quantityDone = Number(value.quantityDone ?? 0);
  if (!Number.isFinite(quantityDone) || quantityDone < 1) throw new Error('Quantity must be at least 1');
  const comments = Array.isArray(value.comments) ? (value.comments as DecorationWorkComment[]) : [];
  return { quantityDone, comments };
}

function parseOrderAttachmentsInput(body: unknown): Partial<OrderDecorationAttachments> {
  if (!body || typeof body !== 'object') throw new Error('Attachment data is required');
  const value = body as Record<string, unknown>;
  const patch: Partial<OrderDecorationAttachments> = {};

  if ('files' in value) patch.files = normalizeFileRefs(value.files);
  if ('customerDesign' in value) patch.customerDesign = normalizeFileRefs(value.customerDesign);
  if ('photos' in value) patch.photos = normalizeFileRefs(value.photos);
  if ('customerRemarks' in value) {
    patch.customerRemarks = typeof value.customerRemarks === 'string' ? value.customerRemarks.trim() : '';
  }

  if (Object.keys(patch).length === 0) throw new Error('No attachment fields provided');
  return patch;
}

function parseReason(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const value = body as Record<string, unknown>;
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (reason.length > 2000) throw new Error('Reason must be 2000 characters or fewer');
  return reason;
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
