import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "rent-or-sell",
  "Compare selling your house now with renting it out and selling later: landlord cash flow, break-even appreciation and rent, the section 121 sell-by date, depreciation recapture, and VA entitlement.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="rent-or-sell" />
      <Calculator />
    </>
  );
}
