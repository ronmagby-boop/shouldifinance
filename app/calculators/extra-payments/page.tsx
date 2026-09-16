import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "extra-payments",
  "Extra Mortgage Payment Calculator",
  "See how much interest and how many years an extra mortgage payment each month can save you, with a side-by-side payoff chart and break-even detail.",
  bySlug("extra-payments")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
