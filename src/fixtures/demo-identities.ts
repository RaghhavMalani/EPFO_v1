/**
 * The one place the two demo identities are spelled out.
 *
 * Every surface that names the member or the employer — the sign-in cards, the
 * synthetic scenario the whole app reads from, and the authenticated masthead —
 * resolves back to these constants, so a judge never sees the same identity
 * described two different ways on two different screens.
 *
 * Sign-in identifiers are shown unmasked because they are the credential the
 * demo asks you to type; everywhere inside the product the masked form is used,
 * matching how a real portal would display an identifier after authentication.
 */

export const MEMBER_IDENTITY = {
  name: "Aarav Sharma",
  signInLabel: "UAN",
  signInId: "100200304821",
  uanMasked: "DEMO-XXXX-4821",
} as const;

export const EMPLOYER_IDENTITY = {
  name: "Demo Systems Pvt Ltd",
  signInLabel: "Establishment ID",
  signInId: "DL-DEM-2712",
  establishmentIdMasked: "DL/DEM/•••••/2712",
  pfOffice: "Delhi Central · Simulation",
} as const;
