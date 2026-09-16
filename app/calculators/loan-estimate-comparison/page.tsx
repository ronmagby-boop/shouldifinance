import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "loan-estimate-comparison",
  "Loan Estimate Comparison Calculator",
  "Compare up to three mortgage loan estimates side by side. See each lender's monthly payment, closing costs, effective APR, and five-year total cost.",
  bySlug("loan-estimate-comparison")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
