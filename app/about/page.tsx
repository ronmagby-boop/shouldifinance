import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "../components/GuideShell";
import { CALCULATORS, SITE } from "../lib/calculators";
import { ADS_LIVE } from "../lib/ads";
import { GUIDES } from "../lib/guides";

const DESCRIPTION =
  "An independent educational project. The calculators show the numbers, including the ones that argue against the decision — there is nothing here to sell you.";

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/about` },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/about`,
    title: "About | ShouldIFinance",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "About | ShouldIFinance",
    description: DESCRIPTION,
  },
};

/**
 * Deliberately short, and deliberately free of absence claims.
 *
 * It says nothing about analytics, third-party scripts or what is never
 * collected. The privacy policy was narrowed for a reason — the site will carry
 * measurement and advertising — and an About page that re-asserts what was just
 * removed would put the two back into contradiction. The claim this page can
 * make, and the only one it makes, is the one that survives all of that: the
 * numbers are shown honestly and there is nothing being sold.
 *
 * The no-affiliation paragraph is load-bearing for the disclaimer's framing and
 * for ad-network review. Do not trim it.
 */
export default function About() {
  return (
    <GuideShell
      eyebrow="About"
      title="Numbers, not persuasion"
      intro="A set of free calculators and written guides for the money decisions that arrive with a deadline attached."
      back={{ href: "/", label: "Back to home" }}
    >
      <div className="text-sm text-gray-700 leading-relaxed space-y-8">
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">Why it exists</h2>
          <p>
            Most financial tools are built to sell something. The framing is chosen, the defaults
            flatter, and the figure that would give you pause is the one left off the page. That is
            not carelessness — it is the job those tools were built to do.
          </p>
          <p className="mt-3">
            This one has the opposite job. Every assumption is on screen and editable. Every rule is
            named and linked to where it comes from — the statute, the IRS publication, the
            regulation. And the {CALCULATORS.length} calculators are built to show you the answer
            when the answer is no: the refinance that never pays itself back, the lease that costs
            more, the years you spend owing more than the car is worth.
          </p>
          <p className="mt-3">
            The {GUIDES.length} guides do the same in prose — what a rule actually says, what it
            excludes, and where two readings are possible.{" "}
            {ADS_LIVE ? (
              <>
                The guides carry advertising, which is what pays for the site; it is bought by
                whoever buys it and is not a recommendation, and no calculator carries any. Nothing
                on the Site is sold by us, and no result is steered toward anyone.
              </>
            ) : (
              <>There is nothing here to buy and nobody to hand you to.</>
            )}{" "}
            The numbers are the product.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">No affiliation</h2>
          <p>
            ShouldIFinance is an independent personal project, built and maintained by one person
            who works in the mortgage industry. It is not operated by, for, or on behalf of any
            employer, and it speaks for none. It has no affiliation with any lender, broker or
            financial institution, and takes no referral fees.
          </p>
          <p className="mt-3">
            Nothing published here is a quote, a pre-approval or a commitment to lend. The{" "}
            <Link href="/disclaimer" className="text-green-700 underline">
              Disclaimer
            </Link>{" "}
            sets out the full position.
          </p>
        </section>
      </div>

      <div className="border-t border-gray-100 mt-12 pt-4 flex flex-wrap gap-x-4">
        {[
          { href: "/calculators", label: "All calculators" },
          { href: "/guides", label: "Guides" },
          { href: "/contact", label: "Contact" },
        ].map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="inline-flex items-center min-h-[44px] py-2 text-xs font-semibold text-green-700 hover:underline"
          >
            {p.label} →
          </Link>
        ))}
      </div>
    </GuideShell>
  );
}
