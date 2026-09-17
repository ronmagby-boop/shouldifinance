"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { bySlug, CALCULATORS, CATEGORY_SECTIONS } from "../lib/calculators";

/**
 * The one top navigation used by every page — homepage, the /calculators index
 * and all 29 calculator pages. Previously each of those built its own link
 * list, which is how /calculators ended up without a "Calculators" link at all.
 *
 * The links come from CATEGORY_SECTIONS, and the active state is worked out
 * from the URL, so a page only has to say where it sits and what its CTA is.
 */

const NAV_LINKS = [
  { label: "Calculators", href: "/calculators", match: "calculators" as const },
  ...CATEGORY_SECTIONS.map(s => ({
    label: s.category,
    href: `/calculators#${s.id}`,
    match: s.id,
  })),
];

export type SiteNavProps = {
  /** Homepage overlays its hero, so it is fixed; everything else sticks in flow. */
  position?: "fixed" | "sticky";
  /** Wide wordmark where the nav has room, the compact mark where it does not. */
  logo?: "wide" | "compact";
  /** Same-page anchor on the homepage, a real route anywhere else. */
  ctaHref?: string;
};

export default function SiteNav({
  position = "sticky",
  logo = "wide",
  ctaHref = "/#resources",
}: SiteNavProps) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const onCalculators = pathname === "/calculators" || pathname.startsWith("/calculators/");
  const slug = pathname.match(/^\/calculators\/([^/]+)/)?.[1];
  const activeCategory = slug ? bySlug(slug)?.category : undefined;

  // Only the pathname drives the highlight. A hash-only navigation
  // (/calculators -> /calculators#auto) fires no event and re-renders nothing,
  // so anything keyed on the hash goes stale. /calculators shows all three
  // categories at once anyway, so no single one is "current" there.
  const isActive = (match: string) => {
    if (match === "calculators") return onCalculators;
    const section = CATEGORY_SECTIONS.find(s => s.id === match);
    return !!section && activeCategory === section.category;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CALCULATORS.filter(c =>
      c.nav.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.keywords.some(k => k.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [query]);

  const closeSearch = () => { setSearchOpen(false); setQuery(""); };

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSearch(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const wrapper = position === "fixed"
    ? "fixed top-0 left-0 right-0 z-50"
    : "sticky top-0 z-50";

  return (
    <>
      <nav className={`${wrapper} bg-white border-b border-gray-100 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 md:px-8 py-2">
          <Link href="/" className="flex-shrink-0">
            {logo === "wide" ? (
              <Image src="/logo-wide.png" alt="ShouldIFinance" width={556} height={119} className="h-10 md:h-12 w-auto" priority />
            ) : (
              <Image src="/logo.png" alt="ShouldIFinance" width={236} height={150} className="h-9 w-auto" priority />
            )}
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => {
              const active = isActive(l.match);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm font-medium transition-colors ${
                    active
                      ? "text-green-700 font-semibold border-b-2 border-green-600 pb-0.5"
                      : "text-gray-600 hover:text-green-700"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search calculators"
              className="text-gray-400 hover:text-green-700 p-2 rounded-full hover:bg-gray-50 transition-colors"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
            <Link
              href={ctaHref}
              className="bg-green-700 text-white text-sm font-semibold rounded-full px-5 py-2 hover:bg-green-800 transition-colors whitespace-nowrap"
            >
              Get Free Resources
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search calculators"
              className="text-gray-400 hover:text-green-700 p-2"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              className="flex flex-col gap-1.5 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-6 h-0.5 bg-gray-900 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-2">
            {NAV_LINKS.map(l => {
              const active = isActive(l.match);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm py-2.5 border-b border-gray-50 font-medium ${
                    active ? "text-green-700 font-bold" : "text-gray-700"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <Link
              href={ctaHref}
              onClick={() => setMenuOpen(false)}
              className="w-full text-center bg-green-700 text-white rounded-full py-3 text-sm font-semibold mt-3"
            >
              Get Free Resources
            </Link>
          </div>
        )}
      </nav>

      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm px-4 pt-20 md:pt-28"
          onClick={closeSearch}
        >
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${CALCULATORS.length} calculators…`}
                className="flex-1 py-4 text-sm focus:outline-none"
              />
              <button onClick={closeSearch} aria-label="Close search"
                className="text-xs font-semibold text-gray-400 hover:text-gray-700 px-2 py-1">
                ESC
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim() === "" ? (
                <p className="px-4 py-6 text-sm text-gray-400">
                  Start typing to find a calculator — try “mortgage”, “retirement” or “car”.
                </p>
              ) : results.length === 0 ? (
                <div className="px-4 py-6">
                  <p className="text-sm text-gray-500 mb-3">No calculator matches “{query}”.</p>
                  <Link href="/calculators" onClick={closeSearch}
                    className="text-sm text-green-700 font-semibold hover:underline">
                    Browse all {CALCULATORS.length} calculators →
                  </Link>
                </div>
              ) : (
                results.map(c => (
                  <Link key={c.slug} href={`/calculators/${c.slug}`} onClick={closeSearch}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 group">
                    <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center flex-shrink-0 text-gray-700`}>
                      <c.icon className="w-4.5 h-4.5" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">{c.nav}</p>
                      <p className="text-xs text-gray-500 truncate">{c.category} · {c.desc}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
