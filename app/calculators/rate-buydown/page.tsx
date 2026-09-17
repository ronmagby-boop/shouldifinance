import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "rate-buydown",
  "Work out whether paying discount points is worth it, with the exact break-even month and what you are ahead or behind by the time you sell or refinance.",
);

export default function Page() {
  return <Calculator />;
}
