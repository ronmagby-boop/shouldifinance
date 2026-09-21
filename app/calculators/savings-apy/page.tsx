import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "savings-apy",
  "Turn a bank's quoted savings rate into the annual percentage yield you actually earn, and see how much the compounding frequency is worth on your balance.",
);

export default function Page() {
  return <Calculator />;
}
