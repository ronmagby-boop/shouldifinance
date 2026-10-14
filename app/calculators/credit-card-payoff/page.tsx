import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "credit-card-payoff",
  "See how long a credit card takes to pay off at the minimum payment and at a fixed payment, the interest each costs, the payment that clears it by a target date, and what your statement's payoff box shows.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="credit-card-payoff" />
      <Calculator />
    </>
  );
}
