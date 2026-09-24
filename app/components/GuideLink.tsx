"use client";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { bySlug } from "../lib/calculators";
import { trackGuideOpened } from "../lib/analytics";

/**
 * The one link from a calculator into its written guide.
 *
 * Deliberately not a fifth related card: the related grid changes column count
 * with the number of cards, so a guide sitting in it would re-lay the
 * calculators out. Renders nothing when the calculator has no guide.
 *
 * Lives here rather than inside CalcShell because mortgage-payment and
 * should-i-refinance predate CalcShell and still build their own page chrome.
 * One component means the link cannot end up looking different on those two.
 *
 * The pairing is read from the registry rather than the markdown: this renders
 * inside client components, and lib/guides.ts touches the filesystem. That file
 * fails the build if the registry and content/guides/ disagree.
 */
export default function GuideLink({ slug }: { slug: string }) {
  const guide = bySlug(slug)?.guide;
  if (!guide) return null;

  return (
    <Link
      href={`/guides/${guide.slug}`}
      onClick={() => trackGuideOpened(slug, guide.slug)}
      className="flex items-start gap-3 border border-gray-200 rounded-xl p-4 mb-6 bg-gray-50 hover:border-green-200 hover:shadow-sm transition-all"
    >
      <span className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 text-green-700">
        <BookOpen className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900">{guide.teaser}</span>
        <span className="block text-xs text-gray-400 leading-relaxed mt-0.5">
          A written guide to the rules behind this calculator →
        </span>
      </span>
    </Link>
  );
}
