export function SharedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      {label}
    </span>
  );
}
