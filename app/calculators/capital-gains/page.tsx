import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "capital-gains",
  "Capital Gains Tax Calculator",
  "Estimate federal and state capital gains tax on an investment sale, and see exactly what holding for long-term rates would save you.",
  bySlug("capital-gains")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
