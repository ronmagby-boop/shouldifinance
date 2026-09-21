import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "student-loan-repayment",
  "Compare the standard, extended, IBR and Repayment Assistance Plan options on your balance. See your monthly payment, total interest, and any forgiven balance under the rules in effect from July 1, 2026.",
);

export default function Page() {
  return <Calculator />;
}
