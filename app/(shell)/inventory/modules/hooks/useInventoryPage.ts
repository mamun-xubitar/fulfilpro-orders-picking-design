'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { isValidHandle } from '@/lib/inventory/handle';
import { summariseVariants } from '../utils';
import { useAdjustmentDetail } from './useAdjustmentDetail';
import { useAdjustments } from './useAdjustments';
import { useAdjustmentsTab } from './useAdjustmentsTab';
import { useHistoryTab } from './useHistoryTab';
import { useCatalogData } from './useCatalogData';
import { useImportExport } from './useImportExport';
import { useImportProducts } from './useImportProducts';
import { useBulkLocations } from './useBulkLocations';
import { useInventoryCategories } from './useInventoryCategories';
import { useLocations } from './useLocations';
import { useOptionLibrary } from './useOptionLibrary';
import { useProductDetails } from './useProductDetails';
import { useProductImageMutations } from './useProductImageMutations';
import { useProductImages } from './useProductImages';
import { useProductNavigation } from './useProductNavigation';
import { useProductPricing } from './useProductPricing';
import { useProductsTable } from './useProductsTable';
import { usePaymentsTab } from './usePaymentsTab';
import { usePoPayment } from './usePoPayment';
import { usePurchaseOrder } from './usePurchaseOrder';
import { usePurchaseOrdersTab } from './usePurchaseOrdersTab';
import { useStocktake } from './useStocktake';
import { useStocktakeDetail } from './useStocktakeDetail';
import { useStocktakesTab } from './useStocktakesTab';
import { useSuppliers } from './useSuppliers';
import { useStoreListings } from './useStoreListings';
import { useStorePublish } from './useStorePublish';
import { useVariantsMatrix } from './useVariantsMatrix';
import type { ModuleTabId, ProductRecord, StoreListingResult } from '../types';

export function useInventoryPage() {
  const data = useCatalogData();
  const [now] = useState(() => Date.now());
  const [moduleTab, setModuleTabState] = useState<ModuleTabId>('variants');
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editImagesOpen, setEditImagesOpen] = useState(false);
  const [deleteProductOpen, setDeleteProductOpen] = useState(false);
  const [matrixFullView, setMatrixFullView] = useState(false);
  // Bumped when a variant's locations are saved, so the Location tab's per-location counts refresh.
  const [locationRefreshNonce, setLocationRefreshNonce] = useState(0);
  const [storePriceTarget, setStorePriceTarget] = useState<StoreListingResult | null>(null);
  const { request: requestCreate, loading: creatingProduct, errors: createErrors } = useRequest<ProductRecord>();
  const { request: requestDeleteProduct, loading: deletingProduct } = useRequest<null>();
  // Bumped whenever a product's supplier links could have changed (create, details save,
  // delete, CSV import) so the Suppliers tab's Products Count updates immediately rather than
  // waiting for the next Receive PO.
  const [supplierRefreshNonce, setSupplierRefreshNonce] = useState(0);
  const bumpSupplierRefresh = () => setSupplierRefreshNonce((n) => n + 1);

  const baseNav = useProductNavigation(data);
  const product = baseNav.product;
  // "See List" is one shared toggle that persists across every tab: ticked, whichever tab is active
  // shows the products list in place; unticked, it shows that tab's own content. The toolbar sits
  // above every tab, so picking a product while on a non-product tab (Purchase Orders, Location, …)
  // lands on the Variant tab.
  const setModuleTab = (id: ModuleTabId) => setModuleTabState(id);
  /** Opens a product's Variant tab — untick See List, focus the product, switch tab. */
  const openProductInVariants = (id: string) => {
    baseNav.viewProduct(id);
    setModuleTabState('variants');
  };
  const nav = {
    ...baseNav,
    selectProduct: (id: string) => {
      baseNav.selectProduct(id);
      if (moduleTab !== 'products' && moduleTab !== 'variants') setModuleTabState('variants');
    },
  };
  const storeListings = useStoreListings(product?.id ?? null);
  const storePublish = useStorePublish({ product, storeListings });
  // Stepping to another product invalidates any open store-price modal, and any in-progress
  // publish/bulk-update draft — both hold onto ids and prices that belong to the product that was
  // on screen when they were opened. Adjusted during render (React's recommended pattern for
  // resetting state on a prop change) rather than in an effect.
  const [renderedProductId, setRenderedProductId] = useState(product?.id);
  if (product?.id !== renderedProductId) {
    setRenderedProductId(product?.id);
    if (storePriceTarget !== null) setStorePriceTarget(null);
    storePublish.resetForProductChange();
  }

  const onProductSaved = (updated: ProductRecord) => {
    data.updateProduct(updated.id, updated);
    bumpSupplierRefresh();
  };

  // A sync rewrites stock for whichever product the stocktake belongs to — which needn't be the one on
  // screen (and "See List" shows none) — so refetch the focused product and the products table too,
  // not just patch the synced product in place.
  const onStocktakeSynced = (updated: ProductRecord) => {
    onProductSaved(updated);
    data.refresh();
    productsTable.refresh();
  };

  const gallery = useProductImages(product);
  const imageMutations = useProductImageMutations({ product, onSaved: onProductSaved });
  const pricing = useProductPricing({ product, globals: data.globals, storeListings, onSaved: onProductSaved });
  const optionLibrary = useOptionLibrary();
  const inventoryCategories = useInventoryCategories();
  const details = useProductDetails({ product, onSaved: onProductSaved });
  // A variant delete/edit, or the Colour & size adjustment modal's Replace/Insert, can change a
  // colour/size the details draft doesn't know about yet — sync the draft's lists from the
  // server's copy so a since-removed value isn't offered back (and a since-added one is).
  const onVariantSaved = (updated: ProductRecord) => {
    onProductSaved(updated);
    details.syncListsFromProduct(updated);
    setLocationRefreshNonce((n) => n + 1);
  };
  const matrix = useVariantsMatrix({ product, sizes: details.sizes, quickFilter: data.quickFilter, onVariantSaved });
  const locations = useLocations({ refreshKey: locationRefreshNonce, onChanged: data.refresh });
  const bulkLocations = useBulkLocations({
    product,
    selectedIds: matrix.selectedIds,
    onSaved: (updated) => {
      onProductSaved(updated);
      setLocationRefreshNonce((n) => n + 1);
    },
    onDone: () => matrix.clearSelection(),
  });
  const po = usePurchaseOrder({ product, onSaved: onProductSaved });
  // Bumped after a payment save so the PO list, the Payments list and the Suppliers tab's payment
  // counts all refetch.
  const [payNonce, setPayNonce] = useState(0);
  const payment = usePoPayment({ globals: data.globals, onSaved: () => setPayNonce((n) => n + 1) });
  const poTab = usePurchaseOrdersTab({
    enabled: moduleTab === 'purchase-orders',
    refreshKey: po.receivedNonce + payNonce,
    onChanged: () => {
      data.refresh();
      bumpSupplierRefresh();
    },
  });
  const paymentsTab = usePaymentsTab({ enabled: moduleTab === 'payments', refreshKey: payNonce });
  const [supplierDetailId, setSupplierDetailId] = useState<string | null>(null);
  /** The Suppliers tab's PO / payment counts: jump to that tab already narrowed to the supplier. */
  const openPurchaseOrdersFor = (supplierId: string) => {
    poTab.focusSupplier(supplierId);
    setSupplierDetailId(null);
    setModuleTabState('purchase-orders');
  };
  const openPaymentsFor = (supplierId: string) => {
    paymentsTab.focusSupplier(supplierId);
    setSupplierDetailId(null);
    setModuleTabState('payments');
  };
  // Bumped when a stocktake is created so the Stocktake tab's list refetches.
  const [stocktakeNonce, setStocktakeNonce] = useState(0);
  const stocktake = useStocktake({ product, onCreated: () => setStocktakeNonce((n) => n + 1) });
  const stocktakesTab = useStocktakesTab({ enabled: moduleTab === 'stocktake', refreshKey: stocktakeNonce });
  const stocktakeDetail = useStocktakeDetail({ isAdmin: stocktakesTab.isAdmin, onChanged: stocktakesTab.refresh, onSynced: onStocktakeSynced });
  const adjustments = useAdjustments({ product, onSaved: onProductSaved });
  const adjustmentDetail = useAdjustmentDetail();
  const adjustmentsTab = useAdjustmentsTab({ enabled: moduleTab === 'adjustments' });
  const historyTab = useHistoryTab({ enabled: moduleTab === 'history' });
  const importExport = useImportExport({ product, onSaved: onProductSaved });
  const productsTable = useProductsTable({ enabled: data.allRecords, verifiedOnly: nav.verifiedOnly, quickFilter: nav.quickFilter, onView: moduleTab === 'products' ? nav.viewProduct : openProductInVariants, onCounts: data.syncCounts, onDeleted: bumpSupplierRefresh });
  const importProducts = useImportProducts({ supplierOptions: po.supplierOptions, onImported: () => { data.refresh(); productsTable.refresh(); bumpSupplierRefresh(); } });
  const suppliers = useSuppliers({ onChanged: po.refreshSuppliers, refreshKey: po.receivedNonce + supplierRefreshNonce + payNonce });

  /** Stock Summary always reflects the whole product, not the matrix's filtered rows. */
  const summary = useMemo(() => summariseVariants(product?.variants ?? []), [product]);

  const confirmDeleteProduct = () => {
    if (!product) return;
    requestDeleteProduct({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'DELETE',
      successMessage: 'Product deleted',
      onSuccess: () => {
        nav.removeProduct(product.id);
        productsTable.refresh();
        bumpSupplierRefresh();
        setDeleteProductOpen(false);
      },
    });
  };

  /** `onCreated` fires with the new product's id once creation succeeds — used by the New
   * Product wizard to advance to step 2. The wizard (not this function) owns closing the modal,
   * since steps 2-5 keep it open against the same created product. */
  const createProduct = (
    form: { supplierIds: string[]; itemNo: string; name: string; brand: string; handle: string },
    onCreated?: (id: string) => void
  ) => {
    requestCreate({
      url: '/api/inventory/catalog',
      method: 'POST',
      data: form,
      successMessage: 'Product created',
      validation: async () => {
        const errors: Record<string, string> = {};
        if (form.supplierIds.length === 0) errors.supplierId = 'At least one supplier is required';
        if (!form.itemNo.trim()) errors.itemNo = 'Item number is required';
        if (!form.name.trim()) errors.name = 'Product name is required';
        if (!isValidHandle(form.handle.trim())) errors.handle = 'Enter a valid handle (lowercase letters, numbers and dashes)';
        return errors;
      },
      onSuccess: ({ data: created }) => {
        nav.selectProduct(created.id);
        bumpSupplierRefresh();
        onCreated?.(created.id);
      },
    });
  };

  return {
    loading: data.loading,
    showSkeleton: data.showSkeleton,
    refresh: data.refresh,
    product,
    globals: data.globals,
    now,
    moduleTab,
    setModuleTab,
    nav,
    gallery,
    imageMutations,
    pricing,
    details,
    matrix,
    locations,
    bulkLocations,
    po,
    poTab,
    payment,
    paymentsTab,
    supplierDetailId,
    openProductInVariants,
    openSupplierDetails: setSupplierDetailId,
    closeSupplierDetails: () => setSupplierDetailId(null),
    openPurchaseOrdersFor,
    openPaymentsFor,
    stocktake,
    stocktakesTab,
    stocktakeDetail,
    adjustments,
    adjustmentDetail,
    adjustmentsTab,
    historyTab,
    suppliers,
    importExport,
    importProducts,
    productsTable,
    summary,
    rateInput: data.rateInput,
    setRateInput: data.setRateInput,
    applyGlobalRate: data.applyGlobalRate,
    marginInput: data.marginInput,
    setMarginInput: data.setMarginInput,
    applyGlobalMargin: data.applyGlobalMargin,
    matrixFullView,
    openMatrixFullView: () => setMatrixFullView(true),
    closeMatrixFullView: () => setMatrixFullView(false),
    newProductOpen,
    openNewProduct: () => setNewProductOpen(true),
    closeNewProduct: () => setNewProductOpen(false),
    creatingProduct,
    createErrors,
    createProduct,
    deleteProductOpen,
    openDeleteProduct: () => setDeleteProductOpen(true),
    closeDeleteProduct: () => setDeleteProductOpen(false),
    deletingProduct,
    confirmDeleteProduct,
    supplierOptions: po.supplierOptions,
    refreshSuppliers: po.refreshSuppliers,
    editImagesOpen,
    openEditImages: () => setEditImagesOpen(true),
    closeEditImages: () => setEditImagesOpen(false),
    storePriceTarget,
    setStorePriceTarget,
    storeListings,
    storePublish,
    optionLibrary,
    inventoryCategories,
    onVariantSaved,
  };
}

export type InventoryPage = ReturnType<typeof useInventoryPage>;
