import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";

export const metadata: Metadata = calcMetadata(
  "mortgage-payment",
  "Mortgage Payment Calculator",
  "Estimate your monthly mortgage payment including principal, interest, property tax, insurance, and PMI, plus a five-year amortization schedule.",
  bySlug("mortgage-payment")?.keywords ?? [],
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
