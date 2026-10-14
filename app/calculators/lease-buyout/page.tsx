import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "lease-buyout",
  "Should you buy out your car lease? Add up the buyout price, fees and tax, compare it with what the car is worth and the end-of-lease charges you would avoid, and see the payment if you finance it.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="lease-buyout" />
      <Calculator />
    </>
  );
}
