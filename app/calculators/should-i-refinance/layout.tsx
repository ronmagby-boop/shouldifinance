import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";

export const metadata: Metadata = calcMetadata(
  "should-i-refinance",
  "Should I Refinance? Calculator",
  "See whether refinancing your mortgage makes sense. Compare payments, chart both payoff timelines, and find your break-even point on closing costs.",
  bySlug("should-i-refinance")?.keywords ?? [],
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
