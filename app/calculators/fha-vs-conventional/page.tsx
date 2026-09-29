import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";
import { CalculatorSchema } from "../../components/JsonLd";

export const metadata: Metadata = calcMetadata(
  "fha-vs-conventional",
  "Compare an FHA loan against a conventional one: the upfront and annual mortgage insurance, what PMI costs instead, and the 90% threshold that decides whether FHA insurance ever comes off.",
);

export default function Page() {
  return (
    <>
      <CalculatorSchema slug="fha-vs-conventional" />
      <Calculator />
    </>
  );
}
