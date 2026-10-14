import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "when-to-start-social-security",
  "Compare starting Social Security at every age from 62 to 70: the monthly benefit, the break-even ages, what you collect by the age you plan to, and what investing early benefits changes.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="when-to-start-social-security" />
      <Calculator />
    </>
  );
}
