'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { StoreRow } from '@/models/store.model.server';
import StoresTable from './StoresTable';
import AddStoreModal from './AddStoreModal';
import UpdateAppModal from './UpdateAppModal';
import { useShopifyConnect } from './useShopifyConnect';
import { useUpdateApp } from './useUpdateApp';

type ApiResponse<T> = { success: boolean; message: string; data: T };

async function getJson<T>(url: string) {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [disconnectingIds, setDisconnectingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [uploadingLogoIds, setUploadingLogoIds] = useState<string[]>([]);
  const [logoErrors, setLogoErrors] = useState<Record<string, string>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [partnerStores, setPartnerStores] = useState<Array<{ id: string; name: string | null; storeDomain: string }>>([]);
  const [newPartnerStore, setNewPartnerStore] = useState('');
  const [addingPartnerStore, setAddingPartnerStore] = useState(false);
  const [partnerStoreError, setPartnerStoreError] = useState('');

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
    if (searchParams.get('connected')) loadStores();
  }, [searchParams, loadStores]);

  const connect = useShopifyConnect({ loadStores });

  const [updatedApps, setUpdatedApps] = useState<Record<string, string>>({});
  const handleAppUpdated = useCallback((storeId: string, url: string) => {
    setUpdatedApps((prev) => ({ ...prev, [storeId]: url }));
  }, []);
  const updateApp = useUpdateApp({ onUpdated: handleAppUpdated });

  const handleUpdateApp = (id: string) => {
    const store = stores.find((item) => item.id === id);
    if (store) void updateApp.startUpdate({ id: store.id, name: store.name, storeDomain: store.storeDomain });
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

  const handleReconnect = (id: string) => {
    const store = stores.find((item) => item.id === id);
    if (!store) return;
    connect.resetConnectFlow();
    setAddModalOpen(true);
    connect.setAddForm({ storeDomain: store.storeDomain, partnerStoreId: store.partnerStoreId ?? '' });
    setTimeout(() => { void connect.handleStartConnect(store.storeDomain); }, 0);
  };

  const handleDelete = async (id: string) => {
    const store = stores.find((item) => item.id === id);
    if (!store || !confirm(`Delete ${store.name ?? store.storeDomain}? This cannot be undone.`)) return;
    setDeletingIds((prev) => [...prev, id]);
    await deleteReq.request({
      url: `/api/stores/${id}`,
      method: 'DELETE',
      successMessage: 'Store deleted.',
      onSuccess: () => setStores((prev) => prev.filter((item) => item.id !== id)),
    });
    setDeletingIds((prev) => prev.filter((item) => item !== id));
  };

  const handleLogoUpload = async (id: string, file: File) => {
    setLogoErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (!file.type.startsWith('image/')) { setLogoErrors((prev) => ({ ...prev, [id]: 'Choose an image file.' })); return; }
    const formData = new FormData();
    formData.set('logo', file);
    const toastId = toast.loading('Uploading logo...');
    setUploadingLogoIds((prev) => [...prev, id]);
    try {
      const res = await fetch(`/api/stores/${id}/logo`, { method: 'POST', body: formData });
      const json = (await res.json()) as ApiResponse<StoreRow>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Logo upload failed.');
      setStores((prev) => prev.map((item) => item.id === id ? { ...item, logoPath: json.data.logoPath } : item));
      toast.update(toastId, { render: json.message || 'Logo uploaded.', type: 'success', isLoading: false, autoClose: 3000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logo upload failed.';
      setLogoErrors((prev) => ({ ...prev, [id]: message }));
      toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setUploadingLogoIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleLogoRemove = async (id: string) => {
    const toastId = toast.loading('Removing logo...');
    setUploadingLogoIds((prev) => [...prev, id]);
    setLogoErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
    try {
      const res = await fetch(`/api/stores/${id}/logo`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<StoreRow>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Logo removal failed.');
      setStores((prev) => prev.map((item) => item.id === id ? { ...item, logoPath: null } : item));
      toast.update(toastId, { render: json.message || 'Logo removed.', type: 'success', isLoading: false, autoClose: 3000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logo removal failed.';
      setLogoErrors((prev) => ({ ...prev, [id]: message }));
      toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setUploadingLogoIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleOpenConnectModal = () => { connect.resetConnectFlow(); setAddModalOpen(true); };

  const handleAddPartnerStore = async () => {
    const domain = newPartnerStore.trim();
    setPartnerStoreError('');
    if (!domain) { setPartnerStoreError('Please enter a store domain.'); return; }
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
    } catch {
      toast.error('Failed to remove partner store.');
    }
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
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAddPartnerStore(); }}
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
              <div key={store.id} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-blue-900 font-medium">{store.name || store.storeDomain}</span>
                <button onClick={() => void handleRemovePartnerStore(store.id)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Remove">
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
          onReconnect={(id) => handleReconnect(id)}
          onDelete={(id) => void handleDelete(id)}
          onLogoUpload={(id, file) => void handleLogoUpload(id, file)}
          onLogoRemove={(id) => void handleLogoRemove(id)}
          onUpdateApp={handleUpdateApp}
          reauthorizeUrls={updatedApps}
          disconnectingIds={disconnectingIds}
          deletingIds={deletingIds}
          uploadingLogoIds={uploadingLogoIds}
          updatingIds={updateApp.targetStore && !updateApp.done ? [updateApp.targetStore.id] : []}
          updatedIds={Object.keys(updatedApps)}
          logoErrors={logoErrors}
        />
      </div>

      <AddStoreModal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); connect.resetConnectFlow(); }}
        currentStep={connect.connectStep}
        storeDomain={connect.addForm.storeDomain}
        onStoreDomainChange={(value) => connect.setAddForm((prev) => ({ ...prev, storeDomain: value }))}
        partnerStoreId={connect.addForm.partnerStoreId}
        onPartnerStoreIdChange={(value) => connect.setAddForm((prev) => ({ ...prev, partnerStoreId: value }))}
        partnerStores={partnerStores}
        onStartConnect={() => void connect.handleStartConnect()}
        domainError={connect.domainError}
        isCheckingDomain={connect.isCheckingDomain}
        authorizationCode={connect.userCode}
        authorizationUrl={connect.authorizationUrl}
        copyCodeText={connect.copyCodeText}
        timeLeft={connect.timeLeft}
        isAuthorizing={connect.isAuthorizing}
        isCreatingApp={connect.isCreatingApp}
        isListingOrgs={connect.isListingOrgs}
        authorizationError={connect.authorizationError}
        onCopyCode={connect.handleCopyCode}
        onCopyAuthorizationUrl={connect.handleCopyAuthorizationUrl}
        onAuthorize={connect.handleAuthorize}
        onBackToStepOne={() => {
          connect.setConnectStep(1);
          connect.setIsAuthorizing(false);
          connect.setIsListingOrgs(false);
          connect.setIsCreatingApp(false);
        }}
        isInstalling={connect.isInstalling}
        partnerUrl={connect.partnerUrl}
        onOpenPartnerUrl={connect.handleOpenPartnerUrl}
        onInstall={connect.handleInstall}
        onCopyInstallUrl={connect.handleCopyInstallUrl}
        onStartOver={connect.resetConnectFlow}
        appManagementTokenExpiresAt={connect.appManagementTokenExpiresAt}
      />

      <UpdateAppModal
        isOpen={!!updateApp.targetStore}
        storeName={updateApp.targetStore?.name ?? updateApp.targetStore?.storeDomain ?? ''}
        userCode={updateApp.userCode}
        authorizationUrl={updateApp.authorizationUrl}
        copyCodeText={updateApp.copyCodeText}
        timeLeft={updateApp.timeLeft}
        isStarting={updateApp.isStarting}
        isAuthorizing={updateApp.isAuthorizing}
        isUpdating={updateApp.isUpdating}
        error={updateApp.error}
        done={updateApp.done}
        onCopyCode={updateApp.copyCode}
        onCopyAuthorizationUrl={updateApp.copyAuthorizationUrl}
        onAuthorize={updateApp.authorize}
        onClose={updateApp.close}
      />
    </main>
  );
}
