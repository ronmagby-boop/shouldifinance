import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "early-withdrawal",
  "See the real cost of an early retirement withdrawal: federal and state tax, the 10% penalty, and the future growth you give up by taking the money now.",
);

export default function Page() {
  return <Calculator />;
}
