import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "lease-vs-buy",
  "Compare leasing and buying your next car over the same period, including depreciation, interest, and resale value, to see which one truly costs less.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="lease-vs-buy" />
      <Calculator />
    </>
  );
}
