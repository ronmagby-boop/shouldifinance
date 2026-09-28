import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "should-i-refinance",
  "See whether refinancing your mortgage makes sense. Compare payments, chart both payoff timelines, and find your break-even point on closing costs.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="should-i-refinance" />
      <Calculator />
    </>
  );
}
