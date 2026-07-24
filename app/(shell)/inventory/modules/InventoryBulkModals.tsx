'use client';

type TagModalState = { mode: 'add' | 'remove'; input: string };
type ChannelModalState = { mode: 'include' | 'exclude'; input: string };
type DeleteConfirmTarget = { kind: 'selection' } | { kind: 'single'; id: string; title: string };

type InventoryBulkModalsProps = {
  tagModal: TagModalState | null;
  setTagModal: (state: TagModalState | null) => void;
  onSubmitTagModal: () => void;
  channelModal: ChannelModalState | null;
  setChannelModal: (state: ChannelModalState | null) => void;
  onSubmitChannelModal: () => void;
  deleteConfirm: DeleteConfirmTarget | null;
  setDeleteConfirm: (target: DeleteConfirmTarget | null) => void;
  onConfirmDelete: () => void;
  bulkRunning: boolean;
};

export default function InventoryBulkModals({
  tagModal,
  setTagModal,
  onSubmitTagModal,
  channelModal,
  setChannelModal,
  onSubmitChannelModal,
  deleteConfirm,
  setDeleteConfirm,
  onConfirmDelete,
  bulkRunning,
}: InventoryBulkModalsProps) {
  return (
    <>
      {tagModal && (
        <ModalShell title={tagModal.mode === 'add' ? 'Add tags' : 'Remove tags'} onClose={() => setTagModal(null)}>
          <p className="text-sm text-gray-500 mb-2">Comma-separated tags.</p>
          <input
            type="text"
            autoFocus
            value={tagModal.input}
            onChange={(e) => setTagModal({ ...tagModal, input: e.target.value })}
            placeholder="e.g. summer, sale"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          />
          <ModalActions
            onCancel={() => setTagModal(null)}
            onConfirm={onSubmitTagModal}
            confirmLabel={tagModal.mode === 'add' ? 'Add Tags' : 'Remove Tags'}
            disabled={bulkRunning || tagModal.input.trim() === ''}
          />
        </ModalShell>
      )}

      {channelModal && (
        <ModalShell title={channelModal.mode === 'include' ? 'Include in channel' : 'Exclude from channel'} onClose={() => setChannelModal(null)}>
          <p className="text-sm text-gray-500 mb-2">Exact Shopify sales channel name (e.g. &quot;Online Store&quot;).</p>
          <input
            type="text"
            autoFocus
            value={channelModal.input}
            onChange={(e) => setChannelModal({ ...channelModal, input: e.target.value })}
            placeholder="Online Store"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          />
          <ModalActions
            onCancel={() => setChannelModal(null)}
            onConfirm={onSubmitChannelModal}
            confirmLabel={channelModal.mode === 'include' ? 'Include' : 'Exclude'}
            disabled={bulkRunning || channelModal.input.trim() === ''}
          />
        </ModalShell>
      )}

      {deleteConfirm && (
        <ModalShell title="Delete product(s)" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-4">
            {deleteConfirm.kind === 'single'
              ? `This permanently deletes "${deleteConfirm.title}" from Shopify. This cannot be undone.`
              : 'This permanently deletes the selected products from Shopify. This cannot be undone.'}
          </p>
          <ModalActions
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={onConfirmDelete}
            confirmLabel={bulkRunning ? 'Deleting...' : 'Delete'}
            disabled={bulkRunning}
            danger
          />
        </ModalShell>
      )}
    </>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  danger,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
          danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
