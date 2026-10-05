'use client';

import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

type InventoryAccess = {
  /** Change inventory data. Admins only — staff and test users have read-only access. */
  canEdit: boolean;
  /** Create a stocktake and key in its counts. Admins and real staff; test users only look. */
  canCount: boolean;
};

const READ_ONLY: InventoryAccess = { canEdit: false, canCount: false };
const InventoryAccessContext = createContext<InventoryAccess>(READ_ONLY);

export function InventoryAccessProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const value: InventoryAccess = { canEdit: role === 'admin', canCount: role === 'admin' || role === 'staff' };
  return <InventoryAccessContext.Provider value={value}>{children}</InventoryAccessContext.Provider>;
}

export const useInventoryAccess = () => useContext(InventoryAccessContext);
