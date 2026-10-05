import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";
import { FRED_NOTICE, PRIME } from "../../lib/rates";

export const metadata: Metadata = calcMetadata(
  "heloc-vs-cash-out",
  "Compare a HELOC with a cash-out refinance: payments, cost over your horizon, the blended rate, the break-even HELOC rate, and what Fed moves would do.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="heloc-vs-cash-out" />
      {/* Prime is read here, on the server at build time, and passed down, so the
          freshness check runs once and the client never re-evaluates it. */}
      <Calculator prime={PRIME && { text: PRIME.text, dateLabel: PRIME.dateLabel }} fredNotice={FRED_NOTICE} />
    </>
  );
}
