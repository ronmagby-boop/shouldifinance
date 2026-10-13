import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "debt-to-income",
  "Work out your front-end and back-end debt-to-income ratios, compare them with conventional, FHA, VA and USDA guidelines, see student loans as each program counts them, and check VA residual income.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="debt-to-income" />
      <Calculator />
    </>
  );
}
