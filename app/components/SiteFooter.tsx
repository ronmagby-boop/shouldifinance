import Image from "next/image";
import Link from "next/link";
import { CATEGORY_SECTIONS } from "../lib/calculators";
import { COPYRIGHT_YEAR, SOCIAL_INSTAGRAM, SOCIAL_LINKEDIN } from "../lib/legal";

/**
 * The site's only footer.
 *
 * It is "only" for a reason. There were three, plus an absence:
 *
 *   - the home page had the full version, with the category columns and the
 *     social row;
 *   - /calculators had a cut-down copy whose category links were bare "#id"
 *     fragments, so they worked on that page and nowhere else;
 *   - guides and the legal pages shared a third, shorter copy;
 *   - and all 43 CALCULATOR pages had no footer at all, because CalcShell
 *     never rendered one.
 *
 * Those are the same divergences hand-written copies always produce, which is
 * why the fix was to delete the copies rather than to reconcile them. Every
 * page now renders this and gets the same links: add one here and it appears
 * everywhere, which is precisely what the previous arrangement could not do.
 *
 * Category links are absolute (/calculators#id) rather than fragment-only, so
 * they work from a guide or a legal page as well as from the index.
 */

const TOOLS = [
  { href: "/calculators", label: "All calculators" },
  { href: "/rates", label: "Current rates" },
  ...CATEGORY_SECTIONS.map((s) => ({ href: `/calculators#${s.id}`, label: s.category })),
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

const LEGAL_ROW = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/disclaimer", label: "Disclaimer" },
];

/**
 * Social links.
 *
 * 44px square — the icons read smaller, but the touch target is the anchor and
 * it has to clear the same bar every other control on the site does. They were
 * 36px when this lived on the home page.
 */
const SOCIAL = [
  { href: SOCIAL_LINKEDIN, label: "in", title: "ShouldIFinance on LinkedIn" },
  { href: SOCIAL_INSTAGRAM, label: "ig", title: "ShouldIFinance on Instagram" },
];

/**
 * Footer links are 44px tall, not 16px.
 *
 * inline-flex + min-h-11 makes the ANCHOR the target rather than just the
 * glyphs, so the whole row is tappable. The old 16px came from the home page,
 * where the footer was one block among many; it is now on all 96 pages
 * including 43 calculators that had no footer at all, and a column of 16px
 * targets 2px apart is the hardest thing on the site to hit on a phone.
 *
 * mb-2 goes: min-h-11 supplies the spacing, and keeping both would have made
 * the columns enormous.
 */
const LINK = "inline-flex items-center min-h-11 text-gray-400 hover:text-white text-xs transition-colors";
const HEAD = "font-bold text-white mb-3 text-sm";
/* The columns must be flex columns: LINK is inline-flex, so in a plain block
   the anchors flow inline and wrap into rows instead of stacking. */
const COL = "flex flex-col items-start";

export default function SiteFooter() {
  return (
    <footer className="bg-[#1a2744] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
          <div className="max-w-xs">
            <span className="inline-flex bg-white rounded-lg px-3 py-2 mb-3">
              <Image
                src="/logo-wide.png"
                alt="ShouldIFinance"
                width={556}
                height={119}
                sizes="187px"
                className="h-10 w-auto"
              />
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Better Questions. Smarter Decisions. Free financial tools for every stage of life.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-sm w-full md:w-auto">
            <div className={COL}>
              <p className={HEAD}>Tools</p>
              {TOOLS.map((l) => (
                <Link key={l.href} href={l.href} className={LINK}>
                  {l.label}
                </Link>
              ))}
            </div>

            <div className={COL}>
              <p className={HEAD}>Learn</p>
              {/* Guides is the whole of it. Articles, Blog and FAQ used to sit
                  here as "#" placeholders, which read as an unfinished site;
                  there is one content section and this is it. */}
              <Link href="/guides" className={LINK}>
                Guides
              </Link>
            </div>

            <div className={COL}>
              <p className={HEAD}>Company</p>
              {COMPANY.map((l) => (
                <Link key={l.href} href={l.href} className={LINK}>
                  {l.label}
                </Link>
              ))}
            </div>

            <div>
              <p className={HEAD}>Follow Us</p>
              <div className="flex gap-3">
                {SOCIAL.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.title}
                    aria-label={s.title}
                    className="w-11 h-11 bg-white/10 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-xs font-bold"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© {COPYRIGHT_YEAR} ShouldIFinance.com. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {LEGAL_ROW.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex items-center min-h-11 text-xs text-gray-500 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
