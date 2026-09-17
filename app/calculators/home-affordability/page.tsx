import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "home-affordability",
  "Find out how much house you can afford. Enter your income, debts, and down payment to see a realistic price range, monthly payment, and debt-to-income ratio.",
);

export default function Page() {
  return <Calculator />;
}
