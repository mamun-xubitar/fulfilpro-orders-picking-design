import prisma from '@/lib/prisma.server';
import {
  getNormalizedEmailRuleSettings,
  listEmailRuleUsers,
  normalizeUserIdList,
  type EmailRuleUser,
} from '@/lib/email-rules.server';

export type AppSettingsRow = {
  timezone: string;
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
  sessionTimeoutMinutes: number;
  inactivityTimeoutMinutes: number | null;
  googleEmail: string | null;
  googleConnected: boolean;
  googleTokenExpiresAt: string | null;
  emailRules: {
    loginApprovalRecipientUserIds: string[];
    backInStockAdminRecipientUserIds: string[];
    stockAdjustmentRecipientUserIds: string[];
    fulfillmentRequestAllowedUserIds: string[];
    fulfillmentRequestDefaultUserIds: string[];
    pickingPackingAllowedUserIds: string[];
    pickingPackingDefaultUserIds: string[];
    directMessageAllowedUserIds: string[];
    directMessageDefaultUserIds: string[];
    backInStockRequesterUpdatesEnabled: boolean;
    eligibleUsers: {
      activeUsers: EmailRuleUser[];
      activeAdminUsers: EmailRuleUser[];
    };
  };
  decorationDigest: {
    mode: 'global_time' | 'per_user_working_hour';
    time: string;
    recipientUserIds: string[];
  };
  shipmentTracking: {
    seventrackApiKey: string | null;
    autoRegisterEnabled: boolean;
    pendingAlertDays: number;
    pendingAlertUserIds: string[];
    pickupReminderDays: number[];
  };
  updatedAt: string;
};

export type UpdateAppSettingsData = Partial<{
  timezone: string;
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
  sessionTimeoutMinutes: number;
  inactivityTimeoutMinutes: number | null;
  loginApprovalRecipientUserIds: string[];
  backInStockAdminRecipientUserIds: string[];
  stockAdjustmentRecipientUserIds: string[];
  fulfillmentRequestAllowedUserIds: string[];
  fulfillmentRequestDefaultUserIds: string[];
  pickingPackingAllowedUserIds: string[];
  pickingPackingDefaultUserIds: string[];
  directMessageAllowedUserIds: string[];
  directMessageDefaultUserIds: string[];
  backInStockRequesterUpdatesEnabled: boolean;
  decorationDigestMode: string;
  decorationDigestTime: string;
  decorationDigestRecipientUserIds: string[];
  seventrackApiKey: string | null;
  trackingAutoRegisterEnabled: boolean;
  trackingPendingAlertDays: number;
  trackingPendingAlertUserIds: string[];
  trackingPickupReminderDays: number[];
}>;

const SETTINGS_ID = 'default';
const DEFAULT_SETTINGS = {
  timezone: 'Australia/Sydney',
  staffAccessDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  staffAccessStart: '08:00',
  staffAccessEnd: '16:00',
  sessionTimeoutMinutes: 30,
  inactivityTimeoutMinutes: null,
  googleEmail: null,
  googleAccessToken: null,
  googleRefreshToken: null,
  googleTokenExpiresAt: null,
  loginApprovalRecipientUserIds: [] as string[],
  backInStockAdminRecipientUserIds: [] as string[],
  stockAdjustmentRecipientUserIds: [] as string[],
  fulfillmentRequestAllowedUserIds: [] as string[],
  fulfillmentRequestDefaultUserIds: [] as string[],
  pickingPackingAllowedUserIds: [] as string[],
  pickingPackingDefaultUserIds: [] as string[],
  directMessageAllowedUserIds: [] as string[],
  directMessageDefaultUserIds: [] as string[],
  backInStockRequesterUpdatesEnabled: true,
  decorationDigestMode: 'global_time',
  decorationDigestTime: '17:00',
  decorationDigestRecipientUserIds: [] as string[],
  seventrackApiKey: null,
  trackingAutoRegisterEnabled: false,
  trackingPendingAlertDays: 7,
  trackingPendingAlertUserIds: [] as string[],
  trackingPickupReminderDays: [] as number[],
};

type GoogleTokenData = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date | null;
  email: string;
};

export class SettingsModel {
  async get(): Promise<AppSettingsRow> {
    const settings = await prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: {
        id: SETTINGS_ID,
        ...DEFAULT_SETTINGS,
      },
    });

    return toSettingsRow(settings);
  }

  async update(data: UpdateAppSettingsData): Promise<AppSettingsRow> {
    const settings = await prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: {
        id: SETTINGS_ID,
        ...DEFAULT_SETTINGS,
        ...data,
      },
    });

    return toSettingsRow(settings);
  }

  async updateGoogleTokens(data: GoogleTokenData): Promise<AppSettingsRow> {
    const current = await prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: {
        id: SETTINGS_ID,
        ...DEFAULT_SETTINGS,
      },
    });

    const settings = await prisma.appSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        googleEmail: data.email,
        googleAccessToken: data.accessToken,
        googleRefreshToken: data.refreshToken ?? current.googleRefreshToken,
        googleTokenExpiresAt: data.tokenExpiresAt,
      },
    });

    return toSettingsRow(settings);
  }

  async clearGoogleTokens(): Promise<AppSettingsRow> {
    const settings = await prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {
        googleEmail: null,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
      },
      create: {
        id: SETTINGS_ID,
        ...DEFAULT_SETTINGS,
      },
    });

    return toSettingsRow(settings);
  }
}

async function toSettingsRow(settings: {
  timezone: string;
  staffAccessDays: unknown;
  staffAccessStart: string;
  staffAccessEnd: string;
  sessionTimeoutMinutes: number;
  inactivityTimeoutMinutes?: number | null;
  googleEmail: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiresAt: Date | null;
  loginApprovalRecipientUserIds: unknown;
  backInStockAdminRecipientUserIds: unknown;
  stockAdjustmentRecipientUserIds: unknown;
  fulfillmentRequestAllowedUserIds: unknown;
  fulfillmentRequestDefaultUserIds: unknown;
  pickingPackingAllowedUserIds: unknown;
  pickingPackingDefaultUserIds: unknown;
  directMessageAllowedUserIds: unknown;
  directMessageDefaultUserIds: unknown;
  backInStockRequesterUpdatesEnabled: boolean;
  decorationDigestMode?: string;
  decorationDigestTime?: string;
  decorationDigestRecipientUserIds?: unknown;
  seventrackApiKey?: string | null;
  trackingAutoRegisterEnabled?: boolean;
  trackingPendingAlertDays?: number;
  trackingPendingAlertUserIds?: unknown;
  trackingPickupReminderDays?: unknown;
  updatedAt: Date;
}): Promise<AppSettingsRow> {
  const { activeUsers, activeAdminUsers } = await listEmailRuleUsers();
  const emailRules = getNormalizedEmailRuleSettings(settings);

  const pickupReminderDays = Array.isArray(settings.trackingPickupReminderDays)
    ? (settings.trackingPickupReminderDays as unknown[]).filter((d): d is number => typeof d === 'number')
    : [];

  return {
    timezone: settings.timezone,
    staffAccessDays: normalizeDays(settings.staffAccessDays),
    staffAccessStart: settings.staffAccessStart,
    staffAccessEnd: settings.staffAccessEnd,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes ?? null,
    googleEmail: settings.googleEmail,
    googleConnected: Boolean(settings.googleEmail && settings.googleRefreshToken),
    googleTokenExpiresAt: settings.googleTokenExpiresAt?.toISOString() ?? null,
    emailRules: {
      loginApprovalRecipientUserIds: normalizeUserIdList(emailRules.loginApprovalRecipientUserIds),
      backInStockAdminRecipientUserIds: normalizeUserIdList(emailRules.backInStockAdminRecipientUserIds),
      stockAdjustmentRecipientUserIds: normalizeUserIdList(emailRules.stockAdjustmentRecipientUserIds),
      fulfillmentRequestAllowedUserIds: normalizeUserIdList(emailRules.fulfillmentRequestAllowedUserIds),
      fulfillmentRequestDefaultUserIds: normalizeUserIdList(emailRules.fulfillmentRequestDefaultUserIds),
      pickingPackingAllowedUserIds: normalizeUserIdList(emailRules.pickingPackingAllowedUserIds),
      pickingPackingDefaultUserIds: normalizeUserIdList(emailRules.pickingPackingDefaultUserIds),
      directMessageAllowedUserIds: normalizeUserIdList(emailRules.directMessageAllowedUserIds),
      directMessageDefaultUserIds: normalizeUserIdList(emailRules.directMessageDefaultUserIds),
      backInStockRequesterUpdatesEnabled: emailRules.backInStockRequesterUpdatesEnabled,
      eligibleUsers: {
        activeUsers,
        activeAdminUsers,
      },
    },
    decorationDigest: {
      mode: settings.decorationDigestMode === 'per_user_working_hour' ? 'per_user_working_hour' : 'global_time',
      time: settings.decorationDigestTime ?? DEFAULT_SETTINGS.decorationDigestTime,
      recipientUserIds: normalizeUserIdList(settings.decorationDigestRecipientUserIds),
    },
    shipmentTracking: {
      seventrackApiKey: settings.seventrackApiKey ?? null,
      autoRegisterEnabled: settings.trackingAutoRegisterEnabled ?? false,
      pendingAlertDays: settings.trackingPendingAlertDays ?? DEFAULT_SETTINGS.trackingPendingAlertDays,
      pendingAlertUserIds: normalizeUserIdList(settings.trackingPendingAlertUserIds),
      pickupReminderDays,
    },
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.staffAccessDays;
  return value.filter((day): day is string => typeof day === 'string');
}
