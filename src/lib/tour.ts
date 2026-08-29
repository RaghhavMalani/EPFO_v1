/**
 * Walkthrough cookie.
 *
 * Holds only how far the judge has clicked. Everything else about where the tour is
 * comes from scenario state, so this staying small is the point — a stale or edited
 * value can move the rail forward or back one beat and cannot misrepresent the data.
 */

export const TOUR_COOKIE = "epfo-one-tour";
export const TOUR_MAX_AGE_SECONDS = 60 * 60 * 4;

export function parseAcknowledgedIndex(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
