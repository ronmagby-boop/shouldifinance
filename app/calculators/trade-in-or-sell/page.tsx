import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "trade-in-or-sell",
  "Should you trade in your car or sell it privately? Compare the trade-in offer and any sales tax it saves with a private sale after costs, see the price you would need, and what owing more than the car is worth changes.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="trade-in-or-sell" />
      <Calculator />
    </>
  );
}
