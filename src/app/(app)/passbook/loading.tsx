export default function PassbookLoading() {
  return (
    <div className="page-shell" aria-busy="true" aria-label="Loading passbook">
      <div className="h-9 w-40 animate-pulse rounded-md bg-[var(--surface-muted)]" />
      <div className="mt-4 h-16 max-w-md animate-pulse rounded-xl bg-[var(--surface-muted)]" />
      <div className="mt-10 h-36 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.75fr_0.62fr]">
        <div className="h-96 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
        <div className="h-96 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
