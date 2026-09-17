import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "sell-first-or-buy-first",
  "Compare selling your home before buying the next one against buying first with a bridge loan, with the cash each path needs and the risks involved.",
);

export default function Page() {
  return <Calculator />;
}
