/**
 * Advertising configuration — off by default.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ NOTHING SERVES UNTIL THREE THINGS ARE TRUE.                          │
 * │                                                                      │
 * │   1. NEXT_PUBLIC_ADS_ENABLED is exactly "true"                       │
 * │   2. NEXT_PUBLIC_ADSENSE_CLIENT holds the ca-pub-… publisher id      │
 * │   3. the individual slot id for that placement is set                │
 * │                                                                      │
 * │ Any one missing and the unit renders nothing and the loader script   │
 * │ is never added to the page. That is deliberate: the domain has not   │
 * │ cut over yet, and an ad request from a preview URL or from localhost │
 * │ is invalid traffic against a live AdSense account.                   │
 * │                                                                      │
 * │ These are NEXT_PUBLIC_ variables, so they are read at BUILD time and │
 * │ baked into the output. Changing one in the Vercel dashboard does     │
 * │ nothing until the next deploy.                                       │
 * │                                                                      │
 * │ Before switching this on, note that sections 6 and 7 of the privacy  │
 * │ policy currently say advertising is not in use and that no consent   │
 * │ mechanism is needed. Both stop being true the moment ads serve, and  │
 * │ EEA/UK traffic additionally requires a Google-certified CMP.         │
 * └──────────────────────────────────────────────────────────────────────┘
 */

/** The master switch. Compared against the literal string, so a stray value is off. */
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

/** The AdSense publisher id, e.g. "ca-pub-0000000000000000". */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

/**
 * One slot id per placement. Each is created in the AdSense dashboard; an
 * empty one disables just that placement, which is how a single unit can be
 * trialled without turning on the rest.
 */
export const AD_SLOTS = {
  /** Inside a guide, before its third heading. */
  guideInArticle: process.env.NEXT_PUBLIC_AD_SLOT_GUIDE_INARTICLE ?? "",
  /** After a guide's closing calculator card. */
  guideEnd: process.env.NEXT_PUBLIC_AD_SLOT_GUIDE_END ?? "",
  /** On a calculator, below the results and export bar, above related. */
  calculatorBelowResults: process.env.NEXT_PUBLIC_AD_SLOT_CALC_BELOW ?? "",
  /** On the rates page, below the table and above the footer. */
  ratesBelow: process.env.NEXT_PUBLIC_AD_SLOT_RATES_BELOW ?? "",
} as const;

export type AdPlacement = keyof typeof AD_SLOTS;

/**
 * Reserved height in CSS pixels, per placement.
 *
 * The box is reserved at this exact height before anything loads and the unit
 * is not allowed to change it, which is what keeps Cumulative Layout Shift at
 * zero. It is the reason these are fixed-size units rather than the responsive
 * `auto` format: a responsive unit decides its own height after the ad request
 * returns, and any difference between that and the reserved space is a shift.
 *
 * 280px is the common large-mobile-banner-through-medium-rectangle band, so a
 * fixed box of this height fits the sizes AdSense fills most often without
 * cropping a creative.
 */
export const AD_HEIGHT: Record<AdPlacement, number> = {
  guideInArticle: 280,
  guideEnd: 280,
  calculatorBelowResults: 280,
  ratesBelow: 280,
};

/** True when a given placement is fully configured and may render. */
export function adEnabled(placement: AdPlacement): boolean {
  return ADS_ENABLED && Boolean(ADSENSE_CLIENT) && Boolean(AD_SLOTS[placement]);
}

/** True when any placement could render, i.e. the loader script is needed. */
export const ADS_LIVE =
  ADS_ENABLED && Boolean(ADSENSE_CLIENT) && Object.values(AD_SLOTS).some(Boolean);
