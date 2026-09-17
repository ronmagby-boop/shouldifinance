"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { bySlug, CATEGORY_SECTIONS } from "../lib/calculators";

/**
 * Fixed bottom bar for mobile, shared by the homepage and every calculator
 * page. One tab per category, built from CATEGORY_SECTIONS so it tracks the
 * registry — renaming or adding a category changes it here too.
 *
 * Four tabs, all categories — there is deliberately no site-home tab. Since
 * Real estate is now displayed as "Home", adding one would put two tabs
 * labelled "Home" side by side pointing at different places. Read together,
 * "Home / Debt / Money / Auto" is unambiguous: the neighbours make it obvious
 * these are topics, not destinations. Getting back to the homepage is the logo
 * in the top nav, which is sticky on every page.
 *
 * The key collision that caused this (category id "home" vs a site-home tab
 * keyed "home") is fixed at the source: the Home category's id is "real-estate".
 *
 * Render <MobileBottomNavSpacer /> as the last thing in the page so the fixed
 * bar never covers the end of the content.
 */
export default function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  const slug = pathname.match(/^\/calculators\/([^/]+)/)?.[1];
  const activeCategory = slug ? bySlug(slug)?.category : undefined;

  const tabs = CATEGORY_SECTIONS.map(s => ({
    key: s.id,
    label: s.category,
    href: `/calculators#${s.id}`,
    Icon: s.icon,
    active: activeCategory === s.category,
    text: s.text,
    tint: s.tint,
  }));

  return (
    <nav
      aria-label="Categories"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-1.5 z-50 shadow-lg"
      style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex justify-around">
        {tabs.map(({ key, label, href, Icon, active, text, tint }) => (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-xl"
          >
            <span
              className={`flex items-center justify-center w-9 h-6 rounded-full transition-colors ${
                active ? `${tint} ${text}` : "text-gray-400"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
            </span>
            <span className={`text-[10px] leading-tight whitespace-nowrap ${active ? `${text} font-semibold` : "text-gray-500"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function MobileBottomNavSpacer() {
  return <div className="md:hidden h-16" aria-hidden="true" />;
}
