import { FulfillmentEditRequestModel } from '@/models/fulfillment-request.model.server';
import { OrderModel } from '@/models/order.model.server';
import type { FulfillmentTrackingInput } from '@/lib/shopify-fulfillment.server';

const requestModel = new FulfillmentEditRequestModel();
const orderModel = new OrderModel();

export class FulfillmentRequestController {
  async createRequest(body: unknown, requester: { id: string; name: string; email: string }, originUrl: string) {
    const parsed = parseCreateRequest(body);

    const result = await requestModel.create({
      orderId: parsed.orderId,
      orderNumber: parsed.orderNumber,
      fulfillmentId: parsed.fulfillmentId,
      requestType: parsed.requestType,
      requestedBy: requester,
      adminIds: parsed.adminIds,
      reason: parsed.reason,
      originUrl,
    });

    return { data: result, message: 'Permission request submitted' };
  }

  async listForOrder(orderId: string) {
    const result = await requestModel.listForOrder(orderId);
    return { data: result, message: 'Requests loaded' };
  }

  async listPending() {
    const result = await requestModel.listPending();
    return { data: result, message: 'Pending requests loaded' };
  }

  async listForStaff(staffId: string) {
    const result = await requestModel.listForStaff(staffId);
    return { data: result, message: 'Requests loaded' };
  }

  async approve(requestId: string, adminId: string, adminName: string) {
    const result = await requestModel.approveById(requestId, adminId, adminName);
    return { data: result, message: 'Request approved' };
  }

  async reject(requestId: string, adminId: string, adminName: string) {
    const result = await requestModel.rejectById(requestId, adminId, adminName);
    return { data: result, message: 'Request rejected' };
  }

  async approveByToken(requestId: string, token: string) {
    const result = await requestModel.approveByToken(requestId, token);
    return { data: result, message: 'Request approved' };
  }

  async rejectByToken(requestId: string, token: string) {
    const result = await requestModel.rejectByToken(requestId, token);
    return { data: result, message: 'Request rejected' };
  }

  async editFulfillment(
    orderId: string,
    fulfillmentId: string,
    body: unknown,
    role: string,
    userId: string
  ) {
    if (role !== 'admin') {
      const req = await requestModel.getActiveApprovedRequest(fulfillmentId, 'edit', userId);
      if (!req) throw new Error('You do not have permission to edit this fulfillment');
    }

    const editData = parseEditData(body);
    const result = await orderModel.editFulfillmentConfirmation(orderId, fulfillmentId, editData);

    if (role !== 'admin') {
      const req = await requestModel.getActiveApprovedRequest(fulfillmentId, 'edit', userId);
      if (req) await requestModel.markCompleted(req.id);
    }

    return { data: result, message: 'Fulfillment updated' };
  }

  async cancelFulfillment(
    orderId: string,
    fulfillmentId: string,
    role: string,
    userId: string,
    originUrl?: string
  ) {
    if (role !== 'admin') {
      const req = await requestModel.getActiveApprovedRequest(fulfillmentId, 'cancel', userId);
      if (!req) throw new Error('You do not have permission to cancel this fulfillment');
    }

    const result = await orderModel.cancelFulfillmentConfirmation(orderId, fulfillmentId, originUrl);

    if (role !== 'admin') {
      const req = await requestModel.getActiveApprovedRequest(fulfillmentId, 'cancel', userId);
      if (req) await requestModel.markCompleted(req.id);
    }

    return { data: result, message: 'Fulfillment cancelled' };
  }
}

function parseCreateRequest(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Request body is required');
  const v = body as Record<string, unknown>;

  const orderId = typeof v.orderId === 'string' ? v.orderId.trim() : '';
  const orderNumber = typeof v.orderNumber === 'number'
    ? String(v.orderNumber)
    : typeof v.orderNumber === 'string' ? v.orderNumber.trim() : '';
  const fulfillmentId = typeof v.fulfillmentId === 'string' ? v.fulfillmentId.trim() : '';
  if (!orderId) throw new Error('orderId is required');
  if (!orderNumber) throw new Error('orderNumber is required');
  if (!fulfillmentId) throw new Error('fulfillmentId is required');
  if (v.requestType !== 'edit' && v.requestType !== 'cancel') throw new Error('requestType must be "edit" or "cancel"');
  const requestType: 'edit' | 'cancel' = v.requestType;
  const reason = typeof v.reason === 'string' ? v.reason.trim() : '';
  const adminIds = Array.isArray(v.adminIds)
    ? v.adminIds.map((id) => String(id ?? '')).filter(Boolean)
    : [];

  if (!reason) throw new Error('Reason is required');
  if (reason.length > 2000) throw new Error('Reason must be 2000 characters or fewer');
  if (adminIds.length === 0) throw new Error('Select at least one admin');

  return { orderId, orderNumber, fulfillmentId, requestType, reason, adminIds };
}

function parseEditData(body: unknown) {
  if (!body || typeof body !== 'object') return {};
  const v = body as Record<string, unknown>;

  const result: {
    barcodes?: string[];
    fulfillmentDate?: string | null;
    trackingInfo?: FulfillmentTrackingInput | null;
  } = {};

  if ('barcodes' in v) {
    result.barcodes = Array.isArray(v.barcodes)
      ? v.barcodes.map((b) => String(b ?? '').trim()).filter(Boolean)
      : [];
  }

  if ('fulfillmentDate' in v) {
    const fd = typeof v.fulfillmentDate === 'string' ? v.fulfillmentDate.trim() : '';
    if (fd && !/^\d{4}-\d{2}-\d{2}$/.test(fd)) throw new Error('Invalid fulfillment date format');
    result.fulfillmentDate = fd || null;
  }

  if ('trackingInfo' in v) {
    const ti = v.trackingInfo;
    if (!ti || typeof ti !== 'object') {
      result.trackingInfo = null;
    } else {
      const t = ti as Record<string, unknown>;
      result.trackingInfo = {
        number: typeof t.number === 'string' ? t.number.trim() : undefined,
        url: typeof t.url === 'string' ? t.url.trim() : undefined,
        company: typeof t.company === 'string' ? t.company.trim() : undefined,
      };
    }
  }

  return result;
}
