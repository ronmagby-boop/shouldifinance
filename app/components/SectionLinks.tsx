import Link from "next/link";

/**
 * "More in this section": the other calculators (on a calculator page) or
 * guides (on a guide page) in the same CALC_SECTIONS section, in order, with
 * the current page marked rather than linked. Presentational only, so a
 * client component (CalcShell) and a server page (a guide) can both render it
 * from items they work out themselves.
 *
 * Rendered only for a titled section with more than one entry; a lone entry
 * has nothing to point to, and Debt's single untitled section has no heading
 * to name it by.
 */
export default function SectionLinks({
  title,
  anchor,
  items,
}: {
  /** The section's heading. */
  title: string | null;
  /** Where "see all" points: the section on /calculators or /guides. */
  anchor: string;
  items: { href: string; label: string; current: boolean }[];
}) {
  if (!title || items.length < 2) return null;
  return (
    <nav aria-label={`More in ${title}`} className="mb-6 border border-gray-100 rounded-xl px-4 py-3" data-x-section-links>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">More in {title}</p>
      <ol>
        {items.map((item) => (
          <li key={item.href}>
            {item.current ? (
              <span aria-current="page" className="flex items-center min-h-[44px] text-sm font-semibold text-gray-900">
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="flex items-center min-h-[44px] text-sm text-green-700 hover:underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <Link href={anchor} className="inline-flex items-center min-h-[44px] text-xs font-semibold text-gray-500 hover:text-green-700">
        All of {title} →
      </Link>
    </nav>
  );
}
