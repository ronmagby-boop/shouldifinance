import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "debt-consolidation",
  "Put up to five balances against a single consolidation loan and compare monthly payment, total interest and how long each route takes to clear.",
);

export default function Page() {
  return <Calculator />;
}
