import { ADS_LIVE } from "./ads";

/**
 * Shared constants for the legal pages.
 *
 * The date lives here rather than in the prose of three documents so that a
 * revision updates every page at once and they cannot drift apart. Bump it
 * whenever any of the three is edited in a way that changes its meaning.
 */

/** The date the policy last changed with advertising still switched off. */
const LEGAL_BASE_UPDATED = new Date("2026-09-24T00:00:00Z");

/**
 * The date the advertising wording takes effect.
 *
 * Sections 4, 6, 7 and 11 of the privacy policy, and a sentence on the About
 * and Disclaimer pages, are written twice — once for a site without ads and
 * once for a site with them — and switch on ADS_LIVE. That means the policy
 * changes in the same deploy that starts serving ads, which is the point: the
 * old text describes a site that no longer exists the moment the flag flips.
 *
 * A changed policy whose date has not moved is worse than no date at all,
 * because the date is the thing a reader checks to know whether a paragraph
 * can still be relied on — section 7 says so in as many words. So this is a
 * required input rather than something derived: set NEXT_PUBLIC_LEGAL_ADS_UPDATED
 * to the cutover date (YYYY-MM-DD) alongside the advertising variables, and the
 * build refuses to produce a site that serves ads without it.
 */
const ADS_UPDATED_RAW = process.env.NEXT_PUBLIC_LEGAL_ADS_UPDATED ?? "";

function adsUpdatedDate(): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ADS_UPDATED_RAW)) {
    throw new Error(
      "Advertising is switched on (see lib/ads.ts) but NEXT_PUBLIC_LEGAL_ADS_UPDATED " +
        "is missing or not YYYY-MM-DD. The privacy policy changes in this deploy and its " +
        "date has to change with it. Set it to the cutover date and rebuild.",
    );
  }
  const d = new Date(`${ADS_UPDATED_RAW}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`NEXT_PUBLIC_LEGAL_ADS_UPDATED is not a real date: ${ADS_UPDATED_RAW}`);
  }
  if (d < LEGAL_BASE_UPDATED) {
    throw new Error(
      `NEXT_PUBLIC_LEGAL_ADS_UPDATED (${ADS_UPDATED_RAW}) is before the previous revision ` +
        `(${LEGAL_BASE_UPDATED.toISOString().slice(0, 10)}). A policy cannot be revised backwards.`,
    );
  }
  // A "last updated" date in the future is a claim about a document that does
  // not exist yet. The guide checker rejects future review dates for the same
  // reason; this is the same rule applied to the legal pages.
  if (d.getTime() > Date.now() + 86_400_000) {
    throw new Error(
      `NEXT_PUBLIC_LEGAL_ADS_UPDATED (${ADS_UPDATED_RAW}) is in the future. ` +
        "Set it to the day the build actually ships.",
    );
  }
  return d;
}

export const LEGAL_LAST_UPDATED = ADS_LIVE ? adsUpdatedDate() : LEGAL_BASE_UPDATED;

export const LEGAL_UPDATED_LABEL = LEGAL_LAST_UPDATED.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** ISO form for <time dateTime>, so the date is machine-readable too. */
export const LEGAL_UPDATED_ISO = LEGAL_LAST_UPDATED.toISOString().slice(0, 10);

/** Governing law and venue for the Terms. */
export const GOVERNING_STATE = "Arizona";

/**
 * Contact address for privacy requests and legal notices.
 *
 * This has to be a mailbox somebody actually reads. CCPA and GDPR both put
 * clocks on responding to a request, and those clocks start when the message
 * arrives, not when it is noticed.
 */
export const LEGAL_CONTACT_EMAIL = "shouldifinance@gmail.com";

/**
 * Social profiles, linked from the footer on every page.
 *
 * Here rather than in the footer component for the same reason the contact
 * address is: these are identity, they appear in more than one place over
 * time, and a dead link in a footer is the kind of thing nobody notices.
 * Both were confirmed to resolve (HTTP 200) when they were added.
 */
export const SOCIAL_INSTAGRAM = "https://www.instagram.com/shouldifinance/";
export const SOCIAL_LINKEDIN = "https://www.linkedin.com/company/shouldifinance-com/";
