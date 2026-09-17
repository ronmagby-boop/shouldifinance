import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "retirement-savings",
  "Find out if you are on track for retirement. Project your nest egg, estimate your monthly retirement income, and see how long your savings will last.",
);

export default function Page() {
  return <Calculator />;
}
