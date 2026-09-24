import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A small markdown renderer for the guides.
 *
 * It covers the subset the guides are written in and nothing else:
 *
 *   ## Heading            — section heading
 *   ### Heading           — sub-heading
 *   plain paragraphs
 *   - bullet              — unordered list
 *   1. item               — ordered list
 *   > quoted line         — callout
 *   | a | b |            — table, with a |---|---| row beneath the header
 *   **bold**  *italic*  `code`  [text](/href)
 *
 * It builds React elements rather than an HTML string, so nothing is ever
 * passed through dangerouslySetInnerHTML. Guide content is trusted — it lives
 * in this repo — but there is no reason to open that door for a feature that
 * does not need it.
 *
 * Anything outside the subset renders as literal text, which is visible in
 * review rather than silently wrong.
 */

/** Splits inline markdown into React nodes. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Ordered so the longer delimiters win: links, bold, code, italic.
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;

    if (m[1] !== undefined) {
      const href = m[2];
      const external = /^https?:\/\//.test(href);
      nodes.push(
        external ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-green-700 underline">
            {m[1]}
          </a>
        ) : (
          <Link key={key} href={href} className="text-green-700 underline">
            {m[1]}
          </Link>
        ),
      );
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={key} className="font-semibold text-gray-900">{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<code key={key} className="text-xs bg-gray-100 rounded px-1 py-0.5">{m[4]}</code>);
    } else if (m[5] !== undefined) {
      nodes.push(<em key={key}>{m[5]}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * An ordered list, at the start of a block.
 *
 * Any number can open one there — a list is allowed to resume at 4.
 */
const ORDERED = /^\d+\. /;

/**
 * An ordered list that is allowed to interrupt a paragraph already in progress.
 *
 * Only a list starting at 1 may, which is the CommonMark rule and exists for
 * exactly the case that caught this file: a sentence ending "...your own money
 * says 51. Both are true" wraps so that "51. Both are true" begins a line, and
 * without this it becomes a one-item numbered list in the middle of a
 * paragraph. Prose containing a number followed by a period is common; prose
 * that wraps to put "1. " at the start of a line is not.
 */
const ORDERED_INTERRUPTING = /^1\. /;

/**
 * Pulls the wrapped continuation of a list item onto the item itself.
 *
 * Guides are written wrapped at a readable column, so a bullet longer than one
 * line continues on indented lines beneath it. Without this they would break
 * out of the list and render as a separate paragraph.
 */
function absorbWrapped(lines: string[], i: number, items: string[]): number {
  while (i < lines.length && /^\s+\S/.test(lines[i]) && !/^\s*[-*] /.test(lines[i])) {
    items[items.length - 1] += ` ${lines[i].trim()}`;
    i++;
  }
  return i;
}

export default function Markdown({
  body,
  slot,
  slotBeforeHeading = 3,
}: {
  body: string;
  /**
   * Optional block dropped into the flow of the guide, immediately before the
   * nth top-level heading — used for the in-article ad.
   *
   * Inserted between sections rather than at a fixed word count so it always
   * lands on a natural break, never mid-argument or between a claim and the
   * figure supporting it. Every guide has between four and six `##` headings,
   * so the third always exists and always leaves sections after it; if a
   * shorter guide is ever added, the slot is simply dropped rather than being
   * forced somewhere awkward.
   */
  slot?: ReactNode;
  slotBeforeHeading?: number;
}) {
  const lines = body.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let headings = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="text-sm font-bold text-gray-900 mt-6 mb-2">
          {inline(line.slice(4), `h3${key}`)}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      headings++;
      if (slot && headings === slotBeforeHeading) blocks.push(<div key={`slot${key++}`}>{slot}</div>);
      blocks.push(
        <h2 key={key++} className="text-lg font-bold text-gray-900 mt-8 mb-3 scroll-mt-20">
          {inline(line.slice(3), `h2${key}`)}
        </h2>,
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoted.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <div key={key++} className="border border-amber-200 bg-amber-50 rounded-xl p-4 my-4 text-xs text-amber-900 leading-relaxed">
          {inline(quoted.join(" "), `q${key}`)}
        </div>,
      );
      continue;
    }

    /* A GFM pipe table: a header row, a row of dashes, then the body. Wrapped
       in its own horizontal scroller — the reading column is narrow on a phone
       and a table is the one block allowed to be wider than it. */
    if (line.startsWith("|") && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const cells = (row: string) =>
        row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(cells(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto my-4 -mx-1 px-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {head.map((h, n) => (
                  <th
                    key={n}
                    className="text-left font-semibold text-gray-900 border-b border-gray-200 py-2 pr-4 align-bottom"
                  >
                    {inline(h, `th${key}-${n}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rn) => (
                <tr key={rn}>
                  {r.map((c, n) => (
                    <td key={n} className="border-b border-gray-100 py-2 pr-4 align-top">
                      {inline(c, `td${key}-${rn}-${n}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
        i = absorbWrapped(lines, i, items);
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-1.5 my-3">
          {items.map((t, n) => (
            <li key={n}>{inline(t, `ul${key}-${n}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (ORDERED.test(line)) {
      const items: string[] = [];
      while (i < lines.length && ORDERED.test(lines[i])) {
        items.push(lines[i].replace(ORDERED, ""));
        i++;
        i = absorbWrapped(lines, i, items);
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1.5 my-3">
          {items.map((t, n) => (
            <li key={n}>{inline(t, `ol${key}-${n}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("> ") &&
      !/^[-*] /.test(lines[i]) &&
      !lines[i].startsWith("|") &&
      !ORDERED_INTERRUPTING.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-3">
        {inline(para.join(" "), `p${key}`)}
      </p>,
    );
  }

  return <div className="text-sm text-gray-700 leading-relaxed">{blocks}</div>;
}
