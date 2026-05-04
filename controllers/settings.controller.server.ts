import { SettingsModel, type UpdateAppSettingsData } from '@/models/settings.model.server';

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
  'UTC',
]);
const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const SESSION_TIMEOUTS = new Set([15, 30, 60, 120, 240, 480, 720, 1440, 2880, 10080]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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

    if (errors.length) {
      return { error: { message: 'Validation failed', errors, status: 400 } };
    }

    const settings = await model.update(updateData);
    return { data: settings, message: 'Settings saved' };
  }
}
