import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "ev-savings",
  "EV vs. Gas Savings Calculator",
  "Compare an electric car against a gas car on fuel, maintenance, and incentives to find your break-even point and lifetime savings.",
  bySlug("ev-savings")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
