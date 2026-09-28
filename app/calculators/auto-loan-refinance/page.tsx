import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "auto-loan-refinance",
  "See what refinancing your car loan saves. Compare your current payment and payoff against a new rate and term, including any refinancing fees.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="auto-loan-refinance" />
      <Calculator />
    </>
  );
}
