import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "loan-estimate-comparison",
  "Compare up to three mortgage loan estimates side by side. See each lender's monthly payment, closing costs, effective APR, and five-year total cost.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="loan-estimate-comparison" />
      <Calculator />
    </>
  );
}
