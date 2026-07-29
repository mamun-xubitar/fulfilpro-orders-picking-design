'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useRequest from '@/hooks/useRequest';
import type { SiblingProduct } from '../types';

type UseStoreSiblingsArgs = {
  bumpRefresh: () => void;
};

export function useStoreSiblings({ bumpRefresh }: UseStoreSiblingsArgs) {
  const router = useRouter();
  const [navigateTarget, setNavigateTarget] = useState<SiblingProduct | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SiblingProduct | null>(null);
  const { request, loading: removing } = useRequest();

  const requestNavigate = (sibling: SiblingProduct) => setNavigateTarget(sibling);
  const cancelNavigate = () => setNavigateTarget(null);
  const confirmNavigate = () => {
    if (navigateTarget) router.push(`/inventory/${navigateTarget.id}`);
    setNavigateTarget(null);
  };

  const requestRemove = (sibling: SiblingProduct) => setRemoveTarget(sibling);
  const cancelRemove = () => setRemoveTarget(null);
  const confirmRemove = () => {
    if (!removeTarget) return;
    request({
      url: `/api/inventory/products/${removeTarget.id}`,
      method: 'DELETE',
      successMessage: 'Product removed',
      onSuccess: () => {
        bumpRefresh();
        setRemoveTarget(null);
      },
    });
  };

  return {
    navigateTarget,
    requestNavigate,
    cancelNavigate,
    confirmNavigate,
    removeTarget,
    requestRemove,
    cancelRemove,
    confirmRemove,
    removing,
  };
}
