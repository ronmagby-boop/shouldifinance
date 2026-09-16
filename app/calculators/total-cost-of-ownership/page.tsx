import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "total-cost-of-ownership",
  "Car Total Cost of Ownership Calculator",
  "Add up depreciation, fuel, insurance, maintenance, and financing to see what a car really costs per year and per mile over the time you own it.",
  bySlug("total-cost-of-ownership")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
