import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "loan-vs-cash",
  "Decide whether to finance a car or pay cash. Compare loan interest against what your cash could earn if you invested it instead.",
);

export default function Page() {
  return <Calculator />;
}
