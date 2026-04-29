import { SettingsModel } from '@/models/settings.model.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const model = new SettingsModel();

export async function POST() {
  try {
    const settings = await model.clearGoogleTokens();
    return apiSuccess({
      message: 'Google account disconnected',
      data: settings,
    });
  } catch (error) {
    console.error('[POST /api/settings/google/disconnect]', error);
    return apiError({ message: 'Failed to disconnect Google account', status: 500 });
  }
}
