import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "required-rate-of-return",
  "Find the annual return you need to reach a savings goal on time, and see whether that return is realistic for your timeline and contributions.",
);

export default function Page() {
  return <Calculator />;
}
