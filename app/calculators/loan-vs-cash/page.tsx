import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "loan-vs-cash",
  "Finance or Pay Cash Calculator",
  "Decide whether to finance a car or pay cash. Compare loan interest against what your cash could earn if you invested it instead.",
  bySlug("loan-vs-cash")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
