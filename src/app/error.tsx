"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold text-[var(--danger)]">The synthetic scenario could not load</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Let&apos;s try that screen again.</h1>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-[var(--muted)]">
        No real account or claim was affected. This prototype stores only temporary synthetic data.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-[var(--accent-fill)] px-5 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
