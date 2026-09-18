import Link from 'next/link';

import { ShopCard } from './_components/ShopCard';

export default function ShopPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">Shop</h1>
      <p className="mt-2 text-gray-600">
        ShopCard is colocated under <code className="text-sm">app/shop/_components/</code>.
      </p>
      <div className="mt-8 grid gap-4">
        <ShopCard name="Notebook" price="$12" />
        <ShopCard name="Pen set" price="$8" />
      </div>
    </main>
  );
}
