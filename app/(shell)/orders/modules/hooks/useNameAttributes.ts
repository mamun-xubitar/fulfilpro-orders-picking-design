import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, OrderRow } from '../types';
import { buildNameAttributesCsv, buildNameAttributesDocument, downloadCsv, type NameAttributeRow } from '../nameAttributesExport';
import { printDocumentInHiddenFrame } from '../packingSlipPrint';
import { orderNameEntries } from '../utils';

type UseNameAttributesArgs = {
  orders: OrderRow[];
  queryString: string;
  period: string;
  search: string;
  storeIds: string[];
  dateFrom: string;
  dateTo: string;
  fulfillmentStatuses: string[];
  packingStatuses: string[];
};

export function useNameAttributes({
  orders,
  queryString,
  period,
  search,
  storeIds,
  dateFrom,
  dateTo,
  fulfillmentStatuses,
  packingStatuses,
}: UseNameAttributesArgs) {
  const [selectedNames, setSelectedNames] = useState<Map<string, NameAttributeRow>>(new Map());
  const [selectAllFilters, setSelectAllFilters] = useState(false);
  const [excludedNames, setExcludedNames] = useState<Set<string>>(new Set());
  const [filterNameCount, setFilterNameCount] = useState<number | null>(null);
  const [nameCountLoading, setNameCountLoading] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectAllFilters(false);
    setExcludedNames(new Set());
    setSelectedNames(new Map());
    setFilterNameCount(null);
  }, [period, search, storeIds, dateFrom, dateTo, fulfillmentStatuses, packingStatuses]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNameChecked = (key: string) => (selectAllFilters ? !excludedNames.has(key) : selectedNames.has(key));

  const selectedNameCount = selectAllFilters
    ? Math.max(0, (filterNameCount ?? 0) - excludedNames.size)
    : selectedNames.size;

  const setNamesChecked = (entries: Array<{ key: string; row: NameAttributeRow }>, checked: boolean) => {
    if (selectAllFilters) {
      setExcludedNames((prev) => {
        const next = new Set(prev);
        entries.forEach(({ key }) => (checked ? next.delete(key) : next.add(key)));
        return next;
      });
    } else {
      setSelectedNames((prev) => {
        const next = new Map(prev);
        entries.forEach(({ key, row }) => (checked ? next.set(key, row) : next.delete(key)));
        return next;
      });
    }
  };

  const isOrderAllNamesChecked = (order: OrderRow) => {
    const entries = orderNameEntries(order);
    return entries.length > 0 && entries.every(({ key }) => isNameChecked(key));
  };

  const toggleOrderNames = (order: OrderRow) => {
    setNamesChecked(orderNameEntries(order), !isOrderAllNamesChecked(order));
  };

  const fetchNameAttributeCount = useCallback(async () => {
    setNameCountLoading(true);
    try {
      const res = await fetch(`/api/orders/name-attributes?${queryString}`);
      const json = (await res.json()) as ApiResponse<{ count: number }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load attributes');
      setFilterNameCount(json.data.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attribute count');
      setFilterNameCount(0);
    } finally {
      setNameCountLoading(false);
    }
  }, [queryString]);

  const handleToggleSelectAllFilters = () => {
    if (selectAllFilters) {
      setSelectAllFilters(false);
      setExcludedNames(new Set());
      setFilterNameCount(null);
      return;
    }
    setSelectedNames(new Map());
    setExcludedNames(new Set());
    setSelectAllFilters(true);
    void fetchNameAttributeCount();
  };

  const handleToggleCurrentPage = () => {
    const entries = orders.flatMap(orderNameEntries);
    const allChecked = entries.length > 0 && entries.every(({ key }) => isNameChecked(key));
    if (selectAllFilters) {
      setSelectAllFilters(false);
      setExcludedNames(new Set());
      setFilterNameCount(null);
      setSelectedNames(allChecked ? new Map() : new Map(entries.map(({ key, row }) => [key, row])));
      return;
    }
    setSelectedNames((prev) => {
      const next = new Map(prev);
      entries.forEach(({ key, row }) => (allChecked ? next.delete(key) : next.set(key, row)));
      return next;
    });
  };

  const currentPageNameEntries = orders.flatMap(orderNameEntries);
  const isCurrentPageAllChecked = currentPageNameEntries.length > 0 && currentPageNameEntries.every(({ key }) => isNameChecked(key));

  const gatherExportRows = useCallback(async (): Promise<NameAttributeRow[]> => {
    if (selectAllFilters) {
      const res = await fetch(`/api/orders/name-attributes?${queryString}`);
      const json = (await res.json()) as ApiResponse<{
        attributes: Array<{ orderId: string; orderNumber: string; lineItemId: string; productTitle: string; value: string }>;
      }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load attributes');
      return json.data.attributes
        .filter((a) => !excludedNames.has(`${a.orderId}:${a.lineItemId}`))
        .map((a) => ({ orderNumber: a.orderNumber, productTitle: a.productTitle, value: a.value }));
    }
    return Array.from(selectedNames.values());
  }, [selectAllFilters, queryString, excludedNames, selectedNames]);

  const runExport = async (mode: 'csv' | 'print') => {
    setExportDropdownOpen(false);
    setExportLoading(true);
    try {
      const rows = await gatherExportRows();
      if (rows.length === 0) {
        toast.info('No attributes selected to export.');
        return;
      }
      if (mode === 'csv') {
        downloadCsv(`name-attributes-${new Date().toISOString().slice(0, 10)}.csv`, buildNameAttributesCsv(rows));
      } else {
        await printDocumentInHiddenFrame(buildNameAttributesDocument(rows));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export attributes');
    } finally {
      setExportLoading(false);
    }
  };

  return {
    selectedNames,
    selectAllFilters,
    excludedNames,
    filterNameCount,
    nameCountLoading,
    exportDropdownOpen, setExportDropdownOpen,
    exportLoading,
    exportDropdownRef,
    isNameChecked,
    selectedNameCount,
    setNamesChecked,
    isOrderAllNamesChecked,
    toggleOrderNames,
    fetchNameAttributeCount,
    handleToggleSelectAllFilters,
    handleToggleCurrentPage,
    isCurrentPageAllChecked,
    currentPageNameEntries,
    gatherExportRows,
    runExport,
  };
}
