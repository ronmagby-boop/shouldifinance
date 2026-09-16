import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "required-rate-of-return",
  "Required Rate of Return Calculator",
  "Find the annual return you need to reach a savings goal on time, and see whether that return is realistic for your timeline and contributions.",
  bySlug("required-rate-of-return")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
