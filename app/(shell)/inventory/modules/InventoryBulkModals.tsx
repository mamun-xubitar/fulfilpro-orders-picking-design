'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';

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
        <ModalShell
          title={tagModal.mode === 'add' ? 'Add tags' : 'Remove tags'}
          onClose={() => setTagModal(null)}
          footer={
            <ModalActions
              onCancel={() => setTagModal(null)}
              onConfirm={onSubmitTagModal}
              confirmLabel={tagModal.mode === 'add' ? 'Add Tags' : 'Remove Tags'}
              disabled={bulkRunning || tagModal.input.trim() === ''}
            />
          }
        >
          <p className="text-sm text-gray-500 mb-2">Comma-separated tags.</p>
          <input
            type="text"
            autoFocus
            value={tagModal.input}
            onChange={(e) => setTagModal({ ...tagModal, input: e.target.value })}
            placeholder="e.g. summer, sale"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          />
        </ModalShell>
      )}

      {channelModal && (
        <ModalShell
          title={channelModal.mode === 'include' ? 'Include in channel' : 'Exclude from channel'}
          onClose={() => setChannelModal(null)}
          footer={
            <ModalActions
              onCancel={() => setChannelModal(null)}
              onConfirm={onSubmitChannelModal}
              confirmLabel={channelModal.mode === 'include' ? 'Include' : 'Exclude'}
              disabled={bulkRunning || channelModal.input.trim() === ''}
            />
          }
        >
          <p className="text-sm text-gray-500 mb-2">Exact Shopify sales channel name (e.g. &quot;Online Store&quot;).</p>
          <input
            type="text"
            autoFocus
            value={channelModal.input}
            onChange={(e) => setChannelModal({ ...channelModal, input: e.target.value })}
            placeholder="Online Store"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          />
        </ModalShell>
      )}

      {deleteConfirm && (
        <ModalShell
          title="Delete product(s)"
          onClose={() => setDeleteConfirm(null)}
          footer={
            <ModalActions
              onCancel={() => setDeleteConfirm(null)}
              onConfirm={onConfirmDelete}
              confirmLabel={bulkRunning ? 'Deleting...' : 'Delete'}
              disabled={bulkRunning}
              danger
            />
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            {deleteConfirm.kind === 'single'
              ? `This permanently deletes "${deleteConfirm.title}" from Shopify. This cannot be undone.`
              : 'This permanently deletes the selected products from Shopify. This cannot be undone.'}
          </p>
        </ModalShell>
      )}
    </>
  );
}
