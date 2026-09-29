import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "va-vs-conventional",
  "Compare a VA loan and a conventional loan side by side: monthly payment, cash at closing, the funding fee against PMI, and total interest.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="va-vs-conventional" />
      <Calculator />
    </>
  );
}
