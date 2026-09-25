import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCmsPage } from '@/lib/queries';
import { Eyebrow } from '@/components/ui/primitives';

export const revalidate = 300;

export async function generateStaticParams() {
  return ['about', 'shipping', 'returns', 'warranty', 'faq', 'privacy', 'terms'].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPage(slug);
  if (!page) return { title: 'Page not found' };
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

/**
 * Renders the stored body.
 *
 * Deliberately NOT dangerouslySetInnerHTML: this content is editable from the
 * admin panel, and rendering it as raw HTML would turn any compromised admin
 * account into stored XSS against every visitor. Paragraphs and simple **bold**
 * cover what these policy pages actually need.
 */
function renderBody(body: string) {
  return body.split('\n\n').filter(Boolean).map((block, i) => {
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-lg leading-relaxed text-muted">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="font-medium text-content">{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>,
        )}
      </p>
    );
  });
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getCmsPage(slug);
  if (!page) notFound();

  return (
    <article className="shell pt-28 md:pt-36">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>Auto Precision</Eyebrow>
        <h1 className="display-lg mt-4 text-content">{page.title}<span className="text-crimson">.</span></h1>
        <div className="mt-10 space-y-6">{renderBody(page.body)}</div>
      </div>
    </article>
  );
}
