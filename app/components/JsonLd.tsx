import { calculatorSchema, guideSchema, siteSchema } from "../lib/schema";
import type { Guide } from "../lib/guides";

/**
 * The only thing on the site that writes a <script type="application/ld+json">.
 *
 * A native <script>, not next/script: JSON-LD is data, not executable code, and
 * the Next guide (node_modules/next/dist/docs/01-app/02-guides/json-ld.md) says
 * so in as many words. The same guide requires the `<` escape below, because
 * JSON.stringify will happily emit a literal `</script>` out of any string it
 * is given and end the block early.
 *
 * Every caller is a server component, so this lands in the prerendered HTML and
 * a crawler sees it without running any JavaScript.
 */
function JsonLd({ graph }: { graph: object[] }) {
  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Organization and WebSite. Rendered once, from the root layout. */
export function SiteSchema() {
  return <JsonLd graph={siteSchema()} />;
}

/** WebApplication and BreadcrumbList for one calculator. */
export function CalculatorSchema({ slug }: { slug: string }) {
  const graph = calculatorSchema(slug);
  /* An unknown slug yields nothing rather than a half-built node. Cannot happen
     while the 43 pages read their slug from the registry, but a wrong node is
     worse than no node. */
  if (!graph.length) return null;
  return <JsonLd graph={graph} />;
}

/** Article and BreadcrumbList for one guide. */
export function GuideSchema({ guide }: { guide: Guide }) {
  return <JsonLd graph={guideSchema(guide)} />;
}
