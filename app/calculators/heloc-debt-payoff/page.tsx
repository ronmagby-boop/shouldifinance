import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "heloc-debt-payoff",
  "Compare paying off high-interest debt with a HELOC against keeping it as is, including whether you have the equity and what securing the debt against your home means.",
);

export default function Page() {
  return <Calculator />;
}
