import { SettingsModel, type UpdateAppSettingsData } from '@/models/settings.model.server';
import { listEmailRuleUsers, normalizeUserIdList } from '@/lib/email-rules.server';
import { sendAppMail } from '@/lib/email.server';

const model = new SettingsModel();

const TIMEZONES = new Set([
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Dhaka',
  'UTC',
]);
const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const SESSION_TIMEOUTS = new Set([15, 30, 60, 120, 240, 480, 720, 1440, 2880, 10080]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserScope = 'active_user' | 'active_admin';

export class SettingsController {
  async get() {
    const settings = await model.get();
    return { data: settings };
  }

  async update(body: unknown) {
    const data = body as Record<string, unknown>;
    const updateData: UpdateAppSettingsData = {};
    const errors: string[] = [];

    if ('timezone' in data) {
      if (typeof data.timezone !== 'string' || !TIMEZONES.has(data.timezone)) {
        errors.push('timezone: Select a valid timezone');
      } else {
        updateData.timezone = data.timezone;
      }
    }

    if ('staffAccessDays' in data) {
      if (!Array.isArray(data.staffAccessDays) || !data.staffAccessDays.every((day) => typeof day === 'string' && DAYS.has(day))) {
        errors.push('staffAccessDays: Select valid access days');
      } else {
        updateData.staffAccessDays = data.staffAccessDays;
      }
    }

    if ('staffAccessStart' in data) {
      if (typeof data.staffAccessStart !== 'string' || !TIME_PATTERN.test(data.staffAccessStart)) {
        errors.push('staffAccessStart: Enter a valid start time');
      } else {
        updateData.staffAccessStart = data.staffAccessStart;
      }
    }

    if ('staffAccessEnd' in data) {
      if (typeof data.staffAccessEnd !== 'string' || !TIME_PATTERN.test(data.staffAccessEnd)) {
        errors.push('staffAccessEnd: Enter a valid end time');
      } else {
        updateData.staffAccessEnd = data.staffAccessEnd;
      }
    }

    if ('sessionTimeoutMinutes' in data) {
      const timeout = Number(data.sessionTimeoutMinutes);
      if (!Number.isInteger(timeout) || !SESSION_TIMEOUTS.has(timeout)) {
        errors.push('sessionTimeoutMinutes: Select a valid session timeout');
      } else {
        updateData.sessionTimeoutMinutes = timeout;
      }
    }

    if ('inactivityTimeoutMinutes' in data) {
      if (data.inactivityTimeoutMinutes === null) {
        updateData.inactivityTimeoutMinutes = null;
      } else {
        const timeout = Number(data.inactivityTimeoutMinutes);
        if (!Number.isInteger(timeout) || timeout < 1) {
          errors.push('inactivityTimeoutMinutes: Enter a valid inactivity timeout (minimum 1 minute)');
        } else {
          updateData.inactivityTimeoutMinutes = timeout;
        }
      }
    }

    const hasEmailRulesInput = [
      'loginApprovalRecipientUserIds',
      'backInStockAdminRecipientUserIds',
      'stockAdjustmentRecipientUserIds',
      'fulfillmentRequestAllowedUserIds',
      'fulfillmentRequestDefaultUserIds',
      'pickingPackingAllowedUserIds',
      'pickingPackingDefaultUserIds',
      'directMessageAllowedUserIds',
      'directMessageDefaultUserIds',
      'backInStockRequesterUpdatesEnabled',
    ].some((key) => key in data);

    if (hasEmailRulesInput) {
      const [currentSettings, users] = await Promise.all([
        model.get(),
        listEmailRuleUsers(),
      ]);

      const activeUserIds = new Set(users.activeUsers.map((user) => user.id));
      const activeAdminIds = new Set(users.activeAdminUsers.map((user) => user.id));

      const next = {
        loginApprovalRecipientUserIds: currentSettings.emailRules.loginApprovalRecipientUserIds,
        backInStockAdminRecipientUserIds: currentSettings.emailRules.backInStockAdminRecipientUserIds,
        stockAdjustmentRecipientUserIds: currentSettings.emailRules.stockAdjustmentRecipientUserIds,
        fulfillmentRequestAllowedUserIds: currentSettings.emailRules.fulfillmentRequestAllowedUserIds,
        fulfillmentRequestDefaultUserIds: currentSettings.emailRules.fulfillmentRequestDefaultUserIds,
        pickingPackingAllowedUserIds: currentSettings.emailRules.pickingPackingAllowedUserIds,
        pickingPackingDefaultUserIds: currentSettings.emailRules.pickingPackingDefaultUserIds,
        directMessageAllowedUserIds: currentSettings.emailRules.directMessageAllowedUserIds,
        directMessageDefaultUserIds: currentSettings.emailRules.directMessageDefaultUserIds,
      };

      applyRecipientIdList({
        data,
        key: 'loginApprovalRecipientUserIds',
        label: 'loginApprovalRecipientUserIds',
        scope: 'active_admin',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'backInStockAdminRecipientUserIds',
        label: 'backInStockAdminRecipientUserIds',
        scope: 'active_user',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'stockAdjustmentRecipientUserIds',
        label: 'stockAdjustmentRecipientUserIds',
        scope: 'active_user',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'fulfillmentRequestAllowedUserIds',
        label: 'fulfillmentRequestAllowedUserIds',
        scope: 'active_admin',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'fulfillmentRequestDefaultUserIds',
        label: 'fulfillmentRequestDefaultUserIds',
        scope: 'active_admin',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'pickingPackingAllowedUserIds',
        label: 'pickingPackingAllowedUserIds',
        scope: 'active_user',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'pickingPackingDefaultUserIds',
        label: 'pickingPackingDefaultUserIds',
        scope: 'active_user',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'directMessageAllowedUserIds',
        label: 'directMessageAllowedUserIds',
        scope: 'active_user',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      applyRecipientIdList({
        data,
        key: 'directMessageDefaultUserIds',
        label: 'directMessageDefaultUserIds',
        scope: 'active_user',
        activeUserIds,
        activeAdminIds,
        target: next,
        updateData,
        errors,
      });

      validateDefaultSubset({
        data,
        defaultsKey: 'fulfillmentRequestDefaultUserIds',
        allowedKey: 'fulfillmentRequestAllowedUserIds',
        defaults: next.fulfillmentRequestDefaultUserIds,
        allowed: next.fulfillmentRequestAllowedUserIds,
        errors,
      });

      validateDefaultSubset({
        data,
        defaultsKey: 'pickingPackingDefaultUserIds',
        allowedKey: 'pickingPackingAllowedUserIds',
        defaults: next.pickingPackingDefaultUserIds,
        allowed: next.pickingPackingAllowedUserIds,
        errors,
      });

      validateDefaultSubset({
        data,
        defaultsKey: 'directMessageDefaultUserIds',
        allowedKey: 'directMessageAllowedUserIds',
        defaults: next.directMessageDefaultUserIds,
        allowed: next.directMessageAllowedUserIds,
        errors,
      });

      if ('backInStockRequesterUpdatesEnabled' in data) {
        if (typeof data.backInStockRequesterUpdatesEnabled !== 'boolean') {
          errors.push('backInStockRequesterUpdatesEnabled: Must be true or false');
        } else {
          updateData.backInStockRequesterUpdatesEnabled = data.backInStockRequesterUpdatesEnabled;
        }
      }
    }

    if ('decorationDigestMode' in data) {
      if (data.decorationDigestMode !== 'global_time' && data.decorationDigestMode !== 'per_user_working_hour') {
        errors.push('decorationDigestMode: Select a valid digest mode');
      } else {
        updateData.decorationDigestMode = data.decorationDigestMode;
      }
    }

    if ('decorationDigestTime' in data) {
      if (typeof data.decorationDigestTime !== 'string' || !TIME_PATTERN.test(data.decorationDigestTime)) {
        errors.push('decorationDigestTime: Enter a valid time');
      } else {
        updateData.decorationDigestTime = data.decorationDigestTime;
      }
    }

    if ('decorationDigestRecipientUserIds' in data) {
      const value = data.decorationDigestRecipientUserIds;
      if (!Array.isArray(value)) {
        errors.push('decorationDigestRecipientUserIds: Must be an array of user IDs');
      } else {
        const ids = normalizeUserIdList(value);
        const { activeAdminUsers } = await listEmailRuleUsers();
        const activeAdminIds = new Set(activeAdminUsers.map((user) => user.id));
        const invalidIds = ids.filter((id) => !activeAdminIds.has(id));
        if (invalidIds.length > 0) {
          errors.push('decorationDigestRecipientUserIds: Contains invalid IDs (must be active admins)');
        } else {
          updateData.decorationDigestRecipientUserIds = ids;
        }
      }
    }

    if ('embroideryKeywords' in data) {
      const value = data.embroideryKeywords;
      if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
        errors.push('embroideryKeywords: Must be an array of strings');
      } else {
        updateData.embroideryKeywords = value.map((v) => v.trim()).filter(Boolean);
      }
    }

    if ('printKeywords' in data) {
      const value = data.printKeywords;
      if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
        errors.push('printKeywords: Must be an array of strings');
      } else {
        updateData.printKeywords = value.map((v) => v.trim()).filter(Boolean);
      }
    }

    if ('decorationCrossVisibilityEnabled' in data) {
      if (typeof data.decorationCrossVisibilityEnabled !== 'boolean') {
        errors.push('decorationCrossVisibilityEnabled: Must be true or false');
      } else {
        updateData.decorationCrossVisibilityEnabled = data.decorationCrossVisibilityEnabled;
      }
    }

    if ('seventrackApiKey' in data) {
      if (data.seventrackApiKey !== null && typeof data.seventrackApiKey !== 'string') {
        errors.push('seventrackApiKey: Must be a string or null');
      } else {
        updateData.seventrackApiKey = data.seventrackApiKey as string | null;
      }
    }

    if ('emailProvider' in data) {
      if (data.emailProvider !== 'google' && data.emailProvider !== 'mailersend') {
        errors.push('emailProvider: Must be "google" or "mailersend"');
      } else {
        updateData.emailProvider = data.emailProvider;
      }
    }

    if ('mailersendApiToken' in data) {
      if (data.mailersendApiToken !== null && typeof data.mailersendApiToken !== 'string') {
        errors.push('mailersendApiToken: Must be a string or null');
      } else {
        const trimmed = typeof data.mailersendApiToken === 'string' ? data.mailersendApiToken.trim() : null;
        updateData.mailersendApiToken = trimmed || null;
      }
    }

    if ('mailersendFromEmail' in data) {
      if (data.mailersendFromEmail !== null && typeof data.mailersendFromEmail !== 'string') {
        errors.push('mailersendFromEmail: Must be a string or null');
      } else {
        const trimmed = typeof data.mailersendFromEmail === 'string' ? data.mailersendFromEmail.trim() : null;
        if (trimmed && !EMAIL_PATTERN.test(trimmed)) {
          errors.push('mailersendFromEmail: Enter a valid email address');
        } else {
          updateData.mailersendFromEmail = trimmed || null;
        }
      }
    }

    if (updateData.emailProvider) {
      const current = await model.get();
      if (updateData.emailProvider === 'mailersend') {
        const apiToken = 'mailersendApiToken' in updateData ? updateData.mailersendApiToken : current.mailersend.apiToken;
        const fromEmail = 'mailersendFromEmail' in updateData ? updateData.mailersendFromEmail : current.mailersend.fromEmail;
        if (!apiToken || !fromEmail) {
          errors.push('emailProvider: Configure the MailerSend API token and from email before activating it');
        }
      } else if (updateData.emailProvider === 'google' && !current.googleConnected) {
        errors.push('emailProvider: Connect a Google account before activating it');
      }
    }

    if ('trackingAutoRegisterEnabled' in data) {
      if (typeof data.trackingAutoRegisterEnabled !== 'boolean') {
        errors.push('trackingAutoRegisterEnabled: Must be true or false');
      } else {
        updateData.trackingAutoRegisterEnabled = data.trackingAutoRegisterEnabled;
      }
    }

    if ('trackingPendingAlertDays' in data) {
      const days = Number(data.trackingPendingAlertDays);
      if (!Number.isInteger(days) || days < 1) {
        errors.push('trackingPendingAlertDays: Must be a positive integer');
      } else {
        updateData.trackingPendingAlertDays = days;
      }
    }

    if ('trackingPendingAlertUserIds' in data) {
      const value = data.trackingPendingAlertUserIds;
      if (!Array.isArray(value)) {
        errors.push('trackingPendingAlertUserIds: Must be an array of user IDs');
      } else {
        const ids = normalizeUserIdList(value);
        const { activeUsers } = await listEmailRuleUsers();
        const activeUserIds = new Set(activeUsers.map((u) => u.id));
        const invalid = ids.filter((id) => !activeUserIds.has(id));
        if (invalid.length > 0) {
          errors.push('trackingPendingAlertUserIds: Contains invalid user IDs');
        } else {
          updateData.trackingPendingAlertUserIds = ids;
        }
      }
    }

    if ('trackingPickupReminderDays' in data) {
      const value = data.trackingPickupReminderDays;
      if (!Array.isArray(value)) {
        errors.push('trackingPickupReminderDays: Must be an array of numbers');
      } else {
        const days = (value as unknown[]).filter((d): d is number => typeof d === 'number' && Number.isInteger(d) && d > 0);
        if (days.length !== value.length) {
          errors.push('trackingPickupReminderDays: All entries must be positive integers');
        } else {
          updateData.trackingPickupReminderDays = days;
        }
      }
    }

    if ('taskVisibilityByUser' in data) {
      const value = data.taskVisibilityByUser;
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push('taskVisibilityByUser: Must be an object mapping user IDs to arrays of user IDs');
      } else {
        const { activeUsers } = await listEmailRuleUsers();
        const activeUserIds = new Set(activeUsers.map((user) => user.id));
        const entries = Object.entries(value as Record<string, unknown>);
        const invalidKeys = entries.filter(([userId]) => !activeUserIds.has(userId));
        if (invalidKeys.length > 0) {
          errors.push('taskVisibilityByUser: Contains invalid user IDs as keys (must be active users)');
        } else {
          const map: Record<string, string[]> = {};
          let hasInvalidValue = false;
          for (const [userId, ids] of entries) {
            const normalized = normalizeUserIdList(ids);
            if (normalized.some((id) => !activeUserIds.has(id))) {
              hasInvalidValue = true;
              break;
            }
            map[userId] = normalized;
          }
          if (hasInvalidValue) {
            errors.push('taskVisibilityByUser: Contains invalid IDs (must be active users)');
          } else {
            updateData.taskVisibilityByUser = map;
          }
        }
      }
    }

    if ('messageVisibilityByUser' in data) {
      const value = data.messageVisibilityByUser;
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push('messageVisibilityByUser: Must be an object mapping user IDs to arrays of user IDs');
      } else {
        const { activeUsers } = await listEmailRuleUsers();
        const activeUserIds = new Set(activeUsers.map((user) => user.id));
        const entries = Object.entries(value as Record<string, unknown>);
        const invalidKeys = entries.filter(([userId]) => !activeUserIds.has(userId));
        if (invalidKeys.length > 0) {
          errors.push('messageVisibilityByUser: Contains invalid user IDs as keys (must be active users)');
        } else {
          const map: Record<string, string[]> = {};
          let hasInvalidValue = false;
          for (const [userId, ids] of entries) {
            const normalized = normalizeUserIdList(ids);
            if (normalized.some((id) => !activeUserIds.has(id))) {
              hasInvalidValue = true;
              break;
            }
            map[userId] = normalized;
          }
          if (hasInvalidValue) {
            errors.push('messageVisibilityByUser: Contains invalid IDs (must be active users)');
          } else {
            updateData.messageVisibilityByUser = map;
          }
        }
      }
    }

    if (errors.length) {
      return { error: { message: 'Validation failed', errors, status: 400 } };
    }

    const settings = await model.update(updateData);
    return { data: settings, message: 'Settings saved' };
  }

  async sendTestEmail(recipient: string) {
    try {
      await sendAppMail({
        to: [recipient],
        subject: 'Test email from Order Fulfillment',
        html: '<p>This is a test email to confirm your email provider settings are working.</p>',
        text: 'This is a test email to confirm your email provider settings are working.',
      });
      return { message: `Test email sent to ${recipient}` };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Failed to send test email', status: 400 } };
    }
  }
}

function applyRecipientIdList(params: {
  data: Record<string, unknown>;
  key: keyof Pick<UpdateAppSettingsData,
    'loginApprovalRecipientUserIds'
    | 'backInStockAdminRecipientUserIds'
    | 'stockAdjustmentRecipientUserIds'
    | 'fulfillmentRequestAllowedUserIds'
    | 'fulfillmentRequestDefaultUserIds'
    | 'pickingPackingAllowedUserIds'
    | 'pickingPackingDefaultUserIds'
    | 'directMessageAllowedUserIds'
    | 'directMessageDefaultUserIds'
  >;
  label: string;
  scope: UserScope;
  activeUserIds: Set<string>;
  activeAdminIds: Set<string>;
  target: Record<string, string[]>;
  updateData: UpdateAppSettingsData;
  errors: string[];
}) {
  if (!(params.key in params.data)) return;

  const value = params.data[params.key];
  if (!Array.isArray(value)) {
    params.errors.push(`${params.label}: Must be an array of user IDs`);
    return;
  }

  const ids = normalizeUserIdList(value);
  const allowedSet = params.scope === 'active_admin' ? params.activeAdminIds : params.activeUserIds;

  const invalidIds = ids.filter((id) => !allowedSet.has(id));
  if (invalidIds.length > 0) {
    const scopeLabel = params.scope === 'active_admin' ? 'active admins' : 'active users';
    params.errors.push(`${params.label}: Contains invalid IDs (must be ${scopeLabel})`);
    return;
  }

  params.target[params.key] = ids;
  params.updateData[params.key] = ids;
}

function validateDefaultSubset(params: {
  data: Record<string, unknown>;
  defaultsKey: string;
  allowedKey: string;
  defaults: string[];
  allowed: string[];
  errors: string[];
}) {
  if (!(params.defaultsKey in params.data) && !(params.allowedKey in params.data)) {
    return;
  }

  const allowedSet = new Set(params.allowed);
  const invalid = params.defaults.filter((id) => !allowedSet.has(id));
  if (invalid.length > 0) {
    params.errors.push(`${params.defaultsKey}: Default recipients must be included in ${params.allowedKey}`);
  }
}
