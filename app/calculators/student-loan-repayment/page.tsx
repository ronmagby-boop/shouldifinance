import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "student-loan-repayment",
  "Compare standard, extended, and income-driven student loan repayment plans. See your monthly payment, total interest, and any forgiven balance.",
);

export default function Page() {
  return <Calculator />;
}
