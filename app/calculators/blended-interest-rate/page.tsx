import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "blended-interest-rate",
  "Find the blended interest rate across all your debts, weighted by balance. See what they cost in interest each month, and which debts that interest actually comes from.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="blended-interest-rate" />
      <Calculator />
    </>
  );
}
