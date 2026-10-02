'use client';

import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { formatDate } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Card, Field, PageHeading, Table, inputClass, selectClass } from '@/components/admin/ui';

interface Coupon {
  id: string; code: string; description: string | null;
  type: 'percent' | 'flat' | 'free_shipping'; value: number;
  minOrderValue: number | null; maxDiscount: number | null;
  usageLimitTotal: number | null; usageLimitPerUser: number | null;
  timesUsed: number; startsAt: string | null; endsAt: string | null;
  scope: string; targetIds: string[]; isActive: boolean; isPublic: boolean;
}

type CouponType = 'percent' | 'flat' | 'free_shipping';

const EMPTY: {
  code: string; description: string; type: CouponType; value: string;
  minOrderValue: string; maxDiscount: string; usageLimitTotal: string;
  usageLimitPerUser: string; endsAt: string; isPublic: boolean;
} = {
  code: '', description: '', type: 'percent',
  value: '', minOrderValue: '', maxDiscount: '',
  usageLimitTotal: '', usageLimitPerUser: '', endsAt: '', isPublic: false,
};

export default function AdminCouponsPage() {
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: Coupon[] }>('/api/admin/coupons');
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  function describe(coupon: Coupon): string {
    if (coupon.type === 'percent') return `${coupon.value / 100}% off`;
    if (coupon.type === 'flat') return `${formatINR(coupon.value)} off`;
    return 'Free shipping';
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    /* The API takes basis points for percentages and paise for money, so the
       human-friendly inputs are converted here rather than making an admin
       type "2000" to mean 20%. */
    await mutate('POST', '/api/admin/coupons', {
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      type: form.type,
      value: form.type === 'percent'
        ? Math.round(Number(form.value) * 100)
        : form.type === 'flat' ? Math.round(Number(form.value) * 100) : 0,
      minOrderValue: form.minOrderValue ? Math.round(Number(form.minOrderValue) * 100) : null,
      maxDiscount: form.maxDiscount ? Math.round(Number(form.maxDiscount) * 100) : null,
      usageLimitTotal: form.usageLimitTotal ? Number(form.usageLimitTotal) : null,
      usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : null,
      endsAt: form.endsAt || null,
      scope: 'all',
      targetIds: [],
      isActive: true,
      isPublic: form.isPublic,
    });
    setForm(EMPTY);
    setOpen(false);
  }

  /* The admin coupons endpoint is a full replace (PUT takes the whole
     validated shape), so flipping one flag still sends every field back —
     taken straight from the row already on screen. */
  async function togglePublic(coupon: Coupon) {
    await mutate('PUT', `/api/admin/coupons/${coupon.id}`, {
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
      usageLimitTotal: coupon.usageLimitTotal,
      usageLimitPerUser: coupon.usageLimitPerUser,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
      scope: coupon.scope,
      targetIds: coupon.targetIds,
      isActive: coupon.isActive,
      isPublic: !coupon.isPublic,
    });
  }

  return (
    <>
      <PageHeading
        title="Coupons"
        description={data ? `${data.items.length} coupons` : undefined}
        action={<Button onClick={() => setOpen((v) => !v)}>{open ? 'Cancel' : 'New coupon'}</Button>}
      />

      {open && (
        <Card className="mb-6">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code">
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME5" className={`${inputClass} uppercase`} />
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })} className={selectClass}>
                <option value="percent">Percentage off</option>
                <option value="flat">Flat amount off</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </Field>
            {form.type !== 'free_shipping' && (
              <Field label={form.type === 'percent' ? 'Percentage' : 'Amount (₹)'}>
                <input required type="number" min={0} step="any" value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === 'percent' ? '5' : '2500'} className={inputClass} />
              </Field>
            )}
            <Field label="Minimum order (₹)" hint="Leave blank for no minimum">
              <input type="number" min={0} value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} className={inputClass} />
            </Field>
            {form.type === 'percent' && (
              <Field label="Maximum discount (₹)" hint="Caps a percentage coupon">
                <input type="number" min={0} value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className={inputClass} />
              </Field>
            )}
            <Field label="Total uses" hint="Blank for unlimited">
              <input type="number" min={1} value={form.usageLimitTotal}
                onChange={(e) => setForm({ ...form, usageLimitTotal: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Uses per customer" hint="Blank for unlimited">
              <input type="number" min={1} value={form.usageLimitPerUser}
                onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Expires">
              <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Description">
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="5% off your first table" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-content">
              <input type="checkbox" checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="size-4 rounded border-line-strong" />
              Show on the storefront, so shoppers can copy it
            </label>

            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" loading={busy}>Create coupon</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <p role="alert" className="mb-4 text-sm text-crimson">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-muted" /></div>
      ) : (
        <Table head={['Code', 'Discount', 'Minimum', 'Used', 'Expires', 'Status', 'Storefront', '']}>
          {data?.items.map((coupon) => (
            <tr key={coupon.id}>
              <td className="numeric px-4 py-3 font-medium text-content">{coupon.code}</td>
              <td className="px-4 py-3 text-muted">
                {describe(coupon)}
                {coupon.maxDiscount && <span className="block text-xs text-faint">max {formatINR(coupon.maxDiscount)}</span>}
              </td>
              <td className="numeric px-4 py-3 text-muted">{coupon.minOrderValue ? formatINR(coupon.minOrderValue) : '—'}</td>
              <td className="numeric px-4 py-3 text-muted">
                {coupon.timesUsed}{coupon.usageLimitTotal ? ` / ${coupon.usageLimitTotal}` : ''}
              </td>
              <td className="px-4 py-3 text-xs text-faint">{coupon.endsAt ? formatDate(coupon.endsAt) : 'No expiry'}</td>
              <td className="px-4 py-3">
                <Badge tone={coupon.isActive ? 'success' : 'neutral'}>{coupon.isActive ? 'Active' : 'Inactive'}</Badge>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  disabled={busy || !coupon.isActive}
                  onClick={() => void togglePublic(coupon)}
                  className="text-xs text-muted underline-offset-4 transition-colors hover:text-content hover:underline disabled:opacity-50"
                >
                  {coupon.isPublic ? 'Shown — hide' : 'Hidden — show'}
                </button>
              </td>
              <td className="px-4 py-3">
                {coupon.isActive && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void mutate('DELETE', `/api/admin/coupons/${coupon.id}`)}
                    className="text-xs text-muted transition-colors hover:text-crimson"
                  >
                    Deactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
