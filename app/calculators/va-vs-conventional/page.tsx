import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "va-vs-conventional",
  "Compare a VA loan and a conventional loan side by side: monthly payment, cash at closing, the VA funding fee against PMI, and total interest over the life of each.",
);

export default function Page() {
  return <Calculator />;
}
