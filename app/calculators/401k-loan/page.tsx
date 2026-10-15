import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "401k-loan",
  "Should you borrow from your 401(k)? See the most you can borrow, the payment, the growth your account misses, what happens if you leave your job, and how it compares with a HELOC, personal loan or credit card.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="401k-loan" />
      <Calculator />
    </>
  );
}
