export function OrphanWidget() {
  return (
    <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Orphan widget</p>
      <p className="mt-1 text-amber-800">
        Lives in components/orphan/ with no clear route owner — a shared-feature smell.
      </p>
    </aside>
  );
}
