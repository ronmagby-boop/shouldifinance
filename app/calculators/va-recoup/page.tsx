import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "va-recoup",
  "VA Loan Recoupment Calculator (IRRRL)",
  "Check whether a VA streamline refinance meets the 36-month recoupment rule. Enter your closing costs and new payment to see your recoupment period.",
  bySlug("va-recoup")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
