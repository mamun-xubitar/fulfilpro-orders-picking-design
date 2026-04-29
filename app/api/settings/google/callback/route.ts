import { NextRequest, NextResponse } from 'next/server';
import { SettingsModel } from '@/models/settings.model.server';

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  error?: string;
};

const model = new SettingsModel();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const settingsUrl = `${getAppUrl(request)}/settings`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?googleError=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?googleError=missing_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${settingsUrl}?googleError=missing_env_credentials`);
    }

    const tokenData = await exchangeCodeForToken({
      code,
      clientId,
      clientSecret,
      redirectUri: `${getAppUrl(request)}/api/settings/google/callback`,
    });

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${settingsUrl}?googleError=missing_access_token`);
    }

    const userInfo = await getGoogleUserInfo(tokenData.access_token);

    if (!userInfo.email) {
      return NextResponse.redirect(`${settingsUrl}?googleError=missing_google_email`);
    }

    await model.updateGoogleTokens({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      email: userInfo.email,
    });

    return NextResponse.redirect(`${settingsUrl}?googleConnected=1`);
  } catch (err) {
    console.error('[GET /api/settings/google/callback]', err);
    const message = err instanceof Error ? err.message : 'oauth_failed';
    return NextResponse.redirect(`${settingsUrl}?googleError=${encodeURIComponent(message)}`);
  }
}

async function exchangeCodeForToken({
  code,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const json = await response.json() as GoogleTokenResponse;

  if (!response.ok) {
    throw new Error(json.error_description || json.error || 'google_token_exchange_failed');
  }

  return json;
}

async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await response.json() as GoogleUserInfoResponse;

  if (!response.ok) {
    throw new Error(json.error || 'google_userinfo_failed');
  }

  return json;
}

function getAppUrl(request: NextRequest) {
  return process.env.APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;
}
