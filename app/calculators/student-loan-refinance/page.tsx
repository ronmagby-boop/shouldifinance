import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "student-loan-refinance",
  "Should you refinance federal student loans into a private loan? Compare payments and interest, see the income-driven payment you would give up, and what refinancing ends: forgiveness, deferment, forbearance and discharge protections.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="student-loan-refinance" />
      <Calculator />
    </>
  );
}
