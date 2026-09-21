import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "debt-consolidation",
  "Choose which balances to roll into a consolidation loan and compare monthly payment, total interest after the fee, and how long each route takes to clear.",
);

export default function Page() {
  return <Calculator />;
}
