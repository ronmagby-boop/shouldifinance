import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "heloc-debt-payoff",
  "Compare clearing high-interest debt with a HELOC against keeping it. See the interest-only draw, the payment jump when repayment starts, and what each costs.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="heloc-debt-payoff" />
      <Calculator />
    </>
  );
}
