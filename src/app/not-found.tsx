import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold text-[var(--accent)]">Not found in this scenario</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">That synthetic record is not available.</h1>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-[var(--muted)]">
        EPFO One currently includes one synthetic member and one mock withdrawal journey.
      </p>
      <div className="mt-7">
        <LinkButton href="/">Return home</LinkButton>
      </div>
    </div>
  );
}
