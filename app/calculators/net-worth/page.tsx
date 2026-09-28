import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "net-worth",
  "Add up your assets and liabilities to calculate your net worth, then project how it grows over the next 10 years at your current savings rate.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="net-worth" />
      <Calculator />
    </>
  );
}
