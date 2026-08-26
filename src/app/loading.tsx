export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading page">
      <div className="h-4 w-28 animate-pulse rounded-md bg-[var(--surface-muted)]" />
      <div className="mt-5 h-12 max-w-xl animate-pulse rounded-xl bg-[var(--surface-muted)]" />
      <div className="mt-4 h-6 max-w-2xl animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="h-52 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
        <div className="h-52 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
