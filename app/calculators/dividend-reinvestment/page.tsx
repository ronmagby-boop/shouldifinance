import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "dividend-reinvestment",
  "Compare taking dividends as cash against reinvesting them. See how a DRIP compounds your share count, income, and total return over time.",
);

export default function Page() {
  return <Calculator />;
}
