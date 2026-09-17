import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "compound-interest",
  "See how compound interest grows your savings over time. Adjust your starting balance, monthly contribution, rate, and compounding frequency to compare outcomes.",
);

export default function Page() {
  return <Calculator />;
}
