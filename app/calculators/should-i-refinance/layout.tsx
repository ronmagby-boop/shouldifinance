import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";

export const metadata: Metadata = calcMetadata(
  "should-i-refinance",
  "See whether refinancing your mortgage makes sense. Compare payments, chart both payoff timelines, and find your break-even point on closing costs.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
