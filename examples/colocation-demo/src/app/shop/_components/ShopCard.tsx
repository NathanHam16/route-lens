import { SharedBadge } from '@/components/shared/SharedBadge';

export function ShopCard({ name, price }: { name: string; price: string }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
        <SharedBadge label="In stock" />
      </div>
      <p className="text-sm text-gray-600">{price}</p>
    </article>
  );
}
