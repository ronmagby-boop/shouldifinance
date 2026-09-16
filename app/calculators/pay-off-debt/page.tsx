import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "pay-off-debt",
  "Pay Off Debt or Invest Calculator",
  "Compare the guaranteed return of paying off debt early against investing the same money, after taxes, so you can see which one leaves you further ahead.",
  bySlug("pay-off-debt")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
