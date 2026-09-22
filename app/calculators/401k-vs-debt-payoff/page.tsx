import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "401k-vs-debt-payoff",
  "Compare capturing your full employer 401(k) match against putting the same money on your debt, including the tax saving on a pre-tax contribution and what each path is worth after the debt clears.",
);

export default function Page() {
  return <Calculator />;
}
