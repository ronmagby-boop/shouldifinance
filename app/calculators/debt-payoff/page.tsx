import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "debt-payoff",
  "Enter all of your debts and compare the snowball and avalanche payoff methods. See your debt-free date, total interest, and the order to pay them off.",
);

export default function Page() {
  return <Calculator />;
}
