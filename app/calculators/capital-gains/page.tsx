import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "capital-gains",
  "Estimate federal and state capital gains tax on an investment sale, and see exactly what holding for long-term rates would save you.",
);

export default function Page() {
  return <Calculator />;
}
