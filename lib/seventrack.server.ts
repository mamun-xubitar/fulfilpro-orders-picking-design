import crypto from 'crypto';
import prisma from '@/lib/prisma.server';

const BASE_URL = 'https://api.17track.net/track/v2.4';
const BATCH_SIZE = 40;
const RATE_LIMIT_DELAY_MS = 350; // 2.86 req/s — safely under the 3 req/s limit

type TrackItem = { number: string; carrier?: number; tag?: string };

type SeventrackResponse = {
  code: number;
  data?: {
    accepted?: Array<{ number: string; carrier?: number; tag?: string }>;
    rejected?: Array<{ number: string; error?: { code: number; message: string } }>;
  };
};

type EventEntry = {
  time_utc?: string;
  description?: string;
  stage?: string;
  location?: string;
};

type TrackInfoProvider = {
  events?: EventEntry[];
};

type TrackInfo = {
  latest_status?: { status?: string; sub_status?: string };
  latest_event?: { time_utc?: string; description?: string; stage?: string; location?: string };
  tracking?: { providers?: TrackInfoProvider[] };
};

export type TrackInfoResult = {
  number: string;
  carrier?: number;
  tag?: string;
  track_info?: TrackInfo;
};

type GetTrackInfoResponse = {
  code: number;
  data?: {
    accepted?: TrackInfoResult[];
    rejected?: Array<{ number: string; error?: { code: number; message: string } }>;
  };
};

async function getApiKey(): Promise<string> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { seventrackApiKey: true },
  });
  const key = settings?.seventrackApiKey?.trim();
  if (!key) throw new Error('17track API key is not configured in settings.');
  return key;
}

async function callApi(endpoint: string, items: TrackItem[]): Promise<SeventrackResponse> {
  const apiKey = await getApiKey();
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      '17token': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(items),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`17track ${endpoint} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<SeventrackResponse>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function batchCall(endpoint: string, items: TrackItem[]) {
  const results: SeventrackResponse[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const result = await callApi(endpoint, batch);
    results.push(result);
    if (i + BATCH_SIZE < items.length) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }
  return results;
}

export async function registerTracking(items: TrackItem[]) {
  return batchCall('register', items);
}

export async function stopTracking(items: TrackItem[]) {
  return batchCall('stoptrack', items);
}

export async function retrack(items: TrackItem[]) {
  return batchCall('retrack', items);
}

export async function deleteTracking(items: TrackItem[]) {
  return batchCall('deletetrack', items);
}

export async function getTrackInfo(items: TrackItem[]): Promise<GetTrackInfoResponse[]> {
  const apiKey = await getApiKey();
  const results: GetTrackInfoResponse[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${BASE_URL}/gettrackinfo`, {
      method: 'POST',
      headers: {
        '17token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`17track gettrackinfo failed (${res.status}): ${text}`);
    }

    results.push(await res.json() as GetTrackInfoResponse);
    if (i + BATCH_SIZE < items.length) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  return results;
}

export async function verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
  const secret = await getApiKey();
  if (!secret) return false;

  const digest = crypto
    .createHash('sha256')
    .update(rawBody + '/' + secret, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
