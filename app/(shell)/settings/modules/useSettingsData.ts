'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettingsRow } from '@/models/settings.model.server';

export type DecorationRescanProgress = { total: number; scanned: number; updated: number };

export type DecorationRescanJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  progress: DecorationRescanProgress | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SECTION_LABELS: Record<string, string> = {
  timezone: 'Timezone',
  invoiceNumbering: 'Invoice numbering',
  emailProvider: 'Email Sending',
  emailRules: 'Email Sending Rules',
  decorationDigest: 'Decoration Work Digest',
  tracking: 'Shipment Tracking',
  decorationKeywords: 'Product Keywords',
  taskVisibility: 'Tasks',
  decorationVisibility: 'Decoration Visibility',
  messageVisibility: 'Messages',
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

const DEFAULT_DECORATION_KEYWORDS: AppSettingsRow['decorationKeywords'] = {
  embroidery: ['embroider', 'emb'],
  print: ['print'],
};

const DEFAULT_INVOICE_NUMBERING: AppSettingsRow['invoiceNumbering'] = {
  prefix: 'INV-',
  nextNumber: 1000,
};

const DEFAULT_MAILERSEND: AppSettingsRow['mailersend'] = {
  apiToken: null,
  fromEmail: null,
};

type ApiResponse<T> = { success: boolean; message: string; data: T };
export type SettingsSection = 'timezone' | 'invoiceNumbering' | 'emailProvider' | 'emailRules' | 'decorationDigest' | 'tracking' | 'decorationKeywords' | 'taskVisibility' | 'decorationVisibility' | 'messageVisibility';

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
  const [decorationKeywords, setDecorationKeywords] = useState<AppSettingsRow['decorationKeywords']>(DEFAULT_DECORATION_KEYWORDS);
  const [taskVisibility, setTaskVisibility] = useState<Record<string, string[]>>({});
  const [messageVisibility, setMessageVisibility] = useState<Record<string, string[]>>({});
  const [decorationCrossVisibilityEnabled, setDecorationCrossVisibilityEnabled] = useState(false);
  const [rescanJob, setRescanJob] = useState<DecorationRescanJob | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [rescanError, setRescanError] = useState('');
  const activeRescanJobIdRef = useRef<string | null>(null);
  const completedRescanJobIdRef = useRef<string | null>(null);
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
  const [invoiceNumbering, setInvoiceNumbering] = useState<AppSettingsRow['invoiceNumbering']>(DEFAULT_INVOICE_NUMBERING);
  const [emailProvider, setEmailProvider] = useState<AppSettingsRow['emailProvider']>('google');
  const [mailersend, setMailersend] = useState<AppSettingsRow['mailersend']>(DEFAULT_MAILERSEND);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const applySettings = (settings: AppSettingsRow) => {
    setTz(settings.timezone);
    setInvoiceNumbering(settings.invoiceNumbering);
    setGoogleEmail(settings.googleEmail);
    setGoogleConnected(settings.googleConnected);
    setEmailProvider(settings.emailProvider);
    setMailersend(settings.mailersend);
    setEmailRules(settings.emailRules);
    setDecorationDigest(settings.decorationDigest);
    setTracking(settings.shipmentTracking);
    setDecorationKeywords(settings.decorationKeywords);
    setTaskVisibility(settings.taskVisibilityByUser);
    setMessageVisibility(settings.messageVisibilityByUser);
    setDecorationCrossVisibilityEnabled(settings.decorationCrossVisibilityEnabled);
  };

  const save = async (section: SettingsSection) => {
    setError('');
    setSavingSection(section);
    let payload: Record<string, unknown>;
    if (section === 'timezone') {
      payload = { timezone: tz };
    } else if (section === 'invoiceNumbering') {
      payload = { invoicePrefix: invoiceNumbering.prefix, invoiceNextNumber: invoiceNumbering.nextNumber };
    } else if (section === 'emailProvider') {
      payload = {
        emailProvider,
        mailersendApiToken: mailersend.apiToken,
        mailersendFromEmail: mailersend.fromEmail,
      };
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
    } else if (section === 'decorationKeywords') {
      payload = {
        embroideryKeywords: decorationKeywords.embroidery,
        printKeywords: decorationKeywords.print,
      };
    } else if (section === 'taskVisibility') {
      payload = { taskVisibilityByUser: taskVisibility };
    } else if (section === 'messageVisibility') {
      payload = { messageVisibilityByUser: messageVisibility };
    } else if (section === 'decorationVisibility') {
      payload = { decorationCrossVisibilityEnabled };
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

  const loadRescanStatus = useCallback(async (refreshAfterCompletion = false) => {
    const data = await getJson<{
      activeJob: DecorationRescanJob | null;
      lastSuccessfulJob: DecorationRescanJob | null;
      latestJob: DecorationRescanJob | null;
    }>('/api/orders/decorations/rescan');

    setRescanJob(data.activeJob);
    if (data.activeJob) {
      activeRescanJobIdRef.current = data.activeJob.id;
    }

    if (data.lastSuccessfulJob?.finishedAt) {
      const completedJobId = data.lastSuccessfulJob.id;
      const scannedCount = data.lastSuccessfulJob.progress?.scanned ?? 0;
      setLastScanned(`Last scanned: ${new Date(data.lastSuccessfulJob.finishedAt).toLocaleString()} — ${scannedCount.toLocaleString()} orders`);

      if (
        refreshAfterCompletion &&
        activeRescanJobIdRef.current === completedJobId &&
        completedRescanJobIdRef.current !== completedJobId
      ) {
        completedRescanJobIdRef.current = completedJobId;
        activeRescanJobIdRef.current = null;
      }
    }

    if (
      refreshAfterCompletion &&
      data.latestJob?.status === 'failed' &&
      activeRescanJobIdRef.current === data.latestJob.id
    ) {
      setRescanError(data.latestJob.error || 'Decoration re-scan failed');
      activeRescanJobIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchRescanStatus = async () => {
      try {
        await loadRescanStatus(false);
      } catch (err) {
        if (!cancelled) {
          setRescanError(err instanceof Error ? err.message : 'Failed to load decoration re-scan status');
        }
      }
    };

    void fetchRescanStatus();

    return () => { cancelled = true; };
  }, [loadRescanStatus]);

  useEffect(() => {
    if (!rescanJob || (rescanJob.status !== 'queued' && rescanJob.status !== 'running')) return;

    const timer = window.setInterval(() => {
      void loadRescanStatus(true).catch((err) => {
        setRescanError(err instanceof Error ? err.message : 'Failed to load decoration re-scan status');
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [loadRescanStatus, rescanJob]);

  const rescanDecorations = async () => {
    if (rescanJob && (rescanJob.status === 'queued' || rescanJob.status === 'running')) return;

    setRescanError('');
    setRescanning(true);
    try {
      const res = await fetch('/api/orders/decorations/rescan', { method: 'POST' });
      const json = (await res.json()) as ApiResponse<{ job: DecorationRescanJob; alreadyRunning: boolean }>;

      if ((!res.ok && res.status !== 409) || !json.success) {
        throw new Error(json.message || 'Failed to queue decoration re-scan');
      }

      setRescanJob(json.data.job);
      activeRescanJobIdRef.current = json.data.job.id;
    } catch (err) {
      setRescanError(err instanceof Error ? err.message : 'Failed to re-scan orders');
    } finally {
      setRescanning(false);
    }
  };

  const rescanActive = rescanJob?.status === 'queued' || rescanJob?.status === 'running';
  const rescanProgress = rescanJob?.progress ?? null;

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

  const sendTestEmail = async () => {
    setTestStatus(null);
    setTestingEmail(true);
    try {
      await getJson<null>('/api/settings/email/test', { method: 'POST' });
      setTestStatus({ type: 'success', message: 'Test email sent.' });
    } catch (err) {
      setTestStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send test email' });
    } finally {
      setTestingEmail(false);
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
    invoiceNumbering, setInvoiceNumbering,
    emailRules, setEmailRules,
    decorationDigest, setDecorationDigest,
    tracking, setTracking,
    decorationKeywords, setDecorationKeywords,
    taskVisibility, setTaskVisibility,
    messageVisibility, setMessageVisibility,
    decorationCrossVisibilityEnabled, setDecorationCrossVisibilityEnabled,
    rescanning, rescanDecorations, rescanActive, rescanProgress, rescanError, lastScanned, rescanJob,
    saveMsg, showSaveMsg,
    loading, mounted,
    savingSection, error,
    googleEmail, googleConnected, googleConnecting, googleDisconnecting, googleStatus,
    emailProvider, setEmailProvider, mailersend, setMailersend,
    testingEmail, testStatus, sendTestEmail,
    save, connectGoogle, disconnectGoogle,
  };
}
