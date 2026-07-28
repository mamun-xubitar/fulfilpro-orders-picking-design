'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { ProductDetail, ProductFieldsPayload, ProductStatusValue } from '../types';

export type EditState =
  | { field: 'title'; value: string }
  | { field: 'vendor'; value: string }
  | { field: 'description'; value: string }
  | { field: 'productType'; value: string }
  | { field: 'status'; value: ProductStatusValue }
  | { field: 'category'; value: { id: string; name: string } | null }
  | { field: 'tags'; value: string[] }
  | { field: 'price' | 'cost'; value: string };

export type EditableField = EditState['field'];

type UseFieldEditArgs = {
  product: ProductDetail | null;
  bumpRefresh: () => void;
};

function seedValue(product: ProductDetail, field: EditableField): EditState {
  switch (field) {
    case 'title':
      return { field, value: product.title };
    case 'vendor':
      return { field, value: product.vendor ?? '' };
    case 'description':
      return { field, value: product.descriptionHtml ?? '' };
    case 'productType':
      return { field, value: product.productType ?? '' };
    case 'status':
      return { field, value: product.status };
    case 'category':
      return { field, value: product.categoryId && product.category ? { id: product.categoryId, name: product.category } : null };
    case 'tags':
      return { field, value: product.tags };
    case 'price':
    case 'cost':
      return { field, value: '' };
  }
}

export function useFieldEdit({ product, bumpRefresh }: UseFieldEditArgs) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const { request: requestProduct, loading: savingProduct } = useRequest();
  const { request: requestVariants, loading: savingVariants } = useRequest();

  const openEdit = (field: EditableField) => {
    if (!product) return;
    setEditing(seedValue(product, field));
  };

  const closeEdit = () => setEditing(null);

  const setValue = (value: EditState['value']) => setEditing((prev) => (prev ? ({ ...prev, value } as EditState) : prev));

  const save = () => {
    if (!product || !editing) return;

    if (editing.field === 'price' || editing.field === 'cost') {
      const field = editing.field;
      const numericValue = Number(editing.value);
      requestVariants({
        url: `/api/inventory/products/${product.id}/variants`,
        method: 'PATCH',
        data: { variants: product.variants.map((v) => ({ id: v.id, [field]: numericValue })) } as unknown as Record<string, unknown>,
        successMessage: field === 'price' ? 'Price updated for all variants' : 'Cost updated for all variants',
        onSuccess: () => {
          bumpRefresh();
          closeEdit();
        },
      });
      return;
    }

    let payload: ProductFieldsPayload;
    switch (editing.field) {
      case 'title':
        payload = { title: editing.value.trim() };
        break;
      case 'vendor':
        payload = { vendor: editing.value.trim() };
        break;
      case 'description':
        payload = { descriptionHtml: editing.value };
        break;
      case 'productType':
        payload = { productType: editing.value.trim() };
        break;
      case 'status':
        payload = { status: editing.value };
        break;
      case 'category':
        payload = { category: editing.value };
        break;
      case 'tags':
        payload = { tags: editing.value };
        break;
    }

    requestProduct({
      url: `/api/inventory/products/${product.id}`,
      method: 'PATCH',
      data: payload as unknown as Record<string, unknown>,
      successMessage: 'Product updated',
      onSuccess: () => {
        bumpRefresh();
        closeEdit();
      },
    });
  };

  return { editing, openEdit, closeEdit, setValue, save, saving: savingProduct || savingVariants, storeId: product?.storeId ?? '' };
}
