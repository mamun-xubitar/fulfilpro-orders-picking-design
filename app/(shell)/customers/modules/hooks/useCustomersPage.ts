'use client';

import { useSession } from 'next-auth/react';
import { useStoreOptions } from '@/hooks/useStoreOptions';
import { useCustomerActions } from './useCustomerActions';
import { useCustomerForm } from './useCustomerForm';
import { useCustomersList } from './useCustomersList';
import { useEmailPicks } from './useEmailPicks';

export function useCustomersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const stores = useStoreOptions();
  const list = useCustomersList();
  const form = useCustomerForm(list.source, list.refresh);
  const actions = useCustomerActions(list.source, list.refresh);
  const emails = useEmailPicks();

  // Selected rows belong to one tab: a new tab starts with nothing selected.
  const changeSource: typeof list.changeSource = (next) => {
    actions.clearSelection();
    emails.clearPicks();
    list.changeSource(next);
  };

  return {
    stores,
    list: { ...list, changeSource },
    form,
    actions,
    emails,
    canWrite: role === 'admin' || role === 'staff',
    isAdmin: role === 'admin',
  };
}
