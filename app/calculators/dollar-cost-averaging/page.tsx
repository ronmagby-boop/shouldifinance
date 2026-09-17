import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "dollar-cost-averaging",
  "Compare dollar-cost averaging against a lump-sum investment. See your average cost per share, final value, and which approach came out ahead.",
);

export default function Page() {
  return <Calculator />;
}
