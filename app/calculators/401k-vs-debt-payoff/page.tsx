import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "401k-vs-debt-payoff",
  "Compare putting spare money into a 401k against paying down debt faster, including the value of any employer match you are not yet capturing.",
);

export default function Page() {
  return <Calculator />;
}
