import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "compound-interest",
  "Compound Interest Calculator",
  "See how compound interest grows your savings over time. Adjust your starting balance, monthly contribution, rate, and compounding frequency to compare outcomes.",
  bySlug("compound-interest")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
