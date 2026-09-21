import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "heloc-debt-payoff",
  "Compare paying off high-interest debt with a HELOC against keeping it as is — the interest-only draw period, the payment jump when repayment starts, your combined loan-to-value, and what each way of paying it costs.",
);

export default function Page() {
  return <Calculator />;
}
