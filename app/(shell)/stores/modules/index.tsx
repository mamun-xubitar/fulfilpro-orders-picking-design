'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { StoreRow, NoteType } from '@/models/store.model.server';
import StoresTable from './StoresTable';
import AddStoreModal from './AddStoreModal';
import NotesModal from './NotesModal';

type NotesAction = { storeId: string; type: 'create' | 'update' | 'delete'; noteId?: number };
type ConnectStep = 1 | 2 | 3 | 4;

const EMPTY_FORM = { storeDomain: '' };

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
  const [savedMargins, setSavedMargins] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMargin, setBulkMargin] = useState('');
  const [savingMarginIds, setSavingMarginIds] = useState<string[]>([]);
  const [disconnectingIds, setDisconnectingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; storeId: string; storeName: string }>({
    isOpen: false,
    storeId: '',
    storeName: '',
  });
  const [notesAction, setNotesAction] = useState<NotesAction | null>(null);

  const [connectStep, setConnectStep] = useState<ConnectStep>(1);
  const [normalizedDomain, setNormalizedDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [authorizationError, setAuthorizationError] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [installUrl, setInstallUrl] = useState('');
  const [copyCodeText, setCopyCodeText] = useState('Copy Code');
  const [timeLeft, setTimeLeft] = useState(600);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isListingOrgs, setIsListingOrgs] = useState(false);
  const [isCreatingApp, setIsCreatingApp] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const authPollLock = useRef(false);

  const listReq = useRequest<StoreRow[]>();
  const { request: listStoresRequest, loading: listLoading } = listReq;
  const marginReq = useRequest();
  const statusReq = useRequest();
  const deleteReq = useRequest();
  const notesReq = useRequest();
  const searchParams = useSearchParams();

  const loadStores = useCallback(() => {
    void listStoresRequest({
      url: '/api/stores',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        setStores(data ?? []);
        const margins: Record<string, number> = {};
        (data ?? []).forEach((store) => {
          margins[store.id] = store.profitMargin ?? 0;
        });
        setSavedMargins(margins);
      },
    });
  }, [listStoresRequest]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

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
    setCopyCodeText('Copy Code');
    setTimeLeft(600);
    setIsCheckingDomain(false);
    setIsAuthorizing(false);
    setIsListingOrgs(false);
    setIsCreatingApp(false);
    setIsInstalling(false);
    authPollLock.current = false;
  };

  const isMarginDirty = (store: StoreRow) =>
    (store.profitMargin ?? 0) !== (savedMargins[store.id] ?? 0);

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? stores.map((store) => store.id) : []);

  const handleSelectOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((storeId) => storeId !== id));

  const handleMarginChange = (id: string, margin: number) =>
    setStores((prev) => prev.map((store) => store.id === id ? { ...store, profitMargin: margin } : store));

  const handleSaveMargin = async (id: string) => {
    const store = stores.find((item) => item.id === id);
    if (!store) return;

    setSavingMarginIds((prev) => [...prev, id]);
    await marginReq.request({
      url: `/api/stores/${id}`,
      method: 'PATCH',
      data: { profitMargin: store.profitMargin ?? 0 },
      successMessage: 'Margin saved.',
      onSuccess: () => setSavedMargins((prev) => ({ ...prev, [id]: store.profitMargin ?? 0 })),
    });
    setSavingMarginIds((prev) => prev.filter((item) => item !== id));
  };

  const handleBulkMargin = async () => {
    if (!selectedIds.length) return;
    const margin = parseFloat(bulkMargin);
    if (isNaN(margin)) {
      alert('Enter a valid margin first.');
      return;
    }

    await Promise.all(
      selectedIds.map(async (id) => {
        setSavingMarginIds((prev) => [...prev, id]);
        await marginReq.request({
          url: `/api/stores/${id}`,
          method: 'PATCH',
          data: { profitMargin: margin },
          showToast: false,
          onSuccess: () => {
            setStores((prev) => prev.map((store) => store.id === id ? { ...store, profitMargin: margin } : store));
            setSavedMargins((prev) => ({ ...prev, [id]: margin }));
          },
        });
        setSavingMarginIds((prev) => prev.filter((item) => item !== id));
      })
    );
    setBulkMargin('');
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
    setAddForm({ storeDomain: store.storeDomain });
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
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      },
    });
    setDeletingIds((prev) => prev.filter((item) => item !== id));
  };

  const handleOpenConnectModal = () => {
    resetConnectFlow();
    setAddModalOpen(true);
  };

  const handleGetOrganizationsAndCreateApp = useCallback(async (tokens: {
    appManagementToken: string;
    businessPlatformToken: string;
  }) => {
    try {
      setIsListingOrgs(true);
      const organizations = await getJson<{
        realShopUrl: string | null;
        storeOrganizationId: string | null;
      }>(
        `/api/list-organizations?businessPlatformToken=${encodeURIComponent(tokens.businessPlatformToken)}&store=${encodeURIComponent(normalizedDomain)}`
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
      const created = await getJson<{ installUrl: string }>(
        `/api/create-app?appManagementToken=${encodeURIComponent(tokens.appManagementToken)}&organizationId=${encodeURIComponent(organizations.storeOrganizationId)}&store=${encodeURIComponent(normalizedDomain)}`
      );
      setIsCreatingApp(false);
      setInstallUrl(created.installUrl);
      setConnectStep(3);
      setIsAuthorizing(false);
    } catch (error) {
      setIsListingOrgs(false);
      setIsCreatingApp(false);
      setIsAuthorizing(false);
      setAuthorizationError(error instanceof Error ? error.message : 'Failed to create Shopify app');
    }
  }, [normalizedDomain]);

  const pollAuthorization = useCallback(async () => {
    if (!deviceCode || authPollLock.current) return;
    authPollLock.current = true;
    try {
      const polled = await getJson<{
        error?: string;
        appManagementToken?: string;
        businessPlatformToken?: string;
      }>(`/api/poll-token?device_code=${encodeURIComponent(deviceCode)}`);

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
      });
    } catch (error) {
      setAuthorizationError(error instanceof Error ? error.message : 'Authorization polling failed');
      setIsAuthorizing(false);
    } finally {
      authPollLock.current = false;
    }
  }, [deviceCode, handleGetOrganizationsAndCreateApp]);

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
      setAddForm({ storeDomain: status.storeDomain });
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
    if (!installUrl) return;
    navigator.clipboard.writeText(installUrl);
    toast.info('Install URL copied.');
  };

  const getStoreNotes = (storeId: string) =>
    stores.find((store) => store.id === storeId)?.notes ?? [];

  const persistNotes = async (
    storeId: string,
    nextNotes: NoteType[],
    previousNotes: NoteType[],
    type: NotesAction['type'],
    noteId?: number
  ) => {
    setNotesAction({ storeId, type, noteId });
    setStores((prev) =>
      prev.map((store) => store.id === storeId ? { ...store, notes: nextNotes } : store)
    );

    await notesReq.request({
      url: `/api/stores/${storeId}`,
      method: 'PATCH',
      data: { notes: nextNotes },
      successMessage:
        type === 'create' ? 'Note added.' : type === 'update' ? 'Note updated.' : 'Note deleted.',
      onError: () =>
        setStores((prev) => prev.map((store) => store.id === storeId ? { ...store, notes: previousNotes } : store)),
    });

    setNotesAction(null);
  };

  const handleAddNote = async (storeId: string, text: string) => {
    const previous = getStoreNotes(storeId);
    const newId = previous.length > 0 ? Math.max(...previous.map((note) => note.id)) + 1 : 1;
    const note: NoteType = { id: newId, text, createdAt: new Date().toISOString(), editedAt: null };
    await persistNotes(storeId, [note, ...previous], previous, 'create', newId);
  };

  const handleEditNote = async (storeId: string, noteId: number, text: string) => {
    const previous = getStoreNotes(storeId);
    const next = previous.map((note) =>
      note.id === noteId ? { ...note, text, editedAt: new Date().toISOString() } : note
    );
    await persistNotes(storeId, next, previous, 'update', noteId);
  };

  const handleDeleteNote = async (storeId: string, noteId: number) => {
    const previous = getStoreNotes(storeId);
    await persistNotes(storeId, previous.filter((note) => note.id !== noteId), previous, 'delete', noteId);
  };

  return (
    <main className="flex-1 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Manage connected Shopify stores and profit margins.</p>
        <div className="flex items-center gap-2">
          <button
            onClick={loadStores}
            disabled={listLoading}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {listLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={handleOpenConnectModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            + Connect Store
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-500">{selectedIds.length} selected</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="Bulk margin e.g. 15"
            value={bulkMargin}
            onChange={(e) => setBulkMargin(e.target.value)}
            className="w-40 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => void handleBulkMargin()}
            disabled={!selectedIds.length || !bulkMargin || marginReq.loading}
            className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-40 cursor-pointer transition-colors"
          >
            Apply to selected
          </button>
        </div>

        <StoresTable
          stores={stores}
          isLoading={listLoading}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onMarginChange={handleMarginChange}
          onSaveMargin={(id) => void handleSaveMargin(id)}
          onDisconnect={(id) => void handleDisconnect(id)}
          onReconnect={(id) => void handleReconnect(id)}
          onDelete={(id) => void handleDelete(id)}
          onOpenNotes={(id, name) => setNotesModal({ isOpen: true, storeId: id, storeName: name })}
          isMarginDirty={isMarginDirty}
          savingMarginIds={savingMarginIds}
          disconnectingIds={disconnectingIds}
          deletingIds={deletingIds}
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
        onStoreDomainChange={(value) => setAddForm({ storeDomain: value })}
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
        installUrl={installUrl}
        onInstall={handleInstall}
        onCopyInstallUrl={handleCopyInstallUrl}
        onStartOver={resetConnectFlow}
      />

      <NotesModal
        isOpen={notesModal.isOpen}
        onClose={() => setNotesModal((prev) => ({ ...prev, isOpen: false }))}
        storeName={notesModal.storeName}
        storeId={notesModal.storeId}
        notes={getStoreNotes(notesModal.storeId)}
        onAddNote={handleAddNote}
        onEditNote={handleEditNote}
        onDeleteNote={handleDeleteNote}
        isLoading={notesReq.loading}
        activeAction={notesAction?.storeId === notesModal.storeId ? notesAction.type : null}
        activeNoteId={notesAction?.storeId === notesModal.storeId ? (notesAction.noteId ?? null) : null}
      />
    </main>
  );
}
