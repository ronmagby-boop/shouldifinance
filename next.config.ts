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

/**
 * Redirects from the Wix site this one replaces.
 *
 * Built from the live Wix sitemap — 39 pages and 27 blog posts — and every
 * destination below was checked against the built output before being written
 * here. A redirect into a 404 is worse than no redirect: it spends the link's
 * value and still shows the reader nothing.
 *
 * WHAT IS DELIBERATELY ABSENT. Six old pages and all 27 blog posts have no
 * equivalent here and are left to 404:
 *
 *   /accessibility-statement   nothing corresponds
 *   /blank                     never a real page
 *   /blog                      the blog is not being carried over
 *   /copy-of-solar-roi         no solar calculator on this site
 *   /copy-of-solar-roi-calculator
 *   /copy-of-financed-solar-roi
 *   /post/*                    27 posts, none carried over
 *
 * Sending all of those to the home page would be the obvious move and the
 * wrong one: Google treats mass redirects to an unrelated page as soft 404s,
 * so it gains nothing and muddies what the home page is about. /blog is left
 * to 404 with the rest — redirecting a section index to /guides while all 27
 * posts beneath it die is half a solution, and the 404 page already points at
 * Guides.
 *
 * TWO SPELLINGS ARE PRESERVED ON PURPOSE. /car-deprecitation-estimator and
 * /early-withdrawel are misspelled, and are the URLs actually indexed. They
 * are the strings to match.
 *
 * `permanent: true` issues a 308, which preserves the request method and which
 * search engines treat as a 301 for the purposes of passing signals. These live
 * here rather than in the hosting dashboard so they ship and roll back with the
 * build, and so this file is the one place the mapping is written down.
 */
const WIX_REDIRECTS: { from: string; to: string }[] = [
  // -- mortgage ------------------------------------------------------------
  { from: "/mortgage-calculator", to: "/calculators/mortgage-payment" },
  { from: "/mortgage-payments", to: "/calculators/mortgage-payment" },
  { from: "/copy-of-mortgage-calculator", to: "/calculators/mortgage-payment" },
  { from: "/copy-of-mortgage-calculator-1", to: "/calculators/mortgage-payment" },
  { from: "/shouldirefinance", to: "/calculators/should-i-refinance" },
  { from: "/varecoup", to: "/calculators/va-recoup" },
  { from: "/should-i-prepay-mortgage", to: "/calculators/extra-payments" },
  { from: "/copy-of-prepay-mortgage", to: "/calculators/extra-payments" },
  { from: "/loanestimatecomparison", to: "/calculators/loan-estimate-comparison" },

  // -- investing and saving ------------------------------------------------
  { from: "/compound-interest", to: "/calculators/compound-interest" },
  { from: "/dividend-reinvestment", to: "/calculators/dividend-reinvestment" },
  { from: "/investmentgrowthcalculator", to: "/calculators/investment-growth" },
  { from: "/required-rate-of-return", to: "/calculators/required-rate-of-return" },
  { from: "/retirement-savings-calculator", to: "/calculators/retirement-savings" },
  { from: "/copy-of-retirement-savings-calculator", to: "/calculators/retirement-savings" },
  { from: "/dollarcostaveraging", to: "/calculators/dollar-cost-averaging" },
  { from: "/copy-of-dollar-cost-averaging-calculator", to: "/calculators/dollar-cost-averaging" },
  { from: "/effectiverate", to: "/calculators/effective-interest-rate" },
  { from: "/early-withdrawel", to: "/calculators/early-withdrawal" },

  // -- debt ----------------------------------------------------------------
  { from: "/pay-off-debt-calculator", to: "/calculators/pay-off-debt" },

  // -- auto ----------------------------------------------------------------
  { from: "/car-affordability", to: "/calculators/auto-affordability" },
  { from: "/car-deprecitation-estimator", to: "/calculators/depreciation" },
  { from: "/carleasing-calculator", to: "/calculators/lease-payment" },
  { from: "/lease-vs-buycar", to: "/calculators/lease-vs-buy" },
  { from: "/copy-of-buy-vs-leasing-car", to: "/calculators/lease-vs-buy" },
  { from: "/carloan-vs-cash", to: "/calculators/loan-vs-cash" },
  { from: "/auto-refinance", to: "/calculators/auto-loan-refinance" },
  { from: "/ev-vs-gas", to: "/calculators/ev-savings" },
  { from: "/true-cost-own", to: "/calculators/total-cost-of-ownership" },

  // -- category and legal pages --------------------------------------------
  { from: "/copy-of-real-estate-calculators", to: "/calculators#real-estate" },
  { from: "/investing-calculators", to: "/calculators#money" },
  { from: "/english-privacy-policy", to: "/privacy" },
];

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
  async redirects() {
    return WIX_REDIRECTS.map(({ from, to }) => ({
      source: from,
      destination: to,
      permanent: true,
    }));
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
