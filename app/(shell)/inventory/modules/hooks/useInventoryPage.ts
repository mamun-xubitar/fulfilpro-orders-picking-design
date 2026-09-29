'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { isValidHandle } from '@/lib/inventory/handle';
import { summariseVariants } from '../utils';
import { useAdjustments } from './useAdjustments';
import { useCatalogData } from './useCatalogData';
import { useImportExport } from './useImportExport';
import { useImportProducts } from './useImportProducts';
import { useInventoryCategories } from './useInventoryCategories';
import { useOptionLibrary } from './useOptionLibrary';
import { useProductDetails } from './useProductDetails';
import { useProductImageMutations } from './useProductImageMutations';
import { useProductImages } from './useProductImages';
import { useProductNavigation } from './useProductNavigation';
import { useProductPricing } from './useProductPricing';
import { useProductsTable } from './useProductsTable';
import { usePurchaseOrder } from './usePurchaseOrder';
import { useStocktake } from './useStocktake';
import { useSuppliers } from './useSuppliers';
import { useStoreListings } from './useStoreListings';
import { useStorePublish } from './useStorePublish';
import { useVariantsMatrix } from './useVariantsMatrix';
import type { ModuleTabId, ProductRecord, StoreListingResult } from '../types';

export function useInventoryPage() {
  const data = useCatalogData();
  const [now] = useState(() => Date.now());
  const [moduleTab, setModuleTab] = useState<ModuleTabId>('products');
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editImagesOpen, setEditImagesOpen] = useState(false);
  const [deleteProductOpen, setDeleteProductOpen] = useState(false);
  const [matrixFullView, setMatrixFullView] = useState(false);
  const [storePriceTarget, setStorePriceTarget] = useState<StoreListingResult | null>(null);
  const { request: requestCreate, loading: creatingProduct, errors: createErrors } = useRequest<ProductRecord>();
  const { request: requestDeleteProduct, loading: deletingProduct } = useRequest<null>();
  // Bumped whenever a product's supplier links could have changed (create, details save,
  // delete, CSV import) so the Suppliers tab's Products Count updates immediately rather than
  // waiting for the next Receive PO.
  const [supplierRefreshNonce, setSupplierRefreshNonce] = useState(0);
  const bumpSupplierRefresh = () => setSupplierRefreshNonce((n) => n + 1);

  const nav = useProductNavigation(data);
  const product = nav.product;
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
  };
  const matrix = useVariantsMatrix({ product, sizes: details.sizes, quickFilter: data.quickFilter, onVariantSaved });
  const po = usePurchaseOrder({ product, onSaved: onProductSaved });
  const stocktake = useStocktake({ product, onSaved: onProductSaved });
  const adjustments = useAdjustments({ product, onSaved: onProductSaved });
  const importExport = useImportExport({ product, onSaved: onProductSaved, onPoImported: po.loadPurchaseOrders, supplierOptions: po.supplierOptions });
  const productsTable = useProductsTable({ enabled: data.allRecords, verifiedOnly: nav.verifiedOnly, quickFilter: nav.quickFilter, onView: nav.viewProduct, onCounts: data.syncCounts, onDeleted: bumpSupplierRefresh });
  const importProducts = useImportProducts({ supplierOptions: po.supplierOptions, onImported: () => { data.refresh(); productsTable.refresh(); bumpSupplierRefresh(); } });
  const suppliers = useSuppliers({ onChanged: po.refreshSuppliers, refreshKey: po.receivedNonce + supplierRefreshNonce });

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
    po,
    stocktake,
    adjustments,
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
