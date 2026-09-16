import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "rent-vs-buy",
  "Rent vs. Buy Calculator",
  "Compare the total cost of renting against buying over the years you plan to stay, including equity, appreciation, and the break-even point.",
  bySlug("rent-vs-buy")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
