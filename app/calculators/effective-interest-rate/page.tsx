import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "effective-interest-rate",
  "Effective Interest Rate Calculator",
  "Convert a quoted rate plus points and fees into the effective rate you actually pay, and compare nominal rates against the true annual percentage yield.",
  bySlug("effective-interest-rate")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
