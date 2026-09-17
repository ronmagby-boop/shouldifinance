import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "buy-now-or-save",
  "Compare buying now with a smaller deposit and PMI against saving longer for a bigger one, including how long the saving actually takes as prices move.",
);

export default function Page() {
  return <Calculator />;
}
