import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "student-loan-repayment",
  "Student Loan Repayment Calculator",
  "Compare standard, extended, and income-driven student loan repayment plans. See your monthly payment, total interest, and any forgiven balance.",
  bySlug("student-loan-repayment")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
