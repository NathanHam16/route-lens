import Link from 'next/link';

import { ShopCard } from '@/app/shop/_components/ShopCard';
import { OrphanWidget } from '@/components/orphan/OrphanWidget';
import { SharedBadge } from '@/components/shared/SharedBadge';

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Home
      </Link>
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <SharedBadge label="Demo" />
      </div>
      <p className="mt-2 text-gray-600">
        This page imports ShopCard from the shop route (cross-route) and OrphanWidget
        (shared-feature).
      </p>
      <div className="mt-8 space-y-6">
        <OrphanWidget />
        <ShopCard name="Featured product" price="$24" />
      </div>
    </main>
  );
}
