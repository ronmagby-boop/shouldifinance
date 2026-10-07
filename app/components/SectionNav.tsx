import { CALC_SECTIONS, SECTION_ACCENT, type Category } from "../lib/calculators";

/**
 * A CALC_SECTIONS heading, styled the same wherever it appears: the
 * /calculators and /guides indexes and the "More in ..." boxes. Darkest text,
 * bold, with a short bar in the category's accent colour beside it and an
 * optional count in a muted grey (gray-500, which stays above 4.5:1 on white).
 */
export function SectionHeading({
  category,
  children,
  count,
  as: Tag = "h3",
  id,
}: {
  category: Category;
  children: React.ReactNode;
  count?: number;
  as?: "h2" | "h3" | "p";
  id?: string;
}) {
  return (
    <Tag id={id} className="flex items-center gap-2.5 text-base font-bold text-gray-900 leading-snug">
      <span aria-hidden="true" className={`w-1 h-5 rounded-full flex-shrink-0 ${SECTION_ACCENT[category]}`} />
      <span>
        {children}
        {count !== undefined && <span className="ml-1.5 text-sm font-normal text-gray-500">· {count}</span>}
      </span>
    </Tag>
  );
}

/**
 * The row of jump links under a category heading, one per titled section, in
 * section order, pointing at the anchors the sections already carry. Wraps
 * rather than scrolling sideways, so nothing is hidden off the edge of a
 * phone; each link is at least 44px tall. Renders nothing for a category with
 * fewer than two titled sections (Debt).
 */
export function SectionJumpLinks({ category }: { category: Category }) {
  const sections = CALC_SECTIONS[category].filter((s) => s.title && s.short);
  if (sections.length < 2) return null;
  return (
    <nav aria-label={`Sections in ${category}`} className="mb-5">
      <ul className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-flex items-center min-h-[44px] px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 whitespace-nowrap hover:border-green-200 hover:text-green-700 transition-colors"
            >
              {s.short}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
