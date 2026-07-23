'use client';

import { useState } from 'react';
import { useInventoryFilters } from './useInventoryFilters';
import { useInventoryData } from './useInventoryData';
import { useInventorySync } from './useInventorySync';

export function useInventoryPage() {
  const [error, setError] = useState('');
  const [refreshRotation, setRefreshRotation] = useState(0);

  const filters = useInventoryFilters();
  const data = useInventoryData({ queryString: filters.queryString, setPagination: filters.setPagination });
  const sync = useInventorySync({ setError });

  const handleRefresh = () => {
    setRefreshRotation((prev) => prev + 360);
    sync.setSyncRefreshNeeded(false);
    data.bumpRefresh();
  };

  return {
    refreshRotation,
    handleRefresh,
    ...filters,
    ...data,
    ...sync,
    error: error || data.error,
  };
}
