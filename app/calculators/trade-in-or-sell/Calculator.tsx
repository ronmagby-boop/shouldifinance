"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, n, type Num,
} from "../../components/Inputs";
import { analyze, type TaxCredit } from "../../lib/tradeIn";

export default function Calculator() {
  const [offer, setOffer] = useState<Num>("");
  const [privatePrice, setPrivatePrice] = useState<Num>("");
  const [nextPrice, setNextPrice] = useState<Num>("");
  const [tax, setTax] = useState<Num>("");
  const [credit, setCredit] = useState<TaxCredit>("unsure");
  const [payoff, setPayoff] = useState<Num>("");
  const [costs, setCosts] = useState<Num>("");
  const [time, setTime] = useState<Num>("");

  const loadExample = () => {
    setOffer(15000); setPrivatePrice(16000); setNextPrice(30000); setTax(7); setCredit("yes");
    setPayoff(""); setCosts(300); setTime("");
  };

  const clearExample = () => {
    for (const f of [setOffer, setPrivatePrice, setNextPrice, setTax, setPayoff, setCosts, setTime]) f("");
    setCredit("unsure");
  };

  const r = useMemo(() => {
    if (!(n(offer) > 0) || !(n(privatePrice) > 0)) return null;
    return analyze({
      tradeOffer: n(offer),
      privatePrice: n(privatePrice),
      nextCarPrice: n(nextPrice),
      taxRatePct: n(tax),
      taxCredit: credit,
      payoff: n(payoff),
      privateCosts: n(costs),
      timeValue: n(time),
    });
  }, [offer, privatePrice, nextPrice, tax, credit, payoff, costs, time]);

  const winner = r && (Math.abs(r.privateAdvantage) < 1 ? "even" : r.privateAdvantage > 0 ? "private" : "trade");

  return (
    <CalcShell
      slug="trade-in-or-sell"
      intro="A dealer pays less than a private buyer, but a trade-in is quick, and in many states it lowers the sales tax on your next car. See which leaves you more, the private price you would need to come out ahead, and what owing more than the car is worth changes."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["depreciation", "car-loan-payoff", "auto-affordability", "new-vs-used-car"]}
      disclaimer="For educational purposes only. Whether a trade-in lowers your sales tax, and how, depends on your state; check with your state's revenue or motor vehicle department. Offers, private prices and costs are your own estimates. Not legal or tax advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your car" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Trade-in offer" value={offer} onChange={setOffer} min={0} placeholder="15000" prefix="$" hint="Get offers from more than one dealer." />
              <NumField label="Private sale price" value={privatePrice} onChange={setPrivatePrice} min={0} placeholder="16000" prefix="$" hint="What you expect to get, not the asking price." />
            </div>
            <NumField label="Owed on it (payoff)" value={payoff} onChange={setPayoff} min={0} placeholder="0" prefix="$" hint="The payoff amount from your lender, which can differ from your statement balance. 0 if it is paid off." />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Private sale costs" value={costs} onChange={setCosts} min={0} placeholder="300" prefix="$" hint="Listing, detailing, inspection, title fees." />
              <NumField label="Your time (optional)" value={time} onChange={setTime} min={0} placeholder="0" prefix="$" hint="What showing and selling it is worth to you." />
            </div>
          </div>
        </Card>
        <Card title="The next car and the tax" badge="STATE-SPECIFIC" badgeTone="amber" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Next car's price" value={nextPrice} onChange={setNextPrice} min={0} placeholder="30000" prefix="$" />
              <NumField label="Sales tax rate" value={tax} onChange={setTax} min={0} placeholder="7" suffix="%" step={0.25} hint="Your state and local rate." />
            </div>
            <SelectField
              label="Does your state tax only the price after the trade-in?"
              value={credit}
              onChange={(v) => setCredit(v as TaxCredit)}
              options={[
                { value: "yes", label: "Yes, the trade-in reduces the taxed price" },
                { value: "no", label: "No, the full price is taxed" },
                { value: "unsure", label: "Not sure" },
              ]}
              hint="States differ, and some cap or exclude the credit. Check your state's revenue or motor vehicle department."
            />
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Which leaves you more"
              value={winner === "even" ? "About even" : winner === "private" ? `Sell privately: ${fmt(r.privateAdvantage)} more` : `Trade in: ${fmt(-r.privateAdvantage)} more`}
              tone={winner === "even" ? "gray" : "green"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="From the trade-in" value={fmt(r.tradeNet)} sub={r.taxSaving > 0 ? `incl. ${fmt(r.taxSaving)} of tax saved` : "no tax saving counted"} />
              <Stat label="From a private sale" value={fmt(r.privateNet)} sub={`after ${fmt(n(costs) + n(time))} of costs${n(time) > 0 ? " and time" : ""}`} />
              <Stat label="Private price to beat the trade-in" value={fmt(r.breakEvenPrivatePrice)} />
              <Stat label="Tax the trade-in saves" value={fmt(r.withCredit.taxSaving)} sub={credit === "no" ? "not counted: your state taxes the full price" : credit === "unsure" ? "if your state allows it" : "your state allows it"} />
            </div>
            <div className="space-y-2">
              <Takeaway tone="blue">
                {winner === "trade"
                  ? <>The trade-in leaves more: the dealer pays {fmt(n(privatePrice) - n(offer))} less than a private buyer, but {r.taxSaving > 0 ? `the ${fmt(r.taxSaving)} tax saving and ` : ""}the {fmt(n(costs) + n(time))} a private sale costs make up the gap.</>
                  : winner === "private"
                    ? <>Selling privately leaves {fmt(r.privateAdvantage)} more, as long as a buyer pays about {fmt(n(privatePrice))}. Below {fmt(r.breakEvenPrivatePrice)} the trade-in wins.</>
                    : <>The two are about even; the trade-in&apos;s speed and simplicity may decide it.</>}
              </Takeaway>
              {credit === "unsure" && (
                <Takeaway tone="amber">
                  The headline assumes your state taxes only the price after the trade-in. If it taxes the full price, selling
                  privately {r.withoutCredit.privateAdvantage >= 0 ? `leaves ${fmt(r.withoutCredit.privateAdvantage)} more` : `still leaves ${fmt(-r.withoutCredit.privateAdvantage)} less`}.
                  Checking your state&apos;s rule is worth {fmt(r.withCredit.taxSaving)} here.
                </Takeaway>
              )}
              {n(payoff) > 0 && (
                <Takeaway tone={r.negativeEquity ? "red" : "blue"}>
                  {r.negativeEquity ? (
                    <>
                      You owe {fmt(n(payoff))}, more than either sale brings in: a shortfall of{" "}
                      <strong>{fmt(r.tradeShortfall)}</strong> on the trade-in and {fmt(r.privateShortfall)} privately. A dealer may
                      offer to roll the shortfall into the next loan, which makes that loan more expensive. Paying it off, or waiting
                      until you owe less, avoids carrying it forward; the{" "}
                      <Link href="/calculators/depreciation" className="underline">car value calculator</Link> shows when your
                      balance falls below the car&apos;s value.
                    </>
                  ) : (
                    <>
                      The {fmt(n(payoff))} still owed comes out of either sale, so it does not change which wins. Selling
                      privately, the buyer will need the title, which your lender holds until the loan is paid off.
                    </>
                  )}
                </Takeaway>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the trade-in offer and the private price you expect.</EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Selling privately with a loan on the car</h2>
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <p>
            <strong>Get the payoff amount</strong> from your lender, not the balance on your statement: interest and fees can
            make them differ.
          </p>
          <p>
            <strong>Agree how the lien is cleared.</strong> The lender holds the title until it is paid. A common route is to
            complete the sale at the lender or a bank, where the buyer&apos;s payment clears the loan and the lender releases the
            title. Ask your lender how it handles a private sale.
          </p>
          <p>
            <strong>Transfer the title and registration</strong> under your state&apos;s rules; your motor vehicle department
            lists what both sides must sign and file.
          </p>
          <p>
            <strong>Be careful with payment.</strong> Take payment you can verify before handing over the car and title, such as
            a cashier&apos;s check confirmed with the issuing bank, and meet somewhere public.
          </p>
          <p>
            Trading in instead? Confirm afterwards that the dealer paid off your old loan, and keep the trade-in out of the new
            loan if you owe more than it is worth. For financing the next car, see the{" "}
            <Link href="/calculators/loan-vs-cash" className="text-green-700 underline">finance or pay cash calculator</Link>.
          </p>
        </div>
      </div>
    </CalcShell>
  );
}
