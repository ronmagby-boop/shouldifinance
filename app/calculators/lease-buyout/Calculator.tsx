"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, has, n, type Num,
} from "../../components/Inputs";
import { analyze } from "../../lib/leaseBuyout";

type Pay = "cash" | "loan";

/** "$2,350 ahead" or "$650 behind". */
const aheadBehind = (v: number) => `${fmt(Math.abs(v))} ${v >= 0 ? "ahead" : "behind"}`;

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [optionFee, setOptionFee] = useState<Num>("");
  const [tax, setTax] = useState<Num>("");
  const [title, setTitle] = useState<Num>("");
  const [market, setMarket] = useState<Num>("");
  const [pay, setPay] = useState<Pay>("cash");
  const [apr, setApr] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [disposition, setDisposition] = useState<Num>("");
  const [milesOver, setMilesOver] = useState<Num>("");
  const [perMile, setPerMile] = useState<Num>("");
  const [wear, setWear] = useState<Num>("");
  const [comparable, setComparable] = useState<Num>("");

  const loadExample = () => {
    setPrice(20000);
    setOptionFee(300);
    setTax(6);
    setTitle(150);
    setMarket(21000);
    setPay("cash");
    setApr("");
    setTerm("");
    setDisposition(400);
    setMilesOver(6000);
    setPerMile(0.25);
    setWear("");
    setComparable(22000);
  };

  const clearExample = () => {
    for (const f of [setPrice, setOptionFee, setTax, setTitle, setMarket, setApr, setTerm, setDisposition, setMilesOver, setPerMile, setWear, setComparable]) f("");
    setPay("cash");
  };

  const r = useMemo(() => {
    if (!(n(price) > 0) || !(n(market) > 0)) return null;
    return analyze({
      buyoutPrice: n(price),
      optionFee: n(optionFee),
      taxRatePct: n(tax),
      titleFees: n(title),
      marketValue: n(market),
      dispositionFee: n(disposition),
      milesOver: n(milesOver),
      perMileCharge: n(perMile),
      excessWear: n(wear),
      comparablePrice: n(comparable) > 0 ? n(comparable) : null,
      loan: pay === "loan" && n(term) > 0 && has(apr) ? { apr: Math.max(0, n(apr)), months: n(term) } : null,
    });
  }, [price, optionFee, tax, title, market, pay, apr, term, disposition, milesOver, perMile, wear, comparable]);

  return (
    <CalcShell
      slug="lease-buyout"
      intro="At the end of a lease you can usually hand the car back or buy it at the price written in the contract. Buying it makes sense when the car is worth more than the all-in buyout cost, or when the charges for handing it back would eat the difference."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["lease-payment", "lease-vs-buy", "auto-loan-refinance", "depreciation"]}
      disclaimer="For educational purposes only. The buyout price is in your lease; fees, sales tax and title costs depend on your lessor and your state, and the market value is your own estimate. Sales tax is applied to the buyout price only; some states tax differently. Check every figure with your lessor before deciding."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Buying it out" className="h-full">
          <div className="space-y-4">
            <NumField
              label="Buyout price from the lease"
              value={price}
              onChange={setPrice}
              min={0}
              placeholder="20000"
              prefix="$"
              hint="The purchase option price, usually the residual value. Your lease must state it."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Purchase option fee" value={optionFee} onChange={setOptionFee} min={0} placeholder="300" prefix="$" />
              <NumField label="Title and registration" value={title} onChange={setTitle} min={0} placeholder="150" prefix="$" />
            </div>
            <NumField label="Sales tax on the buyout" value={tax} onChange={setTax} min={0} placeholder="6" suffix="%" step={0.25} hint="Your state's rate, which you enter: some states tax a buyout differently, so check." />
            <NumField
              label="What the car is worth"
              value={market}
              onChange={setMarket}
              min={0}
              placeholder="21000"
              prefix="$"
              hint="Your estimate. Get written offers from a few dealers or buyers, and compare listings for the same model, year and mileage."
            />
          </div>
        </Card>
        <Card title="Handing it back" className="h-full">
          <div className="space-y-4">
            <NumField label="Disposition fee" value={disposition} onChange={setDisposition} min={0} placeholder="400" prefix="$" hint="Charged at turn-in, if your lease has one; ask whether it is ever waived." />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Miles over the allowance" value={milesOver} onChange={setMilesOver} min={0} placeholder="6000" />
              <NumField label="Charge per mile" value={perMile} onChange={setPerMile} min={0} placeholder="0.25" prefix="$" step={0.05} />
            </div>
            <NumField label="Excess wear charges (estimate)" value={wear} onChange={setWear} min={0} placeholder="0" prefix="$" hint="Damage beyond the lease's wear standard. Ask your lessor whether it offers an inspection before turn-in." />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Paying for the buyout" className="h-full">
          <div className="space-y-4">
            <SelectField
              label="How you would pay"
              value={pay}
              onChange={(v) => setPay(v as Pay)}
              options={[{ value: "cash", label: "Cash" }, { value: "loan", label: "A loan" }]}
            />
            {pay === "loan" && (
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Loan APR" value={apr} onChange={setApr} min={0} placeholder="7" suffix="%" step={0.125} />
                <NumField label="Loan term" value={term} onChange={setTerm} min={0} placeholder="36" suffix="mo" />
              </div>
            )}
          </div>
        </Card>
        <Card title="Or replace it (optional)" className="h-full">
          <NumField
            label="Price of a similar used car"
            value={comparable}
            onChange={setComparable}
            min={0}
            placeholder="22000"
            prefix="$"
            hint="A car like yours you would buy instead; taxed and titled the same way."
          />
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Buying out against handing it back"
              value={r.buyoutAdvantage >= 0 ? `Buy out: ${fmt(r.buyoutAdvantage)} better` : `Return: ${fmt(-r.buyoutAdvantage)} better`}
              tone={r.buyoutAdvantage >= 0 ? "green" : "gray"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Buyout, all in" value={fmt(r.buyoutTotal)} sub={`price + fees + ${fmt(r.tax)} tax`} />
              <Stat label="Your equity" value={`${r.equity >= 0 ? "" : "−"}${fmt(Math.abs(r.equity))}`} tone={r.equity >= 0 ? "green" : "red"} sub="value − buyout total" />
              <Stat label="Return charges avoided" value={fmt(r.returnCosts)} sub={r.mileageCharge > 0 ? `incl. ${fmt(r.mileageCharge)} for miles` : undefined} />
              {r.financed ? (
                <Stat label="Monthly if financed" value={`${fmt(r.financed.monthly)}/mo`} sub={`${fmt(r.financed.totalInterest)} interest`} />
              ) : (
                <Stat label="Paid in cash" value={fmt(r.buyoutTotal)} />
              )}
            </div>
            <div className="space-y-2">
              <Takeaway tone={r.buyoutAdvantage >= 0 ? "green" : "blue"}>
                {r.equity >= 0 ? (
                  <>
                    The car is worth <strong>{fmt(r.equity)} more</strong> than the {fmt(r.buyoutTotal)} it costs to buy, and
                    buying out also avoids {fmt(r.returnCosts)} of turn-in charges: {aheadBehind(r.buyoutAdvantage)} by buying
                    out. Handing it back gives that equity to the lessor.
                  </>
                ) : r.buyoutAdvantage >= 0 ? (
                  <>
                    The car is worth {fmt(-r.equity)} less than the {fmt(r.buyoutTotal)} buyout, but handing it back would cost{" "}
                    {fmt(r.returnCosts)} in charges, mostly {r.mileageCharge >= r.returnCosts / 2 ? "for the extra miles" : "fees and wear"}.
                    Those charges are what make buying out <strong>{fmt(r.buyoutAdvantage)} better</strong>.
                  </>
                ) : (
                  <>
                    The car is worth <strong>{fmt(-r.equity)} less</strong> than the {fmt(r.buyoutTotal)} buyout, more than the{" "}
                    {fmt(r.returnCosts)} of charges you would avoid, so handing it back is {fmt(-r.buyoutAdvantage)} better. The
                    lessor takes the loss on the value.
                  </>
                )}
              </Takeaway>
              {r.comparable && (
                <Takeaway tone={r.comparable.savingFromBuyout >= 0 ? "green" : "amber"}>
                  Against returning it and buying a similar car for {fmt(n(comparable))}: that costs{" "}
                  {fmt(r.comparable.returnAndReplace)} with tax, title and the turn-in charges, against {fmt(r.buyoutTotal)} to keep
                  this one. Buying out {r.comparable.savingFromBuyout >= 0 ? "saves" : "costs"}{" "}
                  <strong>{fmt(Math.abs(r.comparable.savingFromBuyout))}</strong>, and you already know this car&apos;s history.
                  {(r.comparable.savingFromBuyout >= 0) !== (r.buyoutAdvantage >= 0) && (
                    <>
                      {" "}This differs from the verdict above because it counts the cash you spend on a car to drive, at a
                      dealer&apos;s price, while the verdict values this car at what it would sell for.
                    </>
                  )}
                </Takeaway>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the buyout price from your lease and what the car is worth.</EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Before you decide</h2>
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <p>
            <strong>The price is in your lease.</strong> Federal rules (Regulation M) require a lease to say whether you can
            buy the car and, at the end of the term, at what price. The lease must also state its wear and use standard and
            how any excess mileage charge is worked out, so the turn-in charges above can be read from it too.
          </p>
          <p>
            <strong>Policies vary, so ask.</strong> Whether the lessor charges a purchase option fee, whether a dealer or
            another buyer can buy the car from the lessor for you, and what the dealer adds on top are set by each lessor.
            Get the buyout figure and every fee in writing.
          </p>
          <p>
            <strong>You know this car.</strong> You know how it has been driven and maintained, which you cannot know about a
            used car from a stranger. Check how much of the manufacturer&apos;s warranty is left; the lease lists the warranties
            that apply.
          </p>
          <p>
            <strong>Financing.</strong> A buyout can be financed like a used-car purchase, and rates vary by lender, so compare
            offers. To see what a lower rate would save later, use the{" "}
            <Link href="/calculators/auto-loan-refinance" className="text-green-700 underline">car loan refinance calculator</Link>.
            For how the original payment was built, see the{" "}
            <Link href="/calculators/lease-payment" className="text-green-700 underline">lease payment calculator</Link>.
          </p>
        </div>
      </div>
    </CalcShell>
  );
}
