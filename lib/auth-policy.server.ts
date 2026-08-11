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

  let allowedTime: boolean;
  let allowedDay = policy.staffAccessDays.includes(day);

  if (end > start) {
    // Normal window: e.g., 08:00–16:00
    allowedTime = minutes >= start && minutes < end;
  } else {
    // Overnight window: e.g., 20:00–13:00 (wraps around midnight)
    allowedTime = minutes >= start || minutes < end;
    // if (minutes >= start) {
    //   // In the first part (today's portion): check today's day
    // } else {
    //   // In the second part (yesterday's portion): check yesterday's day
    //   const yesterday = moment(zoned).subtract(1, 'day');
    //   const yesterdayLabel = DAY_LABELS[yesterday.day()];
    //   allowedDay = policy.staffAccessDays.includes(yesterdayLabel);
    // }
  }

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

export async function getTodayInSettingsTz(): Promise<string> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' } });
  const timezone = settings?.timezone ?? DEFAULT_POLICY.timezone;
  return moment().tz(timezone).format('YYYY-MM-DD');
}

export async function computeUrgentDueDate(assigneeId: string, from: Date = new Date()): Promise<Date> {
  const policy = await getUserAuthPolicy(assigneeId);
  const [hours = '0', minutes = '0'] = policy.staffAccessEnd.split(':');
  const now = moment(from).tz(policy.timezone);

  let candidate = now.clone().hours(Number(hours)).minutes(Number(minutes)).seconds(0).milliseconds(0);

  const isAllowedDay = (m: moment.Moment) =>
    policy.staffAccessDays.length === 0 || policy.staffAccessDays.includes(DAY_LABELS[m.day()]);

  let iterations = 0;
  while ((candidate.isSameOrBefore(now) || !isAllowedDay(candidate)) && iterations < 14) {
    candidate = candidate.add(1, 'day');
    iterations += 1;
  }

  return candidate.toDate();
}

function parseTime(value: string) {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_POLICY.staffAccessDays;
  return value.filter((day): day is string => typeof day === 'string');
}
