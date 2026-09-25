import type { NextConfig } from "next";

/**
 * Hosts that are allowed to be indexed. Everything else — the vercel.app
 * preview URL, deploy previews, branch URLs — is served with a noindex header.
 *
 * This exists because the canonical tags on every page point at
 * shouldifinance.com while a different site is still live there. Two crawlable
 * copies of the same content, one of them canonicalising to a domain that does
 * not yet serve it, is how a preview URL ends up in the index under paths that
 * stop existing at cutover.
 *
 * Written as a literal rather than imported from app/lib/calculators, which
 * pulls in the React component graph for the calculator icons — not something
 * to load into the build config.
 *
 * At cutover nothing here needs removing: once shouldifinance.com serves this
 * app, it matches the allow-list and is indexed normally.
 */
const INDEXABLE_HOST = "(www\\.)?shouldifinance\\.com";

const nextConfig: NextConfig = {
  /**
   * Values here are inlined into the bundle at build time, which is the point:
   * the footer's copyright year has to be the same string on the server and in
   * the browser. Calling new Date() in the component instead would render the
   * build year into the static HTML and the visitor's year on hydration, and
   * those differ for everyone who visits after 1 January.
   *
   * The site rebuilds weekly for the mortgage-rate banner, so this is never
   * more than a week stale.
   */
  env: {
    BUILD_YEAR: String(new Date().getFullYear()),
  },
  async headers() {
    return [
      {
        // Applies when the request host is NOT the production domain.
        source: "/:path*",
        missing: [{ type: "host", value: INDEXABLE_HOST }],
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
