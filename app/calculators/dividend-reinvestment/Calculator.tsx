"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";

/** Dividends and share prices are quoted in cents, so fmt()'s whole dollars
 *  turned $1.60 into "$2" and made a growth sentence read as nonsense. */
const perShare = (v: number) => `$${v.toFixed(2)}`;

export default function Calculator() {
  const [invested, setInvested] = useState<Num>("");
  const [price, setPrice] = useState<Num>("");
  const [yieldPct, setYieldPct] = useState<Num>("");
  const [divGrowth, setDivGrowth] = useState<Num>("");
  const [priceGrowth, setPriceGrowth] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [contribution, setContribution] = useState<Num>("");
  const [taxRate, setTaxRate] = useState<Num>("");
  const [taxable, setTaxable] = useState(false);

  const loadExample = () => {
    setInvested(25000);
    setPrice(50);
    setYieldPct(3.2);
    setDivGrowth(6);
    setPriceGrowth(5);
    setYears(20);
    setContribution(200);
    setTaxRate(15);
    setTaxable(true);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setInvested("");
    setPrice("");
    setYieldPct("");
    setDivGrowth("");
    setPriceGrowth("");
    setYears("");
    setContribution("");
    setTaxRate("");
    setTaxable(false);
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (yrs <= 0 || n(invested) <= 0 || n(price) <= 0) return null;

    const taxMult = taxable ? 1 - n(taxRate) / 100 : 1;
    let shares = n(invested) / n(price);
    let sharesNoDrip = shares;
    let sharePrice = n(price);
    let annualDivPerShare = (n(price) * n(yieldPct)) / 100;
    let cashCollected = 0;
    let dripDividends = 0;
    let dripGross = 0;
    let contributed = n(invested);

    /* Growth rates are left unbounded because a falling dividend and a falling
     * share price are both real. The arithmetic still has to survive them: a
     * price factor below -100% would take a twelfth root of a negative number,
     * and a share price of zero is a divisor. */
    const priceFactor = Math.pow(Math.max(0.0001, 1 + n(priceGrowth) / 100), 1 / 12);
    const PRICE_FLOOR = 0.01;
    /**
     * Dividend growth and price growth are separate inputs, so nothing stops a
     * combination no company could produce: hold the dividend flat and drop
     * the price 99% a year and each share ends up paying many times its own
     * value, which the reinvestment then compounds. That printed $5.93e+109M.
     *
     * The tell is the yield those two inputs imply by the end. Past this the
     * arithmetic still runs but it is not describing a stock, so the page says
     * so rather than showing the number.
     */
    const MAX_PLAUSIBLE_YIELD = 100;

    const dripValues = [n(invested)];
    const cashValues = [n(invested)];
    const incomeByYear: number[] = [];

    for (let y = 1; y <= yrs; y++) {
      // Quarterly dividends, reinvested at the prevailing price.
      for (let q = 0; q < 4; q++) {
        const divPerShare = annualDivPerShare / 4;
        const gross = shares * divPerShare;
        /* Only the after-tax dividend buys shares — no outside money is used
         * to pay the tax. The cash side is taxed the same way below, so
         * neither path is quietly subsidised by the other. */
        const net = gross * taxMult;
        dripGross += gross;
        dripDividends += net;
        shares += net / sharePrice;

        cashCollected += sharesNoDrip * divPerShare * taxMult;

        // Monthly new money goes in either way.
        for (let m = 0; m < 3; m++) {
          if (n(contribution) > 0) {
            shares += n(contribution) / sharePrice;
            sharesNoDrip += n(contribution) / sharePrice;
            contributed += n(contribution);
          }
          sharePrice = Math.max(PRICE_FLOOR, sharePrice * priceFactor);
        }
      }
      // A dividend can be cut to nothing but not below it.
      annualDivPerShare = Math.max(0, annualDivPerShare * (1 + n(divGrowth) / 100));
      dripValues.push(shares * sharePrice);
      cashValues.push(sharesNoDrip * sharePrice + cashCollected);
      incomeByYear.push(shares * annualDivPerShare * taxMult);
    }

    const impliedYield = (annualDivPerShare / Math.max(PRICE_FLOOR, sharePrice)) * 100;
    if (impliedYield > MAX_PLAUSIBLE_YIELD) {
      return { collapsed: true as const, impliedYield, endPrice: sharePrice, endDiv: annualDivPerShare };
    }

    const dripFinal = shares * sharePrice;
    const cashFinal = sharesNoDrip * sharePrice + cashCollected;
    const finalIncome = shares * annualDivPerShare;

    /* Yield on cost, honestly.
     *
     * This used to be income / contributed — the dividends thrown off by every
     * share, over only the money paid in from outside. The shares bought with
     * reinvested dividends counted in the numerator and cost nothing in the
     * denominator, which is how a 3.2% starter turned into 12.47%.
     *
     * Reinvested dividends are part of the basis: in a taxable account they
     * have already been taxed, and they bought the shares at the prevailing
     * price like any other purchase. */
    const costBasis = contributed + dripDividends;
    const yieldOnCost = (finalIncome / Math.max(1, costBasis)) * 100;
    /* The textbook figure, and a different question: what one share bought on
     * day one now pays against what it cost. Dividend growth alone drives it,
     * which is why it is the higher of the two. */
    const yieldOnOriginal = (annualDivPerShare / Math.max(0.0001, n(price))) * 100;

    return {
      collapsed: false as const,
      dripFinal,
      cashFinal,
      advantage: dripFinal - cashFinal,
      shares,
      sharesNoDrip,
      sharePrice,
      dripDividends,
      dripGross,
      taxPaid: dripGross - dripDividends,
      cashCollected,
      contributed,
      costBasis,
      finalIncome,
      finalDivPerShare: annualDivPerShare,
      monthlyIncome: finalIncome / 12,
      yieldOnCost,
      yieldOnOriginal,
      extraShares: shares - sharesNoDrip,
      dripValues,
      cashValues,
      incomeByYear,
    };
  }, [invested, price, yieldPct, divGrowth, priceGrowth, years, contribution, taxRate, taxable]);

  return (
    <CalcShell
      slug="dividend-reinvestment"
      intro="A dividend reinvestment plan — a DRIP — puts each dividend straight back into more shares of the same holding, fractions included, instead of paying it out as cash; most brokerages offer it as a setting and usually charge nothing for it. Those extra shares pay dividends of their own, so compare letting that compound against taking the money, and see what the position yields against everything you have put in."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["compound-interest", "investment-growth", "capital-gains"]}
      disclaimer="For educational purposes only. Assumes dividends are paid quarterly and grow at a steady rate — companies can and do cut dividends. Share price growth is an assumption, not a forecast. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your position" badge="INPUTS">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Amount invested" value={invested} onChange={setInvested} min={0} placeholder="25000" prefix="$" />
              <NumField label="Share price" value={price} onChange={setPrice} min={0} placeholder="50" prefix="$" step={0.01} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Dividend yield"
                value={yieldPct}
                onChange={setYieldPct}
                min={0}
                placeholder="3.2"
                suffix="%"
                step={0.1}
                hint="A year of dividends ÷ the share price."
              />
              <NumField label="Dividend growth/yr" value={divGrowth} onChange={setDivGrowth} placeholder="6" suffix="%" step={0.5} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Share price growth/yr" value={priceGrowth} onChange={setPriceGrowth} placeholder="5" suffix="%" step={0.5} />
              <NumField label="Years held" value={years} onChange={setYears} min={1} placeholder="20" suffix="yrs" />
            </div>
            <NumField
              label="New money added monthly"
              value={contribution}
              onChange={setContribution}
              min={0}
              placeholder="200"
              prefix="$"
              hint="Optional — added to both scenarios so the comparison stays fair."
            />
            <Toggle checked={taxable} onChange={setTaxable}>
              This is a taxable brokerage account (dividends are taxed each year)
            </Toggle>
            {taxable && (
              <NumField label="Dividend tax rate" value={taxRate} onChange={setTaxRate} min={0} placeholder="15" suffix="%" step={1} />
            )}
          </div>
        </Card>

        <Card title="Reinvesting vs. cashing out" badge="RESULT" badgeTone="green" className="bg-gray-50">
          {r && r.collapsed ? (
            <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4">
              <p className="text-sm font-medium text-red-800 mb-1">
                These two growth rates don&apos;t describe a real stock
              </p>
              <p className="text-xs text-red-800 leading-relaxed">
                A dividend growing {n(divGrowth)}% a year against a price growing {n(priceGrowth)}% ends
                the {n(years)} years paying {perShare(r.endDiv)} a share on a {perShare(r.endPrice)}{" "}
                share — a yield of {Math.round(r.impliedYield).toLocaleString()}%. Reinvesting at that
                yield compounds into a number with no meaning, so there is nothing useful to show. A price
                that falls usually takes the dividend with it; move the two rates closer together.
              </p>
            </div>
          ) : r ? (
            <>
              <Headline label={`Value after ${n(years)} years, reinvested`} value={fmtK(r.dripFinal)} />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat
                  label="If you took the cash"
                  value={fmtK(r.cashFinal)}
                  sub="dividends held as cash, earning nothing"
                />
                <Stat label="Advantage of reinvesting" value={fmtK(r.advantage)} tone="green" />
                <Stat label="Shares owned" value={Math.round(r.shares).toLocaleString()} sub={`vs ${Math.round(r.sharesNoDrip).toLocaleString()} taking the cash`} />
                <Stat
                  label="Dividends reinvested"
                  value={fmtK(r.dripDividends)}
                  sub={taxable ? `after ${fmtK(r.taxPaid)} of tax` : "no tax in this account"}
                />
                <Stat
                  label="Annual dividend income"
                  value={fmt(r.finalIncome)}
                  sub={`${fmt(r.monthlyIncome)}/mo${taxable ? ", before tax" : ""}`}
                  tone="green"
                />
                <Stat
                  label="Yield on cost"
                  value={pct(r.yieldOnCost, 2)}
                  sub={`on ${fmtK(r.costBasis)} put in`}
                />
              </div>
              <Takeaway>
                Reinvesting turns <strong>{fmtK(r.dripDividends)}</strong> of dividends into{" "}
                <strong>{Math.round(r.extraShares).toLocaleString()}</strong> extra shares, worth{" "}
                <strong>{fmtK(r.advantage)}</strong> more than taking the cash.
              </Takeaway>
              {/* Two different questions, and the page used to answer neither.
                  The old figure divided income from every share by the outside
                  money only, so the reinvested shares paid dividends for free. */}
              <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mt-2 space-y-2">
                <p className="text-xs font-medium text-gray-500">Two ways to read yield on cost</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-900">{pct(r.yieldOnOriginal, 2)}</strong> — what a share
                  bought on day one now pays against what you paid for it. The dividend has grown from{" "}
                  {perShare((n(price) * n(yieldPct)) / 100)} to {perShare(r.finalDivPerShare)} a share
                  while the cost stayed at {perShare(n(price))}. That is dividend growth alone, and it is
                  the figure people usually mean.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-900">{pct(r.yieldOnCost, 2)}</strong> — what the whole
                  position pays against everything that went into it: {fmtK(r.contributed)} of your own
                  money plus {fmtK(r.dripDividends)} of reinvested dividends,{" "}
                  {fmtK(r.costBasis)} in all — your cost basis, which is also the figure tax is measured
                  against when you sell. Lower than the first number, because every share bought after day
                  one cost more than {perShare(n(price))}.
                </p>
              </div>
              {taxable && (
                <p className="text-xs text-gray-400 leading-relaxed mt-3">
                  Dividends are taxed in the year they are paid, so the reinvestment buys shares with the
                  after-tax amount — {fmtK(r.dripDividends)} of the {fmtK(r.dripGross)} paid out, with{" "}
                  {fmtK(r.taxPaid)} going to tax. No outside money covers it. The cash side is taxed the
                  same way, so neither path is subsidising the other.
                </p>
              )}
            </>
          ) : (
            <EmptyState>Enter an amount invested, a share price, and a holding period.</EmptyState>
          )}
        </Card>
      </div>

      {r && !r.collapsed && (
        <ChartCard title="Portfolio value: reinvested vs. taken as cash">
          <LineChart
            ariaLabel="Value over time when dividends are reinvested compared with taking dividends as cash"
            periodsPerYear={1}
            series={[
              { label: "Dividends reinvested", color: COLORS.green, data: r.dripValues, fill: true },
              { label: "Dividends taken as cash", color: COLORS.gray, data: r.cashValues, dash: [6, 3] },
            ]}
          />
          <div className="mt-4">
            <Takeaway tone="blue">
              Both lines start identical. The reinvested line pulls away because each dividend buys shares
              that pay dividends of their own — the compounding is in the share count, not just the
              price.
              {taxable && " Taxes drag on both paths here, since dividends in a taxable account are taxed the year they're paid whether you spend them or not."}
            </Takeaway>
          </div>
        </ChartCard>
      )}
    </CalcShell>
  );
}
