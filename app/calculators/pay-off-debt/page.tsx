import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "pay-off-debt",
  "Compare the guaranteed return of paying off debt early against investing the same money, after taxes, so you can see which one leaves you further ahead.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="pay-off-debt" />
      <Calculator />
    </>
  );
}
