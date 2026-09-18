import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        Colocation demo
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Dev-only page audit tooling highlights where components live relative to the route
        that renders them. Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">Alt+Shift+C</kbd>{' '}
        or click the Colocation widget (bottom-left).
      </p>
      <nav className="mt-10 flex flex-col gap-3 text-lg">
        <Link href="/shop" className="text-blue-600 hover:underline">
          Shop — colocated ShopCard
        </Link>
        <Link href="/blog" className="text-blue-600 hover:underline">
          Blog — cross-route ShopCard + orphan widget
        </Link>
      </nav>
    </main>
  );
}
