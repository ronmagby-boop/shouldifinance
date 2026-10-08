import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "rental-property",
  "Should you buy a rental property? See the monthly cash flow, cash-on-cash return, cap rate, DSCR, break-even rent and cash to close, with each metric's formula.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="rental-property" />
      <Calculator />
    </>
  );
}
