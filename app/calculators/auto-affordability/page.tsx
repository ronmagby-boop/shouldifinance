import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "auto-affordability",
  "Find out how much car you can afford based on your income, down payment, and other monthly bills, using the 20/4/10 rule as a sanity check.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="auto-affordability" />
      <Calculator />
    </>
  );
}
