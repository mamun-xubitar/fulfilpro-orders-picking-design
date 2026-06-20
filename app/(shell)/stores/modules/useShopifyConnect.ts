'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

type ConnectStep = 1 | 2 | 3 | 4;

const EMPTY_FORM = { storeDomain: '', partnerStoreId: '' };

type ApiResponse<T> = { success: boolean; message: string; data: T };

async function getJson<T>(url: string) {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

export function useShopifyConnect({ loadStores }: { loadStores: () => void }) {
  const [connectStep, setConnectStep] = useState<ConnectStep>(1);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [normalizedDomain, setNormalizedDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [authorizationError, setAuthorizationError] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [installUrl, setInstallUrl] = useState('');
  const [partnerUrl, setPartnerUrl] = useState('');
  const [copyCodeText, setCopyCodeText] = useState('Copy Code');
  const [timeLeft, setTimeLeft] = useState(600);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isListingOrgs, setIsListingOrgs] = useState(false);
  const [isCreatingApp, setIsCreatingApp] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUpdatingScopes, setIsUpdatingScopes] = useState(false);
  const [appManagementToken, setAppManagementToken] = useState('');
  const [appManagementTokenExpiresAt, setAppManagementTokenExpiresAt] = useState('');
  const authPollLock = useRef(false);

  const resetConnectFlow = () => {
    setConnectStep(1);
    setAddForm(EMPTY_FORM);
    setNormalizedDomain('');
    setDomainError('');
    setAuthorizationError('');
    setDeviceCode('');
    setUserCode('');
    setAuthorizationUrl('');
    setInstallUrl('');
    setPartnerUrl('');
    setCopyCodeText('Copy Code');
    setTimeLeft(600);
    setIsCheckingDomain(false);
    setIsAuthorizing(false);
    setIsListingOrgs(false);
    setIsCreatingApp(false);
    setIsInstalling(false);
    setIsUpdatingScopes(false);
    setAppManagementToken('');
    setAppManagementTokenExpiresAt('');
    authPollLock.current = false;
  };

  useEffect(() => {
    if (connectStep !== 2) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { window.clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [connectStep]);

  const handleGetOrganizationsAndCreateApp = useCallback(async (tokens: {
    appManagementToken: string;
    businessPlatformToken: string;
    appManagementTokenExpiresAt: string;
  }) => {
    try {
      setIsListingOrgs(true);
      const partnerStoreParam = addForm.partnerStoreId ? `&partnerStoreId=${encodeURIComponent(addForm.partnerStoreId)}` : '';
      const organizations = await getJson<{ realShopUrl: string | null; storeOrganizationId: string | null }>(
        `/api/list-organizations?businessPlatformToken=${encodeURIComponent(tokens.businessPlatformToken)}&store=${encodeURIComponent(normalizedDomain)}${partnerStoreParam}`
      );
      setIsListingOrgs(false);

      if (!organizations.storeOrganizationId) {
        setAuthorizationError(`${normalizedDomain} is not available under your authorized organizations. Check account access and try again.`);
        setIsAuthorizing(false);
        return;
      }

      setIsCreatingApp(true);
      const created = await getJson<{ installUrl: string; partnerUrl?: string | null }>(
        `/api/create-app?appManagementToken=${encodeURIComponent(tokens.appManagementToken)}&organizationId=${encodeURIComponent(organizations.storeOrganizationId)}&store=${encodeURIComponent(normalizedDomain)}&partnerStoreId=${encodeURIComponent(addForm.partnerStoreId)}&appManagementTokenExpiresAt=${encodeURIComponent(tokens.appManagementTokenExpiresAt)}`
      );
      setIsCreatingApp(false);
      setInstallUrl(created.installUrl);
      setPartnerUrl(created.partnerUrl ?? '');
      setAppManagementToken(tokens.appManagementToken);
      setAppManagementTokenExpiresAt(tokens.appManagementTokenExpiresAt);
      setConnectStep(3);
      setIsAuthorizing(false);
    } catch (error) {
      setIsListingOrgs(false);
      setIsCreatingApp(false);
      setIsAuthorizing(false);
      setAuthorizationError(error instanceof Error ? error.message : 'Failed to create Shopify app');
    }
  }, [normalizedDomain, addForm.partnerStoreId]);

  const pollAuthorization = useCallback(async () => {
    if (!deviceCode || authPollLock.current) return;
    authPollLock.current = true;
    try {
      const polled = await getJson<{
        error?: string;
        appManagementToken?: string;
        businessPlatformToken?: string;
        appManagementTokenExpiresAt?: string;
      }>(`/api/poll-token?device_code=${encodeURIComponent(deviceCode)}&shop=${encodeURIComponent(normalizedDomain)}`);

      if (polled.error === 'authorization_pending' || polled.error === 'slow_down') return;

      if (polled.error) {
        setAuthorizationError('Authorization failed or expired. Please try again.');
        setIsAuthorizing(false);
        return;
      }

      if (!polled.appManagementToken || !polled.businessPlatformToken) {
        setAuthorizationError('Missing tokens from Shopify authorization. Please retry.');
        setIsAuthorizing(false);
        return;
      }

      await handleGetOrganizationsAndCreateApp({
        appManagementToken: polled.appManagementToken,
        businessPlatformToken: polled.businessPlatformToken,
        appManagementTokenExpiresAt: polled.appManagementTokenExpiresAt!,
      });
    } catch (error) {
      setAuthorizationError(error instanceof Error ? error.message : 'Authorization polling failed');
      setIsAuthorizing(false);
    } finally {
      authPollLock.current = false;
    }
  }, [deviceCode, handleGetOrganizationsAndCreateApp, normalizedDomain]);

  useEffect(() => {
    if (!isAuthorizing || !deviceCode || connectStep !== 2) return;
    const intervalId = window.setInterval(() => { void pollAuthorization(); }, 4000);
    return () => window.clearInterval(intervalId);
  }, [isAuthorizing, deviceCode, connectStep, pollAuthorization]);

  useEffect(() => {
    if (!isInstalling || !normalizedDomain || connectStep !== 3) return;
    const intervalId = window.setInterval(async () => {
      try {
        const status = await getJson<{ connected: boolean; storeDomain: string }>(
          `/api/store-connected-status?store=${encodeURIComponent(normalizedDomain)}`
        );
        if (status.connected) {
          setConnectStep(4);
          setIsInstalling(false);
          loadStores();
        }
      } catch {
        // ignore polling errors during install wait
      }
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [isInstalling, normalizedDomain, connectStep, loadStores]);

  const handleStartConnect = async (forcedDomain?: string) => {
    const inputDomain = (forcedDomain ?? addForm.storeDomain).trim();
    setDomainError('');
    setAuthorizationError('');
    if (!inputDomain) { setDomainError('Please enter your store domain.'); return; }
    if (!addForm.partnerStoreId) { setDomainError('Please select a partner store.'); return; }
    try {
      setIsCheckingDomain(true);
      const status = await getJson<{ connected: boolean; storeDomain: string }>(
        `/api/store-connected-status?store=${encodeURIComponent(inputDomain)}`
      );
      if (status.connected) { setDomainError('This store is already connected.'); setIsCheckingDomain(false); return; }
      const codeData = await getJson<{ device_code?: string; user_code?: string; verification_uri_complete?: string }>('/api/device-code');
      if (!codeData.device_code || !codeData.user_code || !codeData.verification_uri_complete) {
        throw new Error('Invalid device authorization response from Shopify.');
      }
      setNormalizedDomain(status.storeDomain);
      setAddForm((prev) => ({ ...prev, storeDomain: status.storeDomain }));
      setDeviceCode(codeData.device_code);
      setUserCode(codeData.user_code);
      setAuthorizationUrl(codeData.verification_uri_complete);
      setTimeLeft(600);
      setConnectStep(2);
    } catch (error) {
      setDomainError(error instanceof Error ? error.message : 'Failed to start store connection.');
    } finally {
      setIsCheckingDomain(false);
    }
  };

  const handleCopyCode = () => {
    if (!userCode) return;
    navigator.clipboard.writeText(userCode);
    setCopyCodeText('Copied');
    toast.info('Code copied.');
    setTimeout(() => setCopyCodeText('Copy Code'), 1500);
  };

  const handleAuthorize = () => {
    if (!authorizationUrl) return;
    setAuthorizationError('');
    setIsAuthorizing(true);
    window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyAuthorizationUrl = () => {
    if (!authorizationUrl) return;
    navigator.clipboard.writeText(authorizationUrl);
    toast.info('Authorization URL copied.');
  };

  const handleInstall = () => {
    if (!installUrl) return;
    setIsInstalling(true);
    window.open(installUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyInstallUrl = () => {
    if (!partnerUrl) return;
    navigator.clipboard.writeText(partnerUrl);
    toast.info('Install URL copied.');
  };

  const handleOpenPartnerUrl = () => {
    if (!partnerUrl) return;
    window.open(partnerUrl, '_blank', 'noopener,noreferrer');
  };

  void appManagementToken;
  void isUpdatingScopes;

  return {
    connectStep, setConnectStep,
    addForm, setAddForm,
    domainError, authorizationError,
    userCode, authorizationUrl,
    copyCodeText, timeLeft,
    isCheckingDomain, isAuthorizing, setIsAuthorizing,
    isListingOrgs, setIsListingOrgs,
    isCreatingApp, setIsCreatingApp,
    isInstalling, partnerUrl,
    appManagementTokenExpiresAt,
    resetConnectFlow,
    handleStartConnect,
    handleCopyCode, handleAuthorize, handleCopyAuthorizationUrl,
    handleInstall, handleCopyInstallUrl, handleOpenPartnerUrl,
  };
}
