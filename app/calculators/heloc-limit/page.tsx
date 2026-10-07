import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "heloc-limit",
  "Estimate how much you could borrow with a HELOC: the line your equity supports at 80%, 85%, 90% or your lender's combined loan-to-value cap, and the payment on the full line.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="heloc-limit" />
      <Calculator />
    </>
  );
}
