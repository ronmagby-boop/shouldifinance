import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "401k-vs-debt-payoff",
  "Compare taking your full employer 401(k) match against putting the same money on your debt, including the pre-tax saving and what each is worth after.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="401k-vs-debt-payoff" />
      <Calculator />
    </>
  );
}
