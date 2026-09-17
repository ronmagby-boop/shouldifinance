"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { House } from "lucide-react";
import { bySlug, CATEGORY_SECTIONS } from "../lib/calculators";

/**
 * Fixed bottom bar for mobile, shared by the homepage and every calculator
 * page. Home plus one tab per category, built from CATEGORY_SECTIONS so it
 * tracks the registry — merging or adding a category changes it here too.
 *
 * Render <MobileBottomNavSpacer /> as the last thing in the page so the fixed
 * bar never covers the end of the content.
 */
export default function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  // On /calculators the active category lives in the hash, which usePathname
  // does not see. Read it after mount only — touching location during render
  // would not match what the server rendered.
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash.replace("#", ""));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  const slug = pathname.match(/^\/calculators\/([^/]+)/)?.[1];
  const activeCategory = slug ? bySlug(slug)?.category : undefined;
  const homeActive = pathname === "/";

  const tabs = [
    { key: "home", label: "Home", href: "/", Icon: House, active: homeActive, text: "text-green-700", tint: "bg-green-50" },
    ...CATEGORY_SECTIONS.map(s => ({
      key: s.id,
      label: s.category,
      href: `/calculators#${s.id}`,
      Icon: s.icon,
      active: activeCategory === s.category || (pathname === "/calculators" && hash === s.id),
      text: s.text,
      tint: s.tint,
    })),
  ];

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
