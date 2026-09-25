'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { PageHeading, Table, inputClass, selectClass } from '@/components/admin/ui';

interface ProductRow {
  product: {
    id: string; slug: string; sku: string; name: string;
    basePrice: number; compareAtPrice: number | null;
    status: 'draft' | 'active' | 'archived'; isFeatured: boolean;
  };
  category: { id: string; name: string; slug: string };
  stock: number;
  variantCount: number;
}

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = new URLSearchParams({ perPage: '50' });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  const { data, loading, error } = useAdminResource<{ items: ProductRow[]; total: number }>(
    `/api/admin/products?${params.toString()}`,
  );

  return (
    <>
      <PageHeading
        title="Products"
        description={data ? `${data.total} products` : undefined}
        action={
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or SKU"
              aria-label="Search products"
              className={`${inputClass} w-48`}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} w-32`}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <ButtonLink href="/admin/products/new">New product</ButtonLink>
          </div>
        }
      />

      {error && <p role="alert" className="mb-4 text-sm text-crimson">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-muted" /></div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-muted">No products match that.</p>
      ) : (
        <Table head={['Product', 'Category', 'Price', 'Variants', 'Stock', 'Status', '']}>
          {data.items.map(({ product, category, stock, variantCount }) => (
            <tr key={product.id}>
              <td className="px-4 py-3">
                <span className="block text-content">{product.name}</span>
                <span className="numeric text-xs text-faint">{product.sku}</span>
              </td>
              <td className="px-4 py-3 text-muted">{category.name}</td>
              <td className="numeric whitespace-nowrap px-4 py-3 text-content">
                {formatINR(product.basePrice)}
                {product.compareAtPrice && (
                  <span className="block text-xs text-faint line-through">{formatINR(product.compareAtPrice)}</span>
                )}
              </td>
              <td className="numeric px-4 py-3 text-muted">{variantCount}</td>
              <td className="numeric px-4 py-3">
                <span className={stock === 0 ? 'text-crimson' : 'text-muted'}>{stock}</span>
              </td>
              <td className="px-4 py-3">
                <Badge tone={product.status === 'active' ? 'success' : 'neutral'}>{product.status}</Badge>
                {product.isFeatured && <Badge tone="accent" className="ml-1">Featured</Badge>}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Link href={`/admin/products/${product.id}`} className="text-xs text-muted hover:text-content">Edit</Link>
                <Link href={`/products/${product.slug}`} className="ml-3 text-xs text-faint hover:text-content">View</Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
