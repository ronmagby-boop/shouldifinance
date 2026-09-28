import { bySlug, CATEGORY_SECTIONS, OG_IMAGE, SITE, type Calc } from "./calculators";
import { SOCIAL_INSTAGRAM, SOCIAL_LINKEDIN } from "./legal";
import type { Guide } from "./guides";

/**
 * JSON-LD builders. Pure functions returning plain objects — no JSX, no React,
 * no DOM. components/JsonLd.tsx is the only thing that renders them.
 *
 * EVERY VALUE IS DERIVED. Nothing here restates a title, a date, a category or
 * a URL that already exists in lib/calculators.ts, lib/legal.ts or a guide's
 * frontmatter. A rename in the registry moves the structured data with it, the
 * same way it already moves the metadata and the breadcrumb.
 *
 * Absolute URLs throughout, on SITE. A crawler reads this with no page context,
 * so a relative path is simply dropped — the same reason OG_IMAGE.url is
 * absolute.
 */

/**
 * Stable node ids, so the Organization is described once in the root layout and
 * referenced by `@id` everywhere else rather than repeated on all 97 pages.
 * Consumers merge every ld+json block in a document before resolving these, and
 * the layout renders on every page, so the reference always resolves.
 */
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;

const orgRef = { "@id": ORG_ID };

/** Sitewide: who publishes this, and what the site is. Root layout only. */
export function siteSchema() {
  return [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "ShouldIFinance",
      url: SITE,
      /**
       * Deliberately Organization and not EducationalOrganization. That subtype
       * denotes an institution that teaches — a school, college or university.
       * This is a publisher of calculators and reference articles, which is a
       * different thing, and claiming the subtype would assert an entity type
       * the site does not have.
       */
      description:
        "Free financial calculators and written guides for mortgages, debt, investing and cars.",
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/logo.png`,
        width: 236,
        height: 150,
      },
      sameAs: [SOCIAL_INSTAGRAM, SOCIAL_LINKEDIN],
    },
    {
      "@type": "WebSite",
      "@id": SITE_ID,
      name: "ShouldIFinance",
      url: SITE,
      publisher: orgRef,
      inLanguage: "en-US",
      /**
       * No potentialAction/SearchAction. A sitelinks searchbox needs a server
       * route that takes a query string; this site's search filters the
       * registry in the browser and has no /search URL to hand a crawler.
       */
    },
  ];
}

/** Home › Category › Page, matching the trail CalcShell actually renders. */
function calculatorCrumbs(calc: Calc) {
  const section = CATEGORY_SECTIONS.find((s) => s.category === calc.category);
  return breadcrumbs([
    { name: "Home", url: SITE },
    { name: calc.category, url: `${SITE}/calculators#${section?.id ?? ""}` },
    { name: calc.nav, url: `${SITE}/calculators/${calc.slug}` },
  ]);
}

/**
 * Home › Guides › Title.
 *
 * Note this is one level flatter than the calculators, and that GuideShell
 * renders a single "← All guides" link rather than a visible trail. The path is
 * still exactly what the URL and that link express, so the markup is truthful;
 * it is recorded here because structured data is meant to mirror what a reader
 * can see, and this is the one place on the site where it goes slightly beyond.
 */
function guideCrumbs(guide: Guide) {
  return breadcrumbs([
    { name: "Home", url: SITE },
    { name: "Guides", url: `${SITE}/guides` },
    { name: guide.title, url: `${SITE}/guides/${guide.slug}` },
  ]);
}

function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** A calculator: a free browser tool, plus its breadcrumb trail. */
export function calculatorSchema(slug: string) {
  const calc = bySlug(slug);
  if (!calc) return [];
  const url = `${SITE}/calculators/${slug}`;

  return [
    {
      /**
       * WebApplication rather than SoftwareApplication: these run in the page,
       * with nothing to install. It is a subtype, so a consumer that only knows
       * the parent still understands it.
       *
       * This will not produce a Google rich result and is not expected to.
       * Google's Software App feature requires an aggregateRating or a review
       * alongside name and offers.price, and the site has neither — inventing
       * ratings for its own tools is not on the table. The markup is here
       * because it is true and because consumers other than Google's rich
       * results read it.
       */
      "@type": "WebApplication",
      name: calc.title,
      url,
      description: calc.desc,
      applicationCategory: "FinanceApplication",
      /** Runs in a browser; there is no platform requirement to state. */
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      publisher: orgRef,
      isPartOf: { "@id": SITE_ID },
      inLanguage: "en-US",
    },
    calculatorCrumbs(calc),
  ];
}

/** A guide: a reference article, plus its breadcrumb trail. */
export function guideSchema(guide: Guide) {
  const url = `${SITE}/guides/${guide.slug}`;

  return [
    {
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      /**
       * dateModified only, and no datePublished — the frontmatter carries one
       * date, `reviewed`, which is when the content was last checked against
       * its sources. There is no publication date anywhere in the data: git
       * added all 43 guides in a single commit, and for most of them `reviewed`
       * predates even that. Emitting it as datePublished would assert a fact
       * the site does not hold. Adding a `published:` frontmatter field, which
       * lib/guides.ts could validate the way it already validates `reviewed`,
       * is the clean way to gain one.
       */
      dateModified: guide.reviewed,
      /**
       * The site, not a person. No guide carries a byline, and inventing an
       * author would be a claim nothing supports. Google's Article guidance
       * accepts an Organization here.
       */
      author: orgRef,
      publisher: orgRef,
      image: [OG_IMAGE.url],
      articleSection: guide.category,
      isPartOf: { "@id": SITE_ID },
      inLanguage: "en-US",
    },
    guideCrumbs(guide),
  ];
}
