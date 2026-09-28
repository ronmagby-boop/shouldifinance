import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "payoff-house-vs-invest",
  "Compare extra mortgage payments against investing the same money, with interest saved, investment growth and net worth at the end of the original term.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="payoff-house-vs-invest" />
      <Calculator />
    </>
  );
}
