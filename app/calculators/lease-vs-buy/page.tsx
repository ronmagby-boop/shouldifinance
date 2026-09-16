import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "lease-vs-buy",
  "Car Lease vs. Buy Calculator",
  "Compare leasing and buying your next car over the same period, including depreciation, interest, and resale value, to see which one truly costs less.",
  bySlug("lease-vs-buy")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
