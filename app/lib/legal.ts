/**
 * Shared constants for the legal pages.
 *
 * The date lives here rather than in the prose of three documents so that a
 * revision updates every page at once and they cannot drift apart. Bump it
 * whenever any of the three is edited in a way that changes its meaning.
 */
export const LEGAL_LAST_UPDATED = new Date("2026-09-23T00:00:00Z");

export const LEGAL_UPDATED_LABEL = LEGAL_LAST_UPDATED.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** ISO form for <time dateTime>, so the date is machine-readable too. */
export const LEGAL_UPDATED_ISO = LEGAL_LAST_UPDATED.toISOString().slice(0, 10);

/**
 * Governing law for the Terms. Confirm with counsel — this should be the
 * state the site owner actually operates from and is prepared to litigate in.
 */
export const GOVERNING_STATE = "Arizona";

/**
 * Contact address for privacy requests and legal notices.
 *
 * This has to be a mailbox somebody actually reads. CCPA and GDPR both put
 * clocks on responding to a request, and those clocks start when the message
 * arrives, not when it is noticed.
 */
export const LEGAL_CONTACT_EMAIL = "privacy@shouldifinance.com";
