import Link from 'next/link';
import { STORE } from '@aps/shared';
import { Logo } from './logo';

const COLUMNS = [
  {
    title: 'Tables',
    links: [
      { href: '/collections/electric-lifting', label: 'Electric lifting' },
      { href: '/collections/hydraulic', label: 'Hydraulic' },
      { href: '/collections/round-rotating', label: 'Round & rotating' },
      { href: '/collections/portable', label: 'Portable' },
      { href: '/collections/foldable', label: 'Foldable' },
      { href: '/collections/accessories', label: 'Accessories' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/pages/shipping', label: 'Shipping & delivery' },
      { href: '/pages/returns', label: 'Returns & refunds' },
      { href: '/pages/warranty', label: 'Warranty' },
      { href: '/pages/faq', label: 'FAQ' },
      { href: '/enquiry', label: 'Bulk & dealer enquiry' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/pages/about', label: 'About' },
      { href: '/pages/terms', label: 'Terms of service' },
      { href: '/pages/privacy', label: 'Privacy policy' },
      { href: '/account', label: 'Your account' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="on-ink mt-32">
      <div className="shell py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="text-on-ink" aria-label="Auto Precision — home">
              <Logo />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-on-ink-muted">
              We build grooming tables in Bengaluru for people who stand at them all day.
            </p>
            <div className="mt-6 space-y-1 text-sm text-on-ink-muted">
              <p>
                <a href={`mailto:${STORE.supportEmail}`} className="transition-colors hover:text-on-ink">
                  {STORE.supportEmail}
                </a>
              </p>
              <p>
                <a href={`tel:${STORE.supportPhone.replace(/\s/g, '')}`} className="transition-colors hover:text-on-ink">
                  {STORE.supportPhone}
                </a>
              </p>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow mb-5">{column.title}</h2>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-on-ink-muted transition-colors hover:text-on-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="rule mt-14 flex flex-col gap-3 pt-7 text-xs text-on-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {STORE.legalName}. All prices in ₹ and inclusive of GST.</p>
          <p>Made in Bengaluru · GST registered in {STORE.sellerState}</p>
        </div>
      </div>
    </footer>
  );
}
