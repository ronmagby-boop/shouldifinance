import fs from "node:fs";
import path from "node:path";
import { bySlug, CALCULATORS, GUIDED, sectionsOf, type CalcSection, type Category } from "./calculators";
import { resolveTokens } from "./guide-tokens";

/**
 * Guides are evergreen reference articles, one per calculator, read from
 * markdown in content/guides at build time. No CMS, no database, nothing
 * fetched at runtime — the files are parsed once during the build and the
 * pages are prerendered.
 *
 * This module touches the filesystem, so it can only be imported from server
 * components. The calculator pages and the homepage are client components; the
 * half of the pairing they need lives on the registry entry instead, and is
 * checked against these files below.
 */
export type Guide = {
  slug: string;
  title: string;
  description: string;
  /**
   * Optional search-result title and meta description (frontmatter seo_title,
   * seo_description). The title is the page's h1 and the description its
   * visible intro, so these let a guide tune what a search result shows
   * without rewording the page. Only the page metadata uses them; the h1,
   * intro, guide index and structured data keep title and description.
   */
  seoTitle?: string;
  seoDescription?: string;
  /**
   * Slug of the calculator this guide explains, when it explains one.
   *
   * Optional. Guides is the site's only content section, so a piece that does
   * not belong to a calculator still belongs here. A guide that DOES declare a
   * pairing is checked in both directions and fails the build on a mismatch —
   * the looser requirement is on whether to pair, not on pairing correctly.
   */
  calculator?: string;
  category: Category;
  /** ISO date the guide first went up. */
  published: string;
  /** ISO date the content was last checked against its sources. */
  reviewed: string;
  body: string;
};

const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

/**
 * Frontmatter parser for the subset the guides use: `key: value` lines, with
 * values optionally wrapped in single or double quotes so a title can contain
 * a colon. Deliberately not a full YAML implementation, and deliberately not a
 * dependency — guides are written by hand, in this repo, against a documented
 * format, and the site ships four runtime packages.
 */
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error("Guide is missing its frontmatter block");

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const at = line.indexOf(":");
    if (at === -1) throw new Error(`Bad frontmatter line: ${line}`);
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: match[2] };
}

const REQUIRED = ["title", "slug", "description", "category", "published", "reviewed"] as const;

/** A guide is filed under one of these whether or not it pairs with a calculator. */
const CATEGORIES: Category[] = ["Home", "Debt", "Money", "Auto"];

function readGuides(): Guide[] {
  if (!fs.existsSync(GUIDES_DIR)) return [];

  const guides = fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(GUIDES_DIR, file), "utf8");
      const { data, body } = parseFrontmatter(raw);

      for (const key of REQUIRED) {
        if (!data[key]) throw new Error(`content/guides/${file} is missing "${key}"`);
      }

      if (!CATEGORIES.includes(data.category as Category)) {
        throw new Error(
          `content/guides/${file} has category "${data.category}" — expected one of ` +
            CATEGORIES.join(", "),
        );
      }

      /* Pairing is optional, but a declared pairing is checked hard. */
      if (data.calculator) {
        const calc = bySlug(data.calculator);
        if (!calc) {
          throw new Error(
            `content/guides/${file} pairs with "${data.calculator}", which is not a calculator slug`,
          );
        }
        /* The registry names the guide and the guide names the calculator.
         * Both halves have to agree or the build stops here — that is what
         * keeps the two sides from drifting once there are forty of these. */
        if (calc.guide?.slug !== data.slug) {
          throw new Error(
            `content/guides/${file} says it explains "${data.calculator}", but that ` +
              `calculator's registry entry points at ` +
              `${calc.guide ? `"${calc.guide.slug}"` : "no guide"}. Update app/lib/calculators.ts.`,
          );
        }
        /* A paired guide filed under a different heading from its own
         * calculator would split the /guides index away from /calculators. */
        if (data.category !== calc.category) {
          throw new Error(
            `content/guides/${file} is filed under "${data.category}" but ` +
              `${calc.slug} is a "${calc.category}" calculator`,
          );
        }
      }
      const reviewed = Date.parse(data.reviewed);
      if (Number.isNaN(reviewed)) {
        throw new Error(`content/guides/${file} has an unparseable reviewed date`);
      }
      /* "Last reviewed" is a claim about the past. A date in the future is
       * always a typo, and it is the kind that reads as backdating. */
      if (reviewed > Date.now()) {
        throw new Error(
          `content/guides/${file} is reviewed ${data.reviewed}, which is in the future`,
        );
      }
      const published = Date.parse(data.published);
      if (Number.isNaN(published)) {
        throw new Error(`content/guides/${file} has an unparseable published date`);
      }
      if (published > Date.now()) {
        throw new Error(
          `content/guides/${file} is published ${data.published}, which is in the future`,
        );
      }
      /* A guide cannot have been reviewed before it existed. The two dates are
       * equal on every guide written before the field was added, which is the
       * boundary case this allows rather than rejects. */
      if (published > reviewed) {
        throw new Error(
          `content/guides/${file} is published ${data.published} but reviewed ` +
            `${data.reviewed} — a guide cannot be reviewed before it was published`,
        );
      }

      return {
        slug: data.slug,
        title: data.title,
        description: data.description,
        seoTitle: data.seo_title || undefined,
        seoDescription: data.seo_description || undefined,
        calculator: data.calculator || undefined,
        category: data.category as Category,
        published: data.published,
        reviewed: data.reviewed,
        /* Figures that move with the tax year are written as {{TOKEN}} and
         * resolved from the same constants the calculators read, so a guide
         * cannot quote a number its calculator has stopped using. */
        body: resolveTokens(body.trim(), file),
      };
    });

  const seen = new Set<string>();
  for (const g of guides) {
    if (seen.has(g.slug)) throw new Error(`Duplicate guide slug: ${g.slug}`);
    seen.add(g.slug);
  }

  // The other direction: a registry entry promising a guide that was never
  // written would render a link straight to a 404.
  for (const c of GUIDED) {
    if (!guides.some((g) => g.slug === c.guide!.slug)) {
      throw new Error(
        `${c.slug} points at guide "${c.guide!.slug}", but content/guides/ has no such guide`,
      );
    }
  }

  return guides.sort((a, b) => a.title.localeCompare(b.title));
}

export const GUIDES: Guide[] = readGuides();

export const guideBySlug = (slug: string): Guide | undefined =>
  GUIDES.find((g) => g.slug === slug);

/**
 * A category's guides grouped by the CALC_SECTIONS section of the calculator
 * each one explains, in the same order as the calculators. A guide with no
 * calculator in this category (none today) goes in a trailing untitled group.
 */
export function guideSectionsOf(category: Category): { section: CalcSection; guides: Guide[] }[] {
  const inCategory = GUIDES.filter((g) => g.category === category);
  const placed = new Set<string>();
  const groups = sectionsOf(category).map(({ section, calcs }) => {
    const guides = calcs
      .map((c) => inCategory.find((g) => g.calculator === c.slug))
      .filter((g): g is Guide => Boolean(g));
    guides.forEach((g) => placed.add(g.slug));
    return { section, guides };
  });
  const rest = inCategory.filter((g) => !placed.has(g.slug));
  if (rest.length) groups.push({ section: { id: `${category.toLowerCase()}-other-guides`, title: null, short: null, slugs: [] }, guides: rest });
  return groups.filter((g) => g.guides.length > 0);
}

/** A category's guides, in the order of guideSectionsOf. */
export const guidesByCategory = (category: Category): Guide[] => guideSectionsOf(category).flatMap((g) => g.guides);

/** The section a guide sits in, with its sibling guides in order. */
export function guideSectionOf(guide: Guide): { section: CalcSection; guides: Guide[] } | undefined {
  return guideSectionsOf(guide.category).find((g) => g.guides.some((x) => x.slug === guide.slug));
}

/** Categories that actually have guides, in the registry's own order. */
export const GUIDE_CATEGORIES: Category[] = ["Home", "Debt", "Money", "Auto"].filter((c) =>
  GUIDES.some((g) => g.category === c),
) as Category[];

/**
 * The calculator a guide explains, or undefined for an unpaired guide.
 *
 * When a slug IS declared, readGuides has already proved it resolves, so a
 * miss here can only mean the guide is unpaired.
 */
export const calculatorForGuide = (guide: Guide) =>
  guide.calculator ? CALCULATORS.find((c) => c.slug === guide.calculator) : undefined;

export const formatReviewed = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
