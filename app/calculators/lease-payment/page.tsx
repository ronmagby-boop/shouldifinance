import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "lease-payment",
  "Build a lease payment from capitalized cost, residual value, and money factor. See the depreciation and rent charge that make up your monthly payment.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="lease-payment" />
      <Calculator />
    </>
  );
}
