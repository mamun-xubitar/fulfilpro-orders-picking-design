import prisma from '@/lib/prisma.server';

export type AppSettingsRow = {
  timezone: string;
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
  sessionTimeoutMinutes: number;
  updatedAt: string;
};

export type UpdateAppSettingsData = Partial<{
  timezone: string;
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
  sessionTimeoutMinutes: number;
}>;

const SETTINGS_ID = 'default';
const DEFAULT_SETTINGS = {
  timezone: 'Australia/Sydney',
  staffAccessDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  staffAccessStart: '08:00',
  staffAccessEnd: '16:00',
  sessionTimeoutMinutes: 30,
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
}

function toSettingsRow(settings: {
  timezone: string;
  staffAccessDays: unknown;
  staffAccessStart: string;
  staffAccessEnd: string;
  sessionTimeoutMinutes: number;
  updatedAt: Date;
}): AppSettingsRow {
  return {
    timezone: settings.timezone,
    staffAccessDays: normalizeDays(settings.staffAccessDays),
    staffAccessStart: settings.staffAccessStart,
    staffAccessEnd: settings.staffAccessEnd,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.staffAccessDays;
  return value.filter((day): day is string => typeof day === 'string');
}
