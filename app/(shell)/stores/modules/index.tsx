'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { StoreRow } from '@/models/store.model.server';
import StoresTable from './StoresTable';
import AddStoreModal from './AddStoreModal';

type ConnectStep = 1 | 2 | 3 | 4;

const EMPTY_FORM = { storeDomain: '', partnerStoreId: '' };

type ApiResponse<T> = { success: boolean; message: string; data: T };

async function getJson<T>(url: string) {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Request failed');
  }
  return json.data;
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [disconnectingIds, setDisconnectingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [uploadingLogoIds, setUploadingLogoIds] = useState<string[]>([]);
  const [logoErrors, setLogoErrors] = useState<Record<string, string>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [partnerStores, setPartnerStores] = useState<Array<{ id: string; name: string | null; storeDomain: string }>>([]);
  const [newPartnerStore, setNewPartnerStore] = useState('');
  const [addingPartnerStore, setAddingPartnerStore] = useState(false);
  const [partnerStoreError, setPartnerStoreError] = useState('');

  const [connectStep, setConnectStep] = useState<ConnectStep>(1);
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

  const listReq = useRequest<StoreRow[]>();
  const { request: listStoresRequest, loading: listLoading } = listReq;
  const statusReq = useRequest();
  const deleteReq = useRequest();
  const searchParams = useSearchParams();

  const loadStores = useCallback(() => {
    void listStoresRequest({
      url: '/api/stores',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        const filteredStores = (data ?? []).filter((s) => s.status !== 'partner');
        setStores(filteredStores);
      },
    });
  }, [listStoresRequest]);

  const loadPartnerStores = useCallback(async () => {
    try {
      const data = await getJson<Array<{ id: string; name: string | null; storeDomain: string }>>('/api/partner-stores');
      setPartnerStores(data);
    } catch (error) {
      console.error('Failed to load partner stores:', error);
    }
  }, []);

  useEffect(() => {
    loadStores();
    void loadPartnerStores();
  }, [loadStores, loadPartnerStores]);

  useEffect(() => {
    if (searchParams.get('connected')) {
      loadStores();
    }
  }, [searchParams, loadStores]);

  useEffect(() => {
    if (connectStep !== 2) return;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [connectStep]);

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

  const handleDisconnect = async (id: string) => {
    const store = stores.find((item) => item.id === id);
    if (!store || !confirm(`Disconnect ${store.name ?? store.storeDomain}?`)) return;

    setDisconnectingIds((prev) => [...prev, id]);
    await statusReq.request({
      url: `/api/stores/${id}`,
      method: 'PATCH',
      data: { status: 'disconnected' },
      successMessage: 'Store disconnected.',
      onSuccess: () => setStores((prev) => prev.map((item) => item.id === id ? { ...item, status: 'disconnected' } : item)),
    });
    setDisconnectingIds((prev) => prev.filter((item) => item !== id));
  };

  const handleReconnect = async (id: string) => {
    const store = stores.find((item) => item.id === id);
    if (!store) return;

    resetConnectFlow();
    setAddModalOpen(true);
    setAddForm({ storeDomain: store.storeDomain, partnerStoreId: store.partnerStoreId ?? '' });
    setTimeout(() => {
      void handleStartConnect(store.storeDomain);
    }, 0);
  };

  const handleDelete = async (id: string) => {
    const store = stores.find((item) => item.id === id);
    if (!store || !confirm(`Delete ${store.name ?? store.storeDomain}? This cannot be undone.`)) return;

    setDeletingIds((prev) => [...prev, id]);
    await deleteReq.request({
      url: `/api/stores/${id}`,
      method: 'DELETE',
      successMessage: 'Store deleted.',
      onSuccess: () => {
        setStores((prev) => prev.filter((item) => item.id !== id));
      },
    });
    setDeletingIds((prev) => prev.filter((item) => item !== id));
  };

  const handleLogoUpload = async (id: string, file: File) => {
    setLogoErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (!file.type.startsWith('image/')) {
      setLogoErrors((prev) => ({ ...prev, [id]: 'Choose an image file.' }));
      return;
    }

    const formData = new FormData();
    formData.set('logo', file);
    const toastId = toast.loading('Uploading logo...');

    setUploadingLogoIds((prev) => [...prev, id]);
    try {
      const res = await fetch(`/api/stores/${id}/logo`, {
        method: 'POST',
        body: formData,
      });
      const json = (await res.json()) as ApiResponse<StoreRow>;

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Logo upload failed.');
      }

      setStores((prev) => prev.map((item) => item.id === id ? { ...item, logoPath: json.data.logoPath } : item));
      toast.update(toastId, {
        render: json.message || 'Logo uploaded.',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logo upload failed.';
      setLogoErrors((prev) => ({ ...prev, [id]: message }));
      toast.update(toastId, {
        render: message,
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setUploadingLogoIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleLogoRemove = async (id: string) => {
    const toastId = toast.loading('Removing logo...');
    setUploadingLogoIds((prev) => [...prev, id]);
    setLogoErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const res = await fetch(`/api/stores/${id}/logo`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<StoreRow>;

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Logo removal failed.');
      }

      setStores((prev) => prev.map((item) => item.id === id ? { ...item, logoPath: null } : item));
      toast.update(toastId, {
        render: json.message || 'Logo removed.',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logo removal failed.';
      setLogoErrors((prev) => ({ ...prev, [id]: message }));
      toast.update(toastId, {
        render: message,
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setUploadingLogoIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleOpenConnectModal = () => {
    resetConnectFlow();
    setAddModalOpen(true);
  };

  const handleAddPartnerStore = async () => {
    const domain = newPartnerStore.trim();
    setPartnerStoreError('');

    if (!domain) {
      setPartnerStoreError('Please enter a store domain.');
      return;
    }

    setAddingPartnerStore(true);
    try {
      const data = await getJson<{ id: string; name: string | null; storeDomain: string }>(
        `/api/partner-stores?domain=${encodeURIComponent(domain)}`
      );
      setPartnerStores((prev) => [...prev, data]);
      setNewPartnerStore('');
      toast.success('Partner store added successfully.');
    } catch (error) {
      setPartnerStoreError(error instanceof Error ? error.message : 'Failed to add partner store.');
    } finally {
      setAddingPartnerStore(false);
    }
  };

  const handleRemovePartnerStore = async (id: string) => {
    const store = partnerStores.find((s) => s.id === id);
    if (!store || !confirm(`Remove ${store.name || store.storeDomain} from partner stores?`)) return;

    try {
      await fetch(`/api/partner-stores/${id}`, { method: 'DELETE' });
      setPartnerStores((prev) => prev.filter((s) => s.id !== id));
      toast.success('Partner store removed.');
    } catch (error) {
      toast.error('Failed to remove partner store.');
    }
  };

  const handleGetOrganizationsAndCreateApp = useCallback(async (tokens: {
    appManagementToken: string;
    businessPlatformToken: string;
    appManagementTokenExpiresAt: string;
  }) => {
    try {
      setIsListingOrgs(true);
      const partnerStoreParam = addForm.partnerStoreId ? `&partnerStoreId=${encodeURIComponent(addForm.partnerStoreId)}` : '';
      const organizations = await getJson<{
        realShopUrl: string | null;
        storeOrganizationId: string | null;
      }>(
        `/api/list-organizations?businessPlatformToken=${encodeURIComponent(tokens.businessPlatformToken)}&store=${encodeURIComponent(normalizedDomain)}${partnerStoreParam}`
      );
      setIsListingOrgs(false);

      if (!organizations.storeOrganizationId) {
        setAuthorizationError(
          `${normalizedDomain} is not available under your authorized organizations. Check account access and try again.`
        );
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
        appManagementTokenExpiresAt: polled.appManagementTokenExpiresAt!
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
    const intervalId = window.setInterval(() => {
      void pollAuthorization();
    }, 4000);
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

    if (!inputDomain) {
      setDomainError('Please enter your store domain.');
      return;
    }

    if (!addForm.partnerStoreId) {
      setDomainError('Please select a partner store.');
      return;
    }

    try {
      setIsCheckingDomain(true);
      const status = await getJson<{
        connected: boolean;
        storeDomain: string;
      }>(`/api/store-connected-status?store=${encodeURIComponent(inputDomain)}`);

      if (status.connected) {
        setDomainError('This store is already connected.');
        setIsCheckingDomain(false);
        return;
      }

      const codeData = await getJson<{
        device_code?: string;
        user_code?: string;
        verification_uri_complete?: string;
      }>('/api/device-code');

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
  return (
    <main className="flex-1 p-4 space-y-5 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Partner Stores</h3>
        <p className="text-xs text-gray-500 mb-3">Add stores with partner accounts to create apps for other stores.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <input
              type="text"
              placeholder="partner-store.myshopify.com"
              value={newPartnerStore}
              onChange={(e) => setNewPartnerStore(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddPartnerStore();
              }}
              disabled={addingPartnerStore}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            {partnerStoreError && <p className="text-xs text-red-500 mt-1">{partnerStoreError}</p>}
          </div>
          <button
            onClick={() => void handleAddPartnerStore()}
            disabled={addingPartnerStore}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {addingPartnerStore ? 'Adding...' : '+ Add Partner Store'}
          </button>
        </div>
        {partnerStores.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {partnerStores.map((store) => (
              <div
                key={store.id}
                className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <span className="text-blue-900 font-medium">{store.name || store.storeDomain}</span>
                <button
                  onClick={() => void handleRemovePartnerStore(store.id)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Manage connected Shopify stores.</p>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            onClick={loadStores}
            disabled={listLoading}
            className="flex flex-1 items-center justify-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50 sm:flex-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {listLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={handleOpenConnectModal}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer sm:flex-none"
          >
            + Connect Store
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <StoresTable
          stores={stores}
          isLoading={listLoading}
          onDisconnect={(id) => void handleDisconnect(id)}
          onReconnect={(id) => void handleReconnect(id)}
          onDelete={(id) => void handleDelete(id)}
          onLogoUpload={(id, file) => void handleLogoUpload(id, file)}
          onLogoRemove={(id) => void handleLogoRemove(id)}
          disconnectingIds={disconnectingIds}
          deletingIds={deletingIds}
          uploadingLogoIds={uploadingLogoIds}
          logoErrors={logoErrors}
        />
      </div>

      <AddStoreModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          resetConnectFlow();
        }}
        currentStep={connectStep}
        storeDomain={addForm.storeDomain}
        onStoreDomainChange={(value) => setAddForm((prev) => ({ ...prev, storeDomain: value }))}
        partnerStoreId={addForm.partnerStoreId}
        onPartnerStoreIdChange={(value) => setAddForm((prev) => ({ ...prev, partnerStoreId: value }))}
        partnerStores={partnerStores}
        onStartConnect={() => void handleStartConnect()}
        domainError={domainError}
        isCheckingDomain={isCheckingDomain}
        authorizationCode={userCode}
        authorizationUrl={authorizationUrl}
        copyCodeText={copyCodeText}
        timeLeft={timeLeft}
        isAuthorizing={isAuthorizing}
        isCreatingApp={isCreatingApp}
        isListingOrgs={isListingOrgs}
        authorizationError={authorizationError}
        onCopyCode={handleCopyCode}
        onCopyAuthorizationUrl={handleCopyAuthorizationUrl}
        onAuthorize={handleAuthorize}
        onBackToStepOne={() => {
          setConnectStep(1);
          setAuthorizationError('');
          setIsAuthorizing(false);
          setIsListingOrgs(false);
          setIsCreatingApp(false);
        }}
        isInstalling={isInstalling}
        partnerUrl={partnerUrl}
        onOpenPartnerUrl={handleOpenPartnerUrl}
        onInstall={handleInstall}
        onCopyInstallUrl={handleCopyInstallUrl}
        onStartOver={resetConnectFlow}
        appManagementTokenExpiresAt={appManagementTokenExpiresAt}
      />
    </main>
  );
}
