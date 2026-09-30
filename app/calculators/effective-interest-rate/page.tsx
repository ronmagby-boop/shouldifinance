import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "effective-interest-rate",
  "Convert a quoted rate plus points and fees into the rate you actually pay, over the full term and over the years you expect to keep the loan.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="effective-interest-rate" />
      <Calculator />
    </>
  );
}
