import { ORDER_STATUS_LABELS, type OrderStatus } from '@aps/shared';
import { cn } from '@/lib/cn';

/**
 * Where an order is, as four dots: placed → packed → shipped → delivered.
 *
 * The status badge says the word; this says how far along that is, which is
 * what someone waiting on a ₹1,12,400 crate actually wants to see at a glance.
 * "Confirmed" folds into the first stage — to the buyer it is the same moment
 * as "we have your order". Cancelled, refunded and unpaid orders are not on the
 * delivery path at all, so they get a plain note instead of a half-lit track.
 */
const STAGES = ['Order placed', 'Packed', 'Shipped', 'Delivered'] as const;

function stageIndex(status: OrderStatus): number {
  switch (status) {
    case 'paid':
    case 'confirmed': return 0;
    case 'packed': return 1;
    case 'shipped': return 2;
    case 'delivered': return 3;
    default: return -1;
  }
}

export function OrderProgress({ status, className }: { status: OrderStatus; className?: string }) {
  if (status === 'cancelled' || status === 'refunded') {
    return (
      <p className={cn('rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning', className)}>
        {ORDER_STATUS_LABELS[status]}
      </p>
    );
  }
  if (status === 'pending_payment') {
    return (
      <p className={cn('rounded-lg bg-sand px-3 py-2 text-xs text-muted', className)}>
        Awaiting payment — your order is saved and the stock is held.
      </p>
    );
  }

  const current = stageIndex(status);

  return (
    <ol className={cn('flex items-start', className)} aria-label="Order progress">
      {STAGES.map((label, i) => {
        const done = i <= current;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={i === current ? 'step' : undefined}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn('absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2', i <= current ? 'bg-success' : 'bg-line')}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 grid size-6 place-items-center rounded-full text-[0.6875rem] font-semibold',
                done ? 'bg-success text-white' : 'bg-sand text-faint ring-1 ring-line',
              )}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={cn('text-[0.6875rem] leading-tight', done ? 'font-medium text-content' : 'text-faint')}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
