/**
 * The contact form's one piece of configuration.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ TO SWITCH THE FORM ON                                                  │
 * │   1. Create an access key at https://web3forms.com (verify the email   │
 * │      the submissions should land in).                                  │
 * │   2. Set NEXT_PUBLIC_WEB3FORMS_KEY to that key in Vercel.              │
 * │   3. Redeploy. It is read at build time and inlined, so a change needs │
 * │      a new build, the same as BUILD_YEAR.                              │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * With no key the form does not render at all and /contact keeps the email
 * address as its only route, with copy that matches. That is deliberate: a form
 * that appears to accept a message and quietly drops it is the exact failure
 * this site just removed from the homepage.
 *
 * NEXT_PUBLIC_ is correct here and is not a leak. Web3Forms' access key is
 * public by design — their FAQ calls it "an alias to your email, but one step
 * harder", and the worst an abuser can do with it is send mail to that address.
 * It is not a secret API key and there is nothing to protect by hiding it.
 */
export const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "";

/** Plain form POST. No library, no script tag, no cookie. */
export const FEEDBACK_ENDPOINT = "https://api.web3forms.com/submit";

export const FEEDBACK_ENABLED = Boolean(WEB3FORMS_KEY);

/**
 * The opt-in field, named once so the form, the privacy policy and the message
 * that arrives all use the same words.
 *
 * It is sent on every submission, "Yes" or "No", never omitted. An unticked
 * checkbox submits nothing at all in a normal form post, which would make a
 * declined opt-in and a broken field indistinguishable in the inbox — and the
 * one thing a consent record must never be is ambiguous.
 */
export const OPT_IN_FIELD = "Email opt-in";
export const OPT_IN_LABEL =
  "Email me occasionally about new calculators and guides";
