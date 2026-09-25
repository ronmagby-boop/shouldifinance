import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuideShell, { CalculatorCta } from "../../components/GuideShell";
import Markdown from "../../components/Markdown";
import GuideCalculatorLinks from "../../components/GuideCalculatorLinks";
import AdUnit from "../../components/AdUnit";
import { SITE, OG_IMAGE } from "../../lib/calculators";
import { calculatorForGuide, formatReviewed, GUIDES, guideBySlug } from "../../lib/guides";

/** Every guide is known at build time; anything else is a 404, not a render. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};

  const url = `${SITE}/guides/${guide.slug}`;
  const calc = calculatorForGuide(guide);
  return {
    title: guide.title,
    description: guide.description,
    keywords: calc?.keywords,
    alternates: { canonical: url },
    openGraph: {
    images: [OG_IMAGE],
      title: `${guide.title} | ShouldIFinance`,
      description: guide.description,
      url,
      siteName: "ShouldIFinance",
      type: "article",
    },
    twitter: {
    images: [OG_IMAGE.url],
      card: "summary_large_image",
      title: `${guide.title} | ShouldIFinance`,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const calc = calculatorForGuide(guide);

  return (
    <GuideShell
      eyebrow={`${guide.category} guide`}
      title={guide.title}
      intro={guide.description}
      back={{ href: "/guides", label: "All guides" }}
      meta={
        <>
          Last reviewed{" "}
          <time dateTime={guide.reviewed} className="font-semibold">
            {formatReviewed(guide.reviewed)}
          </time>
        </>
      }
    >
      {/* Wraps both the prose and the closing card so one delegated listener
          counts every link into a calculator, tagged by which of the two it
          came from. display:contents — it adds no box. */}
      <GuideCalculatorLinks guide={guide.slug}>
        <Markdown body={guide.body} slot={<AdUnit placement="guideInArticle" />} />

        {/* The closing call to action, for a guide that pairs with a calculator.
            The body carries its own link earlier, so a reader who stops halfway
            has already been offered it. An unpaired guide simply ends. */}
        {calc && (
          <div className="mt-8" data-x-guide-cta>
            <CalculatorCta href={`/calculators/${calc.slug}`} title={calc.title} desc={calc.desc} />
          </div>
        )}
      </GuideCalculatorLinks>

      {/* After the closing card, so the last thing a finished reader is offered
          is still the calculator rather than an ad. */}
      <AdUnit placement="guideEnd" />

      <div className="border-t border-gray-100 mt-10 pt-4">
        <Link
          href="/guides"
          className="inline-flex items-center min-h-[44px] py-2 text-xs font-semibold text-green-700 hover:underline"
        >
          ← All guides
        </Link>
      </div>
    </GuideShell>
  );
}
