import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "emergency-fund",
  "Work out how many months of expenses you should keep in cash, then see how long it takes to build that cushion at your current savings rate.",
);

export default function Page() {
  return <Calculator />;
}
