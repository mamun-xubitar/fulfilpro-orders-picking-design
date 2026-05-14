import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';

export type AuthPolicy = {
  timezone: string;
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
  sessionTimeoutMinutes: number;
  inactivityTimeoutMinutes: number | null;
};

const DEFAULT_POLICY: AuthPolicy = {
  timezone: 'Australia/Sydney',
  staffAccessDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  staffAccessStart: '08:00',
  staffAccessEnd: '16:00',
  sessionTimeoutMinutes: 30,
  inactivityTimeoutMinutes: null,
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function getAuthPolicy(): Promise<AuthPolicy> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' } });

  return {
    timezone: settings?.timezone ?? DEFAULT_POLICY.timezone,
    staffAccessDays: normalizeDays(DEFAULT_POLICY.staffAccessDays),
    staffAccessStart: DEFAULT_POLICY.staffAccessStart,
    staffAccessEnd: DEFAULT_POLICY.staffAccessEnd,
    sessionTimeoutMinutes: DEFAULT_POLICY.sessionTimeoutMinutes,
    inactivityTimeoutMinutes: null,
  };
}

export async function getUserAuthPolicy(userId: string): Promise<AuthPolicy> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      staffAccessDays: true,
      staffAccessStart: true,
      staffAccessEnd: true,
      sessionTimeoutMinutes: true,
      inactivityTimeoutMinutes: true,
    },
  });
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' } });

  if (!user) {
    return getAuthPolicy();
  }

  return {
    timezone: settings?.timezone ?? DEFAULT_POLICY.timezone,
    staffAccessDays: normalizeDays(user.staffAccessDays),
    staffAccessStart: user.staffAccessStart ?? DEFAULT_POLICY.staffAccessStart,
    staffAccessEnd: user.staffAccessEnd ?? DEFAULT_POLICY.staffAccessEnd,
    sessionTimeoutMinutes: user.sessionTimeoutMinutes ?? DEFAULT_POLICY.sessionTimeoutMinutes,
    inactivityTimeoutMinutes: user.inactivityTimeoutMinutes ?? null,
  };
}

export function evaluateStaffAccess(policy: AuthPolicy, now = new Date()) {
  const zoned = moment(now).tz(policy.timezone);
  const day = DAY_LABELS[zoned.day()];
  const minutes = zoned.hours() * 60 + zoned.minutes();
  const start = parseTime(policy.staffAccessStart);
  const end = parseTime(policy.staffAccessEnd);
  const allowedDay = policy.staffAccessDays.includes(day);
  const allowedTime = minutes >= start && minutes < end;
  return {
    allowed: allowedDay && allowedTime,
    allowedDay,
    allowedTime,
    day,
    currentTime: zoned.format('YYYY-MM-DD HH:mm z'),
    timezone: policy.timezone,
    staffAccessDays: policy.staffAccessDays,
    staffAccessStart: policy.staffAccessStart,
    staffAccessEnd: policy.staffAccessEnd,
  };
}

export function getSessionExpiresAt(loginAt: number, timeoutMinutes: number) {
  return loginAt + timeoutMinutes * 60 * 1000;
}

function parseTime(value: string) {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_POLICY.staffAccessDays;
  return value.filter((day): day is string => typeof day === 'string');
}
