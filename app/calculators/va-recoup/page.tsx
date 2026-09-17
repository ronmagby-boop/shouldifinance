import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "va-recoup",
  "Check whether a VA streamline refinance meets the 36-month recoupment rule. Enter your closing costs and new payment to see your recoupment period.",
);

export default function Page() {
  return <Calculator />;
}
