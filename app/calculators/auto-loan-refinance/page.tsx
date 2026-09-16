import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "auto-loan-refinance",
  "Auto Loan Refinance Calculator",
  "See what refinancing your car loan saves. Compare your current payment and payoff against a new rate and term, including any refinancing fees.",
  bySlug("auto-loan-refinance")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
