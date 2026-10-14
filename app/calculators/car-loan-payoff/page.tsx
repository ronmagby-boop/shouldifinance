import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "car-loan-payoff",
  "Should you pay off your car loan early? See the payoff date and interest saved with extra payments or a lump sum, and whether the money does more paying the loan or invested.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="car-loan-payoff" />
      <Calculator />
    </>
  );
}
