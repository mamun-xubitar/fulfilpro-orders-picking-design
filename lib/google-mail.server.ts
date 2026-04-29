import prisma from '@/lib/prisma.server';

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function sendGoogleMail({
  to,
  subject,
  html,
  text,
}: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' } });

  if (!settings?.googleRefreshToken || !settings.googleEmail) {
    throw new Error('Google email is not connected in settings.');
  }

  const accessToken = await getValidAccessToken(settings);
  const raw = buildRawMessage({
    from: settings.googleEmail,
    to,
    subject,
    html,
    text,
  });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send Google email (${response.status}): ${body}`);
  }
}

async function getValidAccessToken(settings: {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiresAt: Date | null;
}) {
  const expiresAt = settings.googleTokenExpiresAt?.getTime() ?? 0;
  if (settings.googleAccessToken && expiresAt > Date.now() + 60_000) {
    return settings.googleAccessToken;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !settings.googleRefreshToken) {
    throw new Error('Google OAuth credentials are not configured.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: settings.googleRefreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await response.json() as GoogleTokenResponse;

  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Failed to refresh Google access token.');
  }

  await prisma.appSettings.update({
    where: { id: settings.id },
    data: {
      googleAccessToken: json.access_token,
      googleTokenExpiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    },
  });

  return json.access_token;
}

function buildRawMessage({
  from,
  to,
  subject,
  html,
  text,
}: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  const boundary = `fulfilpro_${Date.now()}`;
  const message = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encodeMimeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`;
}
