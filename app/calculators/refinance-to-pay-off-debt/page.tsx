import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "refinance-to-pay-off-debt",
  "List what you owe, tick the debts a new mortgage would clear, and compare the blended rate you pay now against the new loan — monthly and over the full term.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="refinance-to-pay-off-debt" />
      <Calculator />
    </>
  );
}
