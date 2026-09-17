import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "buy-now-or-wait",
  "Compare buying at today's price and rate against waiting for a lower rate, and find how fast prices can rise before waiting stops paying off.",
);

export default function Page() {
  return <Calculator />;
}
