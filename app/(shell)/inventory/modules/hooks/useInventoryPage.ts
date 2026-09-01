'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { isValidHandle } from '@/lib/inventory/handle';
import { DEMO_ONLINE_STORES } from '../constants';
import { summariseVariants } from '../utils';
import { useAdjustments } from './useAdjustments';
import { useCatalogData } from './useCatalogData';
import { useImportExport } from './useImportExport';
import { useImportProducts } from './useImportProducts';
import { useProductDetails } from './useProductDetails';
import { useProductImageMutations } from './useProductImageMutations';
import { useProductImages } from './useProductImages';
import { useProductNavigation } from './useProductNavigation';
import { useProductPricing } from './useProductPricing';
import { useProductsTable } from './useProductsTable';
import { usePurchaseOrder } from './usePurchaseOrder';
import { useStocktake } from './useStocktake';
import { useVariantsMatrix } from './useVariantsMatrix';
import type { ModuleTabId, ProductRecord, ProductTabId, StoreListing } from '../types';

export function useInventoryPage() {
  const data = useCatalogData();
  const [now] = useState(() => Date.now());
  const [moduleTab, setModuleTab] = useState<ModuleTabId>('products');
  const [productTab, setProductTab] = useState<ProductTabId>('details');
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editImagesOpen, setEditImagesOpen] = useState(false);
  const [storePriceTarget, setStorePriceTarget] = useState<StoreListing | null>(null);
  /** "Online stores & prices" has no backend yet — kept on the static design mock-up, edited only in-session. */
  const [demoStores, setDemoStores] = useState<StoreListing[]>(DEMO_ONLINE_STORES);
  const { request: requestCreate, loading: creatingProduct, errors: createErrors } = useRequest<ProductRecord>();

  const nav = useProductNavigation(data.products);
  const product = nav.product;

  const onProductSaved = (updated: ProductRecord) => data.updateProduct(updated.id, updated);

  const gallery = useProductImages(product);
  const imageMutations = useProductImageMutations({ product, onSaved: onProductSaved });
  const pricing = useProductPricing({ product, globals: data.globals, onSaved: onProductSaved });
  const details = useProductDetails({ product, onSaved: onProductSaved });
  // A variant delete (or edit) can prune a colour/size the details draft doesn't know about yet
  // — sync the draft's lists from the server's copy so a since-removed value isn't offered back.
  const onVariantSaved = (updated: ProductRecord) => {
    onProductSaved(updated);
    details.syncListsFromProduct(updated);
  };
  const matrix = useVariantsMatrix({ product, sizes: details.sizes, colours: details.colours, onVariantSaved });
  const po = usePurchaseOrder({ product, onSaved: onProductSaved });
  const stocktake = useStocktake({ product, onSaved: onProductSaved });
  const adjustments = useAdjustments({ product, onSaved: onProductSaved });
  const importExport = useImportExport({ product, onSaved: onProductSaved, onPoImported: po.loadPurchaseOrders });
  const importProducts = useImportProducts({ supplierOptions: po.supplierOptions, addProduct: data.addProduct, updateProduct: data.updateProduct });
  const productsTable = useProductsTable({ products: data.products, verifiedOnly: nav.verifiedOnly, onView: nav.viewProduct, removeProducts: data.removeProducts, patchProducts: data.patchProducts });

  /** Stock Summary always reflects the whole product, not the matrix's filtered rows. */
  const summary = useMemo(() => summariseVariants(product?.variants ?? []), [product]);

  /** Every remaining stub button (design-only surfaces) lands here. */
  const notImplemented = (action: string) => {
    toast.info(`${action} isn't available yet.`);
  };

  const createProduct = (form: { supplierId: string; itemNo: string; name: string; brand: string; handle: string }) => {
    requestCreate({
      url: '/api/inventory/catalog',
      method: 'POST',
      data: form,
      successMessage: 'Product created',
      validation: async () => {
        const errors: Record<string, string> = {};
        if (!form.supplierId) errors.supplierId = 'Supplier is required';
        if (!form.itemNo.trim()) errors.itemNo = 'Item number is required';
        if (!form.name.trim()) errors.name = 'Product name is required';
        if (!isValidHandle(form.handle.trim())) errors.handle = 'Enter a valid handle (lowercase letters, numbers and dashes)';
        return errors;
      },
      onSuccess: ({ data: created }) => {
        data.addProduct(created);
        nav.selectProduct(created.id);
        setNewProductOpen(false);
      },
    });
  };

  const saveStorePrice = (storeId: string, price: number) => {
    setDemoStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, price } : s)));
    setStorePriceTarget(null);
    toast.success('Store price updated (design preview only)');
  };

  return {
    loading: data.loading,
    initialLoading: data.initialLoading,
    refresh: data.refresh,
    product,
    globals: data.globals,
    now,
    moduleTab,
    setModuleTab,
    productTab,
    setProductTab,
    nav,
    gallery,
    imageMutations,
    pricing,
    details,
    matrix,
    po,
    stocktake,
    adjustments,
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
    notImplemented,
    newProductOpen,
    openNewProduct: () => setNewProductOpen(true),
    closeNewProduct: () => setNewProductOpen(false),
    creatingProduct,
    createErrors,
    createProduct,
    supplierOptions: po.supplierOptions,
    editImagesOpen,
    openEditImages: () => setEditImagesOpen(true),
    closeEditImages: () => setEditImagesOpen(false),
    storePriceTarget,
    setStorePriceTarget,
    saveStorePrice,
    demoStores,
  };
}

export type InventoryPage = ReturnType<typeof useInventoryPage>;
