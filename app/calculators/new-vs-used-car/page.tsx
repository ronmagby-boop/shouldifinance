import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "new-vs-used-car",
  "Compare the true cost of a new car against a comparable used one over the years you keep it, including depreciation, interest, upkeep and resale value.",
);

export default function Page() {
  return <Calculator />;
}
