import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "ev-savings",
  "Compare an electric car against a gas car on fuel, maintenance, and incentives to find your break-even point and lifetime savings.",
);

export default function Page() {
  return <Calculator />;
}
