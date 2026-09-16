import type { Metadata } from "next";
import { bySlug, calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "home-affordability",
  "Home Affordability Calculator",
  "Find out how much house you can afford. Enter your income, debts, and down payment to see a realistic price range, monthly payment, and debt-to-income ratio.",
  bySlug("home-affordability")?.keywords ?? [],
);

export default function Page() {
  return <Calculator />;
}
