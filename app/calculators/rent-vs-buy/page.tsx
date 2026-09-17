import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "rent-vs-buy",
  "Compare the total cost of renting against buying over the years you plan to stay, including equity, appreciation, and the break-even point.",
);

export default function Page() {
  return <Calculator />;
}
