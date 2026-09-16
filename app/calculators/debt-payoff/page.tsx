import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "debt-payoff",
  "Debt Payoff Calculator (Snowball vs. Avalanche)",
  "Enter all of your debts and compare the snowball and avalanche payoff methods. See your debt-free date, total interest, and the order to pay them off.",
  bySlug("debt-payoff")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
