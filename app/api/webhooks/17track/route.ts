import { NextRequest } from 'next/server';
import { verifyWebhookSignature } from '@/lib/seventrack.server';
import { TrackingModel } from '@/models/tracking.model.server';
import { applyTrackInfoToRow } from '@/lib/background-jobs.server';
import type { TrackInfoResult } from '@/lib/seventrack.server';

const trackingModel = new TrackingModel();

type SeventrackWebhookBody = {
  event?: string;
  data?: TrackInfoResult;
};

export async function POST(request: NextRequest) {
  const signatureHeader = request.headers.get('sign') ?? '';
  const rawBody = await request.text();

  console.log('Received 17track webhook');
  // console.log('17track headers:', Object.fromEntries(request.headers.entries()));

  const verified = await verifyWebhookSignature(rawBody, signatureHeader);
  if (!verified) {
    console.warn('17track webhook signature verification failed');
    return Response.json({ success: false, message: 'Invalid signature' }, { status: 401 });
  }

  let body: SeventrackWebhookBody;
  try {
    body = JSON.parse(rawBody) as SeventrackWebhookBody;
  } catch {
    return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const { event, data } = body;

  if (!event || !data?.number) {
    return Response.json({ success: true, message: 'No-op' }, { status: 200 });
  }

  
  try {
    if (event === 'TRACKING_UPDATED' || event === 'TRACKING_STOPPED') {
      const patch = applyTrackInfoToRow(data);
      // console.log("My event", JSON.stringify(patch, null, 2), event)

      await trackingModel.applyTrackInfo(data.number, {
        carrier: patch.carrier,
        status: patch.status,
        subStatus: patch.subStatus,
        lastEventAt: patch.lastEventAt,
        lastEventDesc: patch.lastEventDesc,
        lastEventLocation: patch.lastEventLocation,
        events: patch.events,
        lastSyncedAt: patch.lastSyncedAt,
      });

      console.log(`17track webhook processed: ${event} for ${data.number}`);
    }
  } catch (error) {
    console.error('17track webhook processing error', { event, number: data.number, error });
  }

  return Response.json({ success: true }, { status: 200 });
}
