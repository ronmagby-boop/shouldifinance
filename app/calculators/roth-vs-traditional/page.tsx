import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "roth-vs-traditional",
  "Compare Roth and Traditional retirement contributions on after-tax value, based on your tax rate today against the one you expect in retirement.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="roth-vs-traditional" />
      <Calculator />
    </>
  );
}
