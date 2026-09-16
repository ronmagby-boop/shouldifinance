import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "early-withdrawal",
  "401(k) Early Withdrawal Penalty Calculator",
  "See the real cost of an early retirement withdrawal: federal and state tax, the 10% penalty, and the future growth you give up by taking the money now.",
  bySlug("early-withdrawal")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
