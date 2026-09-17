import type { Metadata } from "next";
import { calcMetadata } from "../../lib/calculators";
import Calculator from "./Calculator";

export const metadata: Metadata = calcMetadata(
  "depreciation",
  "Estimate what your vehicle will be worth each year, and find out when your loan balance drops below the car's value so you are no longer underwater.",
);

export default function Page() {
  return <Calculator />;
}
