import type { Metadata } from 'next';
import { WishlistView } from '@/components/product/wishlist-view';

export const metadata: Metadata = {
  title: 'Your wishlist',
  robots: { index: false },   // a private page: nothing for a search engine to list
};

export default function WishlistPage() {
  return <WishlistView />;
}
