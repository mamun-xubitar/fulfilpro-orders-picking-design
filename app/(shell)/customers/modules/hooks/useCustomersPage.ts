'use client';

import { useSession } from 'next-auth/react';
import { useStoreOptions } from '@/hooks/useStoreOptions';
import { useCustomerActions } from './useCustomerActions';
import { useCustomerForm } from './useCustomerForm';
import { useCustomersList } from './useCustomersList';

export function useCustomersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const stores = useStoreOptions();
  const list = useCustomersList();
  const form = useCustomerForm(list.source, list.refresh);
  const actions = useCustomerActions(list.source, list.refresh);

  return {
    stores,
    list,
    form,
    actions,
    canWrite: role === 'admin' || role === 'staff',
    isAdmin: role === 'admin',
  };
}
