import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return apiError({
      message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars are not set.',
      status: 500,
    });
  }

  const appUrl = getAppUrl(request);
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${appUrl}/api/settings/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', GOOGLE_SCOPES.join(' '));

  return apiSuccess({
    message: 'Google auth URL generated',
    data: { authUrl: url.toString() },
  });
}

function getAppUrl(request: NextRequest) {
  return process.env.APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;
}
