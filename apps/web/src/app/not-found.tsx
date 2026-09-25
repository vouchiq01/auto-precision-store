import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <div className="shell grid min-h-[70svh] place-items-center pt-28">
      <div className="max-w-lg text-center">
        <Eyebrow>404</Eyebrow>
        <h1 className="display-lg mt-4 text-content">Not here<span className="text-crimson">.</span></h1>
        <p className="lede mx-auto mt-6">
          That page does not exist. It may have been a product we no longer stock.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back to the store</ButtonLink>
          <ButtonLink href="/collections/electric-lifting" variant="secondary">See the range</ButtonLink>
        </div>
      </div>
    </div>
  );
}
