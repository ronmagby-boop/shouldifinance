import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "net-worth",
  "Net Worth Calculator",
  "Add up your assets and liabilities to calculate your net worth, then project how it grows over the next 10 years at your current savings rate.",
  bySlug("net-worth")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
