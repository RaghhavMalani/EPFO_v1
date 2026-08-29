export default function EmployerHomeLoading() {
  return (
    <div className="page-shell employer-page" aria-busy="true" aria-label="Loading employer overview">
      <div className="h-9 w-64 animate-pulse rounded-md bg-[var(--surface-muted)]" />
      <div className="mt-3 h-5 max-w-lg animate-pulse rounded-md bg-[var(--surface-muted)]" />
      <div className="mt-8 h-24 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      <div className="mt-6 grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div className="h-44 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
        <div className="h-44 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </div>
      <div className="mt-8 h-56 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
    </div>
  );
}
