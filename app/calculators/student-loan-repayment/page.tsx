import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "student-loan-repayment",
  "Compare standard, extended, IBR and the Repayment Assistance Plan: monthly payment, total interest, and any forgiven balance under the 2026 rules.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="student-loan-repayment" />
      <Calculator />
    </>
  );
}
