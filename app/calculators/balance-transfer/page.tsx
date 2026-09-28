import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "balance-transfer",
  "See what a 0% balance transfer really saves once the fee is counted, whether you can clear it inside the promo window, and what happens if you cannot.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="balance-transfer" />
      <Calculator />
    </>
  );
}
