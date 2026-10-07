import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";
import { FRED_NOTICE, PRIME } from "../../lib/rates";

export const metadata: Metadata = calcMetadata(
  "home-equity-loan-vs-heloc",
  "Compare a fixed-rate home equity loan with a variable HELOC: monthly payments over time, cost over your horizon, the break-even Fed move, and what rate changes would do.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="home-equity-loan-vs-heloc" />
      {/* Prime is read here, on the server at build time, and passed down, as on
          the HELOC or cash-out calculator. */}
      <Calculator prime={PRIME && { text: PRIME.text, dateLabel: PRIME.dateLabel }} fredNotice={FRED_NOTICE} />
    </>
  );
}
