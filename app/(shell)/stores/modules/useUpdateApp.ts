'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getJson, postJson } from './utils';

type TargetStore = { id: string; name: string | null; storeDomain: string };

export function useUpdateApp({
  onUpdated,
}: {
  onUpdated: (storeId: string, reauthorizeUrl: string) => void;
}) {
  const [targetStore, setTargetStore] = useState<TargetStore | null>(null);
  const [deviceCode, setDeviceCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [copyCodeText, setCopyCodeText] = useState('Copy Code');
  const [timeLeft, setTimeLeft] = useState(600);
  const [isStarting, setIsStarting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const pollLock = useRef(false);

  const close = () => {
    setTargetStore(null);
    setDeviceCode('');
    setUserCode('');
    setAuthorizationUrl('');
    setCopyCodeText('Copy Code');
    setTimeLeft(600);
    setIsStarting(false);
    setIsAuthorizing(false);
    setIsUpdating(false);
    setError('');
    setDone(false);
    pollLock.current = false;
  };

  const startUpdate = async (store: TargetStore) => {
    setTargetStore(store);
    setError('');
    setDone(false);
    setIsStarting(true);
    try {
      const codeData = await getJson<{ device_code?: string; user_code?: string; verification_uri_complete?: string }>('/api/device-code');
      if (!codeData.device_code || !codeData.user_code || !codeData.verification_uri_complete) {
        throw new Error('Invalid device authorization response from Shopify.');
      }
      setDeviceCode(codeData.device_code);
      setUserCode(codeData.user_code);
      setAuthorizationUrl(codeData.verification_uri_complete);
      setTimeLeft(600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start app update.');
    } finally {
      setIsStarting(false);
    }
  };

  const runUpdate = useCallback(async (tokens: { appManagementToken: string; appManagementTokenExpiresAt?: string }) => {
    if (!targetStore) return;
    setIsAuthorizing(false);
    setIsUpdating(true);
    try {
      const data = await postJson<{ status: string; reauthorizeUrl?: string }>(
        `/api/stores/${targetStore.id}/update-app`,
        tokens
      );
      setDone(true);
      onUpdated(targetStore.id, data.reauthorizeUrl!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update app');
    } finally {
      setIsUpdating(false);
    }
  }, [targetStore, onUpdated]);

  const pollAuthorization = useCallback(async () => {
    if (!deviceCode || !targetStore || pollLock.current) return;
    pollLock.current = true;
    try {
      const polled = await getJson<{
        error?: string;
        appManagementToken?: string;
        appManagementTokenExpiresAt?: string;
      }>(`/api/poll-token?device_code=${encodeURIComponent(deviceCode)}`);

      if (polled.error === 'authorization_pending' || polled.error === 'slow_down') return;

      if (polled.error) {
        setError('Authorization failed or expired. Please try again.');
        setIsAuthorizing(false);
        return;
      }

      if (!polled.appManagementToken) {
        setError('Missing app management token from Shopify.');
        setIsAuthorizing(false);
        return;
      }

      await runUpdate({
        appManagementToken: polled.appManagementToken,
        appManagementTokenExpiresAt: polled.appManagementTokenExpiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization polling failed');
      setIsAuthorizing(false);
    } finally {
      pollLock.current = false;
    }
  }, [deviceCode, targetStore, runUpdate]);

  useEffect(() => {
    if (!isAuthorizing || !deviceCode || !targetStore || done) return;
    const intervalId = window.setInterval(() => { void pollAuthorization(); }, 4000);

    return () => window.clearInterval(intervalId);
  }, [isAuthorizing, deviceCode, targetStore, done, pollAuthorization]);

  useEffect(() => {
    if (!targetStore || done) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { window.clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetStore, done]);

  const authorize = () => {
    if (!authorizationUrl) return;
    setError('');
    setIsAuthorizing(true);
    window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
  };

  const copyCode = () => {
    if (!userCode) return;
    navigator.clipboard.writeText(userCode);
    setCopyCodeText('Copied');
    toast.info('Code copied.');
    setTimeout(() => setCopyCodeText('Copy Code'), 1500);
  };

  const copyAuthorizationUrl = () => {
    if (!authorizationUrl) return;
    navigator.clipboard.writeText(authorizationUrl);
    toast.info('Authorization URL copied.');
  };

  return {
    targetStore,
    userCode,
    authorizationUrl,
    copyCodeText,
    timeLeft,
    isStarting,
    isAuthorizing,
    isUpdating,
    error,
    done,
    startUpdate,
    authorize,
    copyCode,
    copyAuthorizationUrl,
    close,
  };
}
