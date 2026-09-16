import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "investment-growth",
  "Investment Growth Calculator",
  "Project your portfolio with regular contributions, investment fees, and inflation so you can see what your money is really worth at the end.",
  bySlug("investment-growth")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
