'use client';

import { useState, useEffect } from 'react';
import type { AppSettingsRow } from '@/models/settings.model.server';

const SECTION_LABELS: Record<string, string> = {
  timezone: 'Timezone',
  emailRules: 'Email Sending Rules',
  decorationDigest: 'Decoration Work Digest',
  tracking: 'Shipment Tracking',
};

const DEFAULT_EMAIL_RULES: AppSettingsRow['emailRules'] = {
  loginApprovalRecipientUserIds: [],
  backInStockAdminRecipientUserIds: [],
  stockAdjustmentRecipientUserIds: [],
  fulfillmentRequestAllowedUserIds: [],
  fulfillmentRequestDefaultUserIds: [],
  pickingPackingAllowedUserIds: [],
  pickingPackingDefaultUserIds: [],
  directMessageAllowedUserIds: [],
  directMessageDefaultUserIds: [],
  backInStockRequesterUpdatesEnabled: true,
  eligibleUsers: { activeUsers: [], activeAdminUsers: [] },
};

const DEFAULT_DECORATION_DIGEST: AppSettingsRow['decorationDigest'] = {
  mode: 'global_time',
  time: '17:00',
  recipientUserIds: [],
};

const DEFAULT_TRACKING: AppSettingsRow['shipmentTracking'] = {
  seventrackApiKey: null,
  autoRegisterEnabled: false,
  pendingAlertDays: 7,
  pendingAlertUserIds: [],
  pickupReminderDays: [],
};

type ApiResponse<T> = { success: boolean; message: string; data: T };
export type SettingsSection = 'timezone' | 'emailRules' | 'decorationDigest' | 'tracking';

async function getJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

export function useSettingsData() {
  const [tz, setTz] = useState('Australia/Sydney');
  const [emailRules, setEmailRules] = useState<AppSettingsRow['emailRules']>(DEFAULT_EMAIL_RULES);
  const [decorationDigest, setDecorationDigest] = useState<AppSettingsRow['decorationDigest']>(DEFAULT_DECORATION_DIGEST);
  const [tracking, setTracking] = useState<AppSettingsRow['shipmentTracking']>(DEFAULT_TRACKING);
  const [saveMsg, setSaveMsg] = useState('');
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [savingSection, setSavingSection] = useState<SettingsSection | null>(null);
  const [error, setError] = useState('');
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const applySettings = (settings: AppSettingsRow) => {
    setTz(settings.timezone);
    setGoogleEmail(settings.googleEmail);
    setGoogleConnected(settings.googleConnected);
    setEmailRules(settings.emailRules);
    setDecorationDigest(settings.decorationDigest);
    setTracking(settings.shipmentTracking);
  };

  const save = async (section: SettingsSection) => {
    setError('');
    setSavingSection(section);
    let payload: Record<string, unknown>;
    if (section === 'timezone') {
      payload = { timezone: tz };
    } else if (section === 'decorationDigest') {
      payload = {
        decorationDigestMode: decorationDigest.mode,
        decorationDigestTime: decorationDigest.time,
        decorationDigestRecipientUserIds: decorationDigest.recipientUserIds,
      };
    } else if (section === 'tracking') {
      payload = {
        seventrackApiKey: tracking.seventrackApiKey,
        trackingAutoRegisterEnabled: tracking.autoRegisterEnabled,
        trackingPendingAlertDays: tracking.pendingAlertDays,
        trackingPendingAlertUserIds: tracking.pendingAlertUserIds,
        trackingPickupReminderDays: tracking.pickupReminderDays,
      };
    } else {
      payload = {
        loginApprovalRecipientUserIds: emailRules.loginApprovalRecipientUserIds,
        backInStockAdminRecipientUserIds: emailRules.backInStockAdminRecipientUserIds,
        stockAdjustmentRecipientUserIds: emailRules.stockAdjustmentRecipientUserIds,
        fulfillmentRequestAllowedUserIds: emailRules.fulfillmentRequestAllowedUserIds,
        fulfillmentRequestDefaultUserIds: emailRules.fulfillmentRequestDefaultUserIds,
        pickingPackingAllowedUserIds: emailRules.pickingPackingAllowedUserIds,
        pickingPackingDefaultUserIds: emailRules.pickingPackingDefaultUserIds,
        directMessageAllowedUserIds: emailRules.directMessageAllowedUserIds,
        directMessageDefaultUserIds: emailRules.directMessageDefaultUserIds,
        backInStockRequesterUpdatesEnabled: emailRules.backInStockRequesterUpdatesEnabled,
      };
    }
    try {
      const settings = await getJson<AppSettingsRow>('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      applySettings(settings);
      setSaveMsg(`${SECTION_LABELS[section]} saved.`);
      setShowSaveMsg(true);
      setTimeout(() => setShowSaveMsg(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSection(null);
    }
  };

  const connectGoogle = async () => {
    setError('');
    setGoogleStatus(null);
    setGoogleConnecting(true);
    try {
      const data = await getJson<{ authUrl: string }>('/api/settings/google/auth-url');
      window.location.href = data.authUrl;
    } catch (err) {
      setGoogleStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to start Google connection' });
      setGoogleConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    setError('');
    setGoogleStatus(null);
    setGoogleDisconnecting(true);
    try {
      const settings = await getJson<AppSettingsRow>('/api/settings/google/disconnect', { method: 'POST' });
      applySettings(settings);
      setGoogleStatus({ type: 'success', message: 'Google account disconnected.' });
    } catch (err) {
      setGoogleStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to disconnect Google account' });
    } finally {
      setGoogleDisconnecting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const mountTimer = window.setTimeout(() => { if (!cancelled) setMounted(true); }, 0);
    async function loadSettings() {
      setLoading(true);
      setError('');
      try {
        const settings = await getJson<AppSettingsRow>('/api/settings');
        if (cancelled) return;
        applySettings(settings);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSettings();
    return () => { cancelled = true; window.clearTimeout(mountTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const googleConnectedParam = params.get('googleConnected');
    const googleErrorParam = params.get('googleError');
    let nextStatus: typeof googleStatus = null;
    if (googleConnectedParam === '1') {
      nextStatus = { type: 'success', message: 'Google account connected successfully.' };
      params.delete('googleConnected');
    } else if (googleErrorParam) {
      nextStatus = { type: 'error', message: `Google connection failed: ${googleErrorParam}` };
      params.delete('googleError');
    } else {
      return;
    }
    const nextQuery = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`);
    window.setTimeout(() => setGoogleStatus(nextStatus), 0);
  }, [mounted]);

  return {
    tz, setTz,
    emailRules, setEmailRules,
    decorationDigest, setDecorationDigest,
    tracking, setTracking,
    saveMsg, showSaveMsg,
    loading, mounted,
    savingSection, error,
    googleEmail, googleConnected, googleConnecting, googleDisconnecting, googleStatus,
    save, connectGoogle, disconnectGoogle,
  };
}
