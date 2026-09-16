import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "dollar-cost-averaging",
  "Dollar-Cost Averaging Calculator",
  "Compare dollar-cost averaging against a lump-sum investment. See your average cost per share, final value, and which approach came out ahead.",
  bySlug("dollar-cost-averaging")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
