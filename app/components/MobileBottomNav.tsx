"use client";
import Link from "next/link";
import { House } from "lucide-react";
import { CATEGORY_SECTIONS } from "../lib/calculators";

/**
 * Fixed bottom bar for mobile, shared by the homepage and every calculator
 * page. Home plus one tab per category, built from CATEGORY_SECTIONS so it
 * tracks the registry — merging or adding a category changes it here too.
 *
 * Render <MobileBottomNavSpacer /> as the last thing in the page so the fixed
 * bar never covers the end of the content.
 */
export default function MobileBottomNav() {
  const tabs = [
    { key: "home", label: "Home", href: "/", Icon: House },
    ...CATEGORY_SECTIONS.map(s => ({
      key: s.id,
      label: s.category === "Real estate" ? "Real estate" : s.category,
      href: `/calculators#${s.id}`,
      Icon: s.icon,
    })),
  ];

  return (
    <nav
      aria-label="Categories"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50 shadow-lg"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex justify-around">
        {tabs.map(({ key, label, href, Icon }) => (
          <Link key={key} href={href} className="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 hover:text-green-700 transition-colors">
            <Icon className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" />
            <span className="text-[11px] whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function MobileBottomNavSpacer() {
  return <div className="md:hidden h-16" aria-hidden="true" />;
}
