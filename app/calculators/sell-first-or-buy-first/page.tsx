import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "sell-first-or-buy-first",
  "Buying first means only your savings reach the closing table, so the loan and the payment are bigger. Compare both monthly payments, and what recasting does once the old home sells.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="sell-first-or-buy-first" />
      <Calculator />
    </>
  );
}
