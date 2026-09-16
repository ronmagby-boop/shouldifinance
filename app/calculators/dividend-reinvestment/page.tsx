import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "dividend-reinvestment",
  "Dividend Reinvestment (DRIP) Calculator",
  "Compare taking dividends as cash against reinvesting them. See how a DRIP compounds your share count, income, and total return over time.",
  bySlug("dividend-reinvestment")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
