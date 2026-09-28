import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "buy-now-or-save",
  "Compare buying now with a smaller down payment and PMI against saving longer for a bigger one, including how long the saving actually takes as prices move.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="buy-now-or-save" />
      <Calculator />
    </>
  );
}
