import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "retirement-savings",
  "Retirement Savings Calculator",
  "Find out if you are on track for retirement. Project your nest egg, estimate your monthly retirement income, and see how long your savings will last.",
  bySlug("retirement-savings")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
