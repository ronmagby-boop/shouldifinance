import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "effective-interest-rate",
  "Convert a quoted rate plus points and fees into the effective rate you actually pay, and compare nominal rates against the true annual percentage yield.",
);

export default function Page() {
  return <Calculator />;
}
