"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { byCategory, CALCULATORS, CATEGORY_SECTIONS } from "../lib/calculators";

/**
 * The calculator index, rendered from the CALCULATORS registry so the list
 * exists in exactly one place. Two entry points share that data:
 *
 *   <CalculatorSidebar />      desktop rail, hidden below md
 *   <CalculatorBrowseMobile /> disclosure button, hidden at md and up
 *
 * Both work out the active page from the URL, so a page only has to render
 * them — there is no slug to pass and nothing to keep in sync.
 */

function useActiveSlug(activeSlug?: string) {
  const pathname = usePathname();
  if (activeSlug) return activeSlug;
  const m = pathname?.match(/^\/calculators\/([^/]+)/);
  return m ? m[1] : "";
}

function itemClass(active: boolean) {
  return [
    "block px-3 py-2 rounded-lg text-xs mb-0.5 transition-colors",
    active
      ? "bg-green-50 text-green-800 font-bold"
      : "text-gray-500 hover:bg-gray-50 hover:text-green-700",
  ].join(" ");
}

export default function CalculatorSidebar({ activeSlug }: { activeSlug?: string }) {
  const active = useActiveSlug(activeSlug);

  return (
    <aside
      aria-label="All calculators"
      className="hidden md:block border-r border-gray-100 py-6 self-start sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto"
    >
      {CATEGORY_SECTIONS.map(section => (
        <div key={section.id} className="px-4 mb-4 last:mb-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            {section.category}
          </p>
          {byCategory(section.category).map(calc => {
            const isActive = calc.slug === active;
            return (
              <Link
                key={calc.slug}
                href={`/calculators/${calc.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={itemClass(isActive)}
              >
                {calc.nav}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="px-4 pt-3 mt-3 border-t border-gray-100">
        <Link href="/calculators" className="text-xs font-semibold text-green-700 hover:underline">
          View all {CALCULATORS.length} calculators →
        </Link>
      </div>
    </aside>
  );
}

export function CalculatorBrowseMobile({ activeSlug }: { activeSlug?: string }) {
  const active = useActiveSlug(activeSlug);
  const [open, setOpen] = useState(false);
  const current = CALCULATORS.find(c => c.slug === active);

  return (
    <div className="md:hidden border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-calculator-list"
        className="w-full flex items-center justify-between gap-3 px-5 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            Browse calculators
          </span>
          <span className="block text-xs font-semibold text-gray-900 truncate">
            {current ? current.nav : `All ${CALCULATORS.length} calculators`}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`text-gray-400 text-xs flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          id="mobile-calculator-list"
          className="px-5 pb-3 max-h-[55vh] overflow-y-auto border-t border-gray-50"
        >
          {CATEGORY_SECTIONS.map(section => (
            <div key={section.id} className="pt-3">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                {section.icon} {section.category}
              </p>
              {byCategory(section.category).map(calc => {
                const isActive = calc.slug === active;
                return (
                  <Link
                    key={calc.slug}
                    href={`/calculators/${calc.slug}`}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={itemClass(isActive)}
                  >
                    {calc.nav}
                  </Link>
                );
              })}
            </div>
          ))}
          <Link
            href="/calculators"
            onClick={() => setOpen(false)}
            className="block pt-3 mt-2 border-t border-gray-100 text-xs font-semibold text-green-700"
          >
            View all {CALCULATORS.length} calculators →
          </Link>
        </div>
      )}
    </div>
  );
}
