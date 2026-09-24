import Image from "next/image";
import Link from "next/link";

/**
 * The compact footer used by the legal pages and the guides.
 *
 * The homepage keeps its own, larger footer with the four link columns and the
 * social row. This is the short version for reading pages, extracted so the
 * legal documents and the guides cannot drift apart the way three hand-written
 * copies eventually would.
 */
const FOOTER_LINKS = [
  { href: "/calculators", label: "All calculators" },
  { href: "/guides", label: "Guides" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#1a2744] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="max-w-xs">
            <span className="inline-flex bg-white rounded-lg px-3 py-2 mb-3">
              <Image src="/logo-wide.png" alt="ShouldIFinance" width={556} height={119} className="h-10 w-auto" />
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Better Questions. Smarter Decisions. Free financial tools for every stage of life.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-gray-400 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 mt-6 pt-5">
          <p className="text-xs text-gray-500">© 2025 ShouldIFinance.com. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
