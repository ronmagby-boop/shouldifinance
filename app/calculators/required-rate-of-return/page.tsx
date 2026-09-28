import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "required-rate-of-return",
  "Find the annual return you need to reach a savings goal on time, and see whether that return is realistic for your timeline and contributions.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="required-rate-of-return" />
      <Calculator />
    </>
  );
}
