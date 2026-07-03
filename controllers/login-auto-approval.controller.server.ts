import { LoginAutoApprovalModel } from '@/models/login-auto-approval.model.server';
import { getTodayInSettingsTz } from '@/lib/auth-policy.server';

const model = new LoginAutoApprovalModel();

export class LoginAutoApprovalController {
  async list() {
    const today = await getTodayInSettingsTz();
    const users = await model.listRestrictedUsers();

    return {
      data: {
        today,
        users: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          autoApproved: u.loginAutoApproveDate === today,
        })),
      },
      message: 'Login auto-approvals retrieved',
    };
  }

  async setForToday(body: unknown) {
    if (
      typeof body !== 'object' ||
      body === null ||
      !Array.isArray((body as Record<string, unknown>).userIds) ||
      !(body as Record<string, unknown[]>).userIds.every((id) => typeof id === 'string')
    ) {
      return { error: { message: 'Invalid input', errors: ['userIds must be an array of strings'], status: 400 } };
    }

    const userIds = (body as { userIds: string[] }).userIds;
    const today = await getTodayInSettingsTz();
    await model.setForToday(userIds, today);

    return { data: { today }, message: 'Auto-approvals updated for today' };
  }
}
