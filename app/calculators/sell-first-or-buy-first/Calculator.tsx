"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment, balanceAfter, typicalMonthlyRent } from "../../lib/finance";

/** Typical annual PMI as a percent of the loan, by loan-to-value band. */
function pmiRate(ltv: number): number {
  if (ltv <= 80) return 0;
  if (ltv <= 85) return 0.32;
  if (ltv <= 90) return 0.52;
  if (ltv <= 95) return 0.78;
  return 1.03;
}

/**
 * Selling first can free up more cash than anyone would actually put down.
 * Capping the down payment at 20% stops the comparison assuming a household
 * empties its savings into the house: 20% is where PMI stops, so there is no
 * mortgage-cost reason to go past it, and anything above the cap stays liquid.
 */
const DOWN_PAYMENT_CAP = 0.2;

export default function Calculator() {
  const [value, setValue] = useState<Num>("");
  const [balance, setBalance] = useState<Num>("");
  const [sellPct, setSellPct] = useState<Num>("");
  const [newPrice, setNewPrice] = useState<Num>("");
  const [otherCash, setOtherCash] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [interimMonthly, setInterimMonthly] = useState<Num>("");
  const [interimMonths, setInterimMonths] = useState<Num>("");
  const [recast, setRecast] = useState(false);

  const loadExample = () => {
    setValue(480000);
    setBalance(340000);
    setSellPct(6);
    setNewPrice(610000);
    setOtherCash(60000);
    setRate(6.5);
    setTerm(30);
    setInterimMonthly(typicalMonthlyRent(480000));
    setInterimMonths(2);
    setRecast(false);
  };

  const r = useMemo(() => {
    const V = n(value);
    const NP = n(newPrice);
    const term_m = Math.round(n(term) * 12);
    if (V <= 0 || NP <= 0 || term_m <= 0 || n(rate) <= 0) return null;

    const sellingCosts = V * (Math.max(0, n(sellPct)) / 100);
    const netProceeds = V - sellingCosts - n(balance);
    const gap = Math.max(0, Math.round(n(interimMonths)));

    /**
     * The two paths differ in one structural way: when the sale closes relative
     * to the purchase. That decides how much cash can reach the down payment,
     * which decides the loan, which decides the payment for the rest of the term.
     */
    const priceFor = (down: number) => {
      const loan = Math.max(0, NP - down);
      const ltv = NP > 0 ? (loan / NP) * 100 : 0;
      const pmiPct = pmiRate(ltv);
      const pmiMonthly = (loan * (pmiPct / 100)) / 12;
      const pi = payment(loan, n(rate), term_m);
      return { down, loan, ltv, pmiPct, pmiMonthly, pi, monthly: pi + pmiMonthly };
    };

    // Buy first: the old home has not sold, so only savings reach closing.
    const buy = priceFor(Math.min(Math.max(0, n(otherCash)), NP));

    // Sell first: proceeds land before closing, but capped — see the constant.
    const availableSellFirst = Math.max(0, netProceeds) + Math.max(0, n(otherCash));
    const capAmount = NP * DOWN_PAYMENT_CAP;
    const sell = priceFor(Math.min(availableSellFirst, capAmount));
    const cashLeftOver = Math.max(0, availableSellFirst - sell.down);

    const monthlyGap = buy.monthly - sell.monthly;
    const interimTotal = Math.max(0, n(interimMonthly)) * gap;
    // How long the permanent premium takes to cost what the interim costs once.
    const monthsToEqual = monthlyGap > 0 ? interimTotal / monthlyGap : null;

    /**
     * Recasting: once the old home sells, the proceeds go against the new loan
     * and the payment is recalculated over what is left of the term, at the
     * original rate. It is not a refinance — the note stays put.
     */
    const balanceAtSale = balanceAfter(buy.loan, n(rate), term_m, gap);
    const recastBalance = Math.max(0, balanceAtSale - Math.max(0, netProceeds));
    const remainingTerm = Math.max(1, term_m - gap);
    const recastPi = payment(recastBalance, n(rate), remainingTerm);
    const recastLtv = NP > 0 ? (recastBalance / NP) * 100 : 0;
    const recastPmiPct = pmiRate(recastLtv);
    const recastPmi = (recastBalance * (recastPmiPct / 100)) / 12;
    const recastMonthly = recastPi + recastPmi;
    const recastGap = recastMonthly - sell.monthly;

    return {
      sellingCosts, netProceeds, equity: V - n(balance),
      buy, sell, cashLeftOver, capAmount, availableSellFirst,
      monthlyGap, interimTotal, monthsToEqual, gap,
      lifetimeGap: monthlyGap * term_m,
      balanceAtSale, recastBalance, remainingTerm, recastPi, recastLtv,
      recastPmiPct, recastPmi, recastMonthly, recastGap,
    };
  }, [value, balance, sellPct, newPrice, otherCash, rate, term, interimMonthly, interimMonths]);

  return (
    <CalcShell
      slug="sell-first-or-buy-first"
      intro="The order you do this in decides how much cash reaches the closing table, and that decides your loan. Buy first and only your savings are available, because your equity is still locked in the unsold home. Sell first and the proceeds come too — a smaller loan and a lower payment, but you pay for somewhere to live in between."
      onExample={loadExample}
      relatedSlugs={["home-affordability", "mortgage-payment", "rent-vs-buy"]}
      disclaimer="For educational purposes only. PMI bands are typical figures rather than a quote, recasting is not offered on every loan, and a sale that falls through changes everything. Talk to an agent and a lender about what is realistic where you are buying."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The home you're selling" badge="CURRENT">
          <div className="space-y-4">
            <NumField label="What it's worth" value={value} onChange={setValue} placeholder="480000" prefix="$" />
            <NumField label="Mortgage still owed" value={balance} onChange={setBalance} placeholder="340000" prefix="$" />
            <NumField
              label="Selling costs"
              value={sellPct}
              onChange={setSellPct}
              placeholder="6"
              suffix="%"
              hint="Agent commission, transfer taxes and the usual concessions — commonly 6–9%."
            />
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Net proceeds</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.netProceeds)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The home you're buying" badge="NEXT" badgeTone="blue">
          <div className="space-y-4">
            <NumField label="Price" value={newPrice} onChange={setNewPrice} placeholder="610000" prefix="$" />
            <NumField
              label="Savings you can use"
              value={otherCash}
              onChange={setOtherCash}
              placeholder="60000"
              prefix="$"
              hint="Cash on hand, not counting anything tied up in the current home. Buying first, this is all you have."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate" value={rate} onChange={setRate} placeholder="6.5" suffix="%" step={0.125} />
              <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Housing between closings"
                value={interimMonthly}
                onChange={setInterimMonthly}
                placeholder={String(typicalMonthlyRent(n(value) || 480000))}
                prefix="$"
                suffix="/mo"
              />
              <NumField label="Months between" value={interimMonths} onChange={setInterimMonths} placeholder="2" suffix="mo" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Only selling first is charged this — a rent-back, a short let or storage while you find the
              next place. Enter 0 if you would stay with family.
            </p>
            <Toggle checked={recast} onChange={setRecast}>
              Recast the new loan once the old home sells
            </Toggle>
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Sell first</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.sell.monthly)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtK(r.sell.loan)} loan</p>
              </div>
              <div className={`p-4 text-center ${r.monthlyGap > 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-white/70 mb-0.5">
                  {r.monthlyGap > 0 ? "Buying first costs" : "Selling first costs"}
                </p>
                <p className="text-2xl font-medium text-white">{fmt(Math.abs(r.monthlyGap))}/mo</p>
                <p className="text-xs text-white/70">more, every month</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Buy first</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.buy.monthly)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtK(r.buy.loan)} loan</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="Sell first — monthly payment" value={fmt(r.sell.monthly)} tone="green" />
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  label="Down payment"
                  value={fmt(r.sell.down)}
                  tone="green"
                  sub={r.cashLeftOver > 0 ? `${fmt(r.cashLeftOver)} stays liquid` : "proceeds plus savings"}
                />
                <Stat label="Loan amount" value={fmtK(r.sell.loan)} sub={`${pct(r.sell.ltv, 1)} of the price`} />
                <Stat
                  label="PMI"
                  value={r.sell.pmiPct > 0 ? `${fmt(r.sell.pmiMonthly)}/mo` : "None"}
                  tone={r.sell.pmiPct > 0 ? "amber" : "green"}
                  sub={r.sell.pmiPct > 0 ? `${r.sell.pmiPct}%/yr at this LTV` : "20% down or more"}
                />
                <Stat label="Interim housing" value={fmt(r.interimTotal)} tone="amber" sub={`${fmtMonths(r.gap)} between closings`} />
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline
                label="Buy first — monthly payment"
                value={fmt(r.buy.monthly)}
                tone={r.monthlyGap > 0 ? "red" : "green"}
              />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Down payment" value={fmt(r.buy.down)} sub="savings only — equity is locked" />
                <Stat label="Loan amount" value={fmtK(r.buy.loan)} sub={`${pct(r.buy.ltv, 1)} of the price`} />
                <Stat
                  label="PMI"
                  value={r.buy.pmiPct > 0 ? `${fmt(r.buy.pmiMonthly)}/mo` : "None"}
                  tone={r.buy.pmiPct > 0 ? "amber" : "green"}
                  sub={r.buy.pmiPct > 0 ? `${r.buy.pmiPct}%/yr at this LTV` : "20% down or more"}
                />
                <Stat label="Interim housing" value="None" tone="green" sub="you move once" />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Permanent against temporary"
              value={`${fmt(Math.abs(r.monthlyGap))}/mo vs ${fmt(r.interimTotal)} once`}
              tone="gray"
            />
            <Takeaway tone={r.monthlyGap > 0 ? "amber" : "blue"}>
              {r.monthlyGap > 0 ? (
                <>
                  Buying first leaves you with a <strong>{fmt(Math.abs(r.monthlyGap))}</strong> higher
                  payment for the whole term — <strong>{fmtK(r.lifetimeGap)}</strong> over {n(term)}{" "}
                  years — because only your savings reach the closing table. Selling first costs{" "}
                  <strong>{fmt(r.interimTotal)}</strong> once, and then it is over.
                  {r.monthsToEqual !== null && (
                    <>
                      {" "}
                      The interim housing is worth about{" "}
                      <strong>{r.monthsToEqual.toFixed(1)} months</strong> of the higher payment; past
                      that, buying first is the dearer choice for as long as you keep the loan.
                    </>
                  )}
                </>
              ) : (
                <>
                  Your savings alone already fund as much of this purchase as the sale would, so buying
                  first costs you nothing extra each month. The interim housing you would pay selling
                  first — <strong>{fmt(r.interimTotal)}</strong> — is avoidable here.
                </>
              )}
            </Takeaway>
          </div>

          {recast && (
            <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
              <Headline
                label="Buy first, then recast — monthly payment"
                value={fmt(r.recastMonthly)}
                tone={r.recastGap < 0 ? "green" : "gray"}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <Stat label="Balance at the sale" value={fmtK(r.balanceAtSale)} sub={`after ${fmtMonths(r.gap)}`} />
                <Stat label="Proceeds applied" value={fmt(r.netProceeds)} tone="green" />
                <Stat label="New balance" value={fmtK(r.recastBalance)} sub={`${pct(r.recastLtv, 1)} of the price`} />
                <Stat label="Recalculated over" value={fmtMonths(r.remainingTerm)} sub="same rate, same loan" />
              </div>
              <Takeaway tone={r.recastGap < 0 ? "green" : "blue"}>
                Recasting drops the payment from <strong>{fmt(r.buy.monthly)}</strong> to{" "}
                <strong>{fmt(r.recastMonthly)}</strong>
                {r.recastGap < 0 ? (
                  <>
                    {" "}
                    — <strong>{fmt(Math.abs(r.recastGap))}</strong> a month below the sell-first payment.
                    That is not a trick: recasting puts the whole{" "}
                    <strong>{fmt(r.netProceeds)}</strong> into the loan, while selling first stops at{" "}
                    {fmt(r.sell.down)} and keeps <strong>{fmt(r.cashLeftOver)}</strong> liquid. Buying
                    first and recasting buys the lower payment with money selling first would have left
                    in your pocket.
                  </>
                ) : (
                  <>
                    , which is still <strong>{fmt(r.recastGap)}</strong> a month above selling first.
                  </>
                )}
              </Takeaway>
            </div>
          )}

          <ChartCard
            title="What you pay each month"
            footnote="Principal, interest and any mortgage insurance. The interim housing selling first is not here — it is a one-time cost, not a monthly one."
          >
            <BarChart
              ariaLabel="Monthly payment when selling first compared with buying first"
              height={200}
              bars={[
                {
                  label: "Sell first",
                  segments: [
                    { label: "Principal & interest", value: r.sell.pi, color: COLORS.green },
                    { label: "PMI", value: r.sell.pmiMonthly, color: COLORS.red },
                  ],
                },
                {
                  label: "Buy first",
                  segments: [
                    { label: "Principal & interest", value: r.buy.pi, color: COLORS.blue },
                    { label: "PMI", value: r.buy.pmiMonthly, color: COLORS.red },
                  ],
                },
                ...(recast
                  ? [
                      {
                        label: "Buy first, recast",
                        segments: [
                          { label: "After recasting", value: r.recastPi, color: COLORS.teal },
                          { label: "PMI", value: r.recastPmi, color: COLORS.red },
                        ],
                      },
                    ]
                  : []),
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">How people actually bridge the gap</h2>
            <div className="space-y-2">
              <Takeaway tone="amber">
                <strong>Buying first</strong> means finding the down payment while your equity is still
                in the old house. A HELOC opened <em>before</em> you list is the usual route and the
                cheapest, though most lenders will not open one once the home is on the market. A bridge
                loan does the same job faster and dearer. Some people borrow against a retirement
                account. Or you make the offer contingent on your sale — that costs nothing in dollars,
                but in a competitive market it can lose you the house, which is a real price even though
                no calculator can put a number on it.
              </Takeaway>
              <Takeaway tone="green">
                <strong>Selling first</strong> means somewhere to live in between. Ask your buyer for a
                rent-back — you stay on after closing and pay them rent, often at their carrying cost.
                Many sellers never think to ask, and it is usually the cheapest interim housing there
                is. Failing that, a short-term rental, and storage for whatever will not fit.
              </Takeaway>
              <Takeaway tone="blue">
                Your equity of <strong>{fmt(r.equity)}</strong> becomes{" "}
                <strong>{fmt(r.netProceeds)}</strong> after {pct(n(sellPct), 1)} in selling costs. That gap
                of <strong>{fmt(r.sellingCosts)}</strong> is the number most people forget.
              </Takeaway>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">About recasting</h2>
            <Takeaway tone="blue">
              If you buy first, you do not have to live with the bigger payment for long. Once the old
              home sells, many lenders will let you put the proceeds against the new loan and
              recalculate the payment over what is left of the term, keeping your original rate. It is
              not a refinance: same loan, same note, no new underwriting. Expect a lump-sum minimum —
              often around $10,000 — and a processing fee, usually a few hundred dollars. It is not
              available on every loan; FHA, VA and USDA loans generally cannot be recast, and jumbo
              rules vary by lender. Ask before you close on the new home rather than after, because the
              answer may change which order makes sense for you.
            </Takeaway>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Enter your current home&apos;s value, the price of the next one, and your rate to compare the
            two payments.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
