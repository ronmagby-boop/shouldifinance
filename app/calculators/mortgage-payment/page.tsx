import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "mortgage-payment",
  "Estimate your monthly mortgage payment including principal, interest, property tax, insurance, and PMI, plus a five-year amortization schedule.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="mortgage-payment" />
      <Calculator />
    </>
  );
}
