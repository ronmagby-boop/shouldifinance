"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";

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
    let contributed = n(invested);

    const dripValues = [n(invested)];
    const cashValues = [n(invested)];
    const incomeByYear: number[] = [];

    for (let y = 1; y <= yrs; y++) {
      // Quarterly dividends, reinvested at the prevailing price.
      for (let q = 0; q < 4; q++) {
        const divPerShare = annualDivPerShare / 4;
        const gross = shares * divPerShare;
        const net = gross * taxMult;
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
          sharePrice *= Math.pow(1 + n(priceGrowth) / 100, 1 / 12);
        }
      }
      annualDivPerShare *= 1 + n(divGrowth) / 100;
      dripValues.push(shares * sharePrice);
      cashValues.push(sharesNoDrip * sharePrice + cashCollected);
      incomeByYear.push(shares * annualDivPerShare * taxMult);
    }

    const dripFinal = shares * sharePrice;
    const cashFinal = sharesNoDrip * sharePrice + cashCollected;
    const finalIncome = shares * annualDivPerShare;

    return {
      dripFinal,
      cashFinal,
      advantage: dripFinal - cashFinal,
      shares,
      sharesNoDrip,
      sharePrice,
      dripDividends,
      cashCollected,
      contributed,
      finalIncome,
      monthlyIncome: finalIncome / 12,
      yieldOnCost: (finalIncome / Math.max(1, contributed)) * 100,
      dripValues,
      cashValues,
      incomeByYear,
    };
  }, [invested, price, yieldPct, divGrowth, priceGrowth, years, contribution, taxRate, taxable]);

  return (
    <CalcShell
      slug="dividend-reinvestment"
      category="Investing"
      eyebrow="Investing tools"
      title="Dividend reinvestment (DRIP) calculator"
      crumb="Dividend reinvestment"
      intro="Every dividend you reinvest buys shares that pay their own dividends. Compare taking the cash against letting it compound — and see what your yield on cost becomes after years of dividend growth."
      onExample={loadExample}
      relatedSlugs={["compound-interest", "investment-growth", "capital-gains"]}
      disclaimer="For educational purposes only. Assumes dividends are paid quarterly and grow at a steady rate — companies can and do cut dividends. Share price growth is an assumption, not a forecast. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your position" badge="INPUTS">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Amount invested" value={invested} onChange={setInvested} placeholder="25000" prefix="$" />
              <NumField label="Share price" value={price} onChange={setPrice} placeholder="50" prefix="$" step={0.01} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Dividend yield" value={yieldPct} onChange={setYieldPct} placeholder="3.2" suffix="%" step={0.1} />
              <NumField label="Dividend growth/yr" value={divGrowth} onChange={setDivGrowth} placeholder="6" suffix="%" step={0.5} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Share price growth/yr" value={priceGrowth} onChange={setPriceGrowth} placeholder="5" suffix="%" step={0.5} />
              <NumField label="Years held" value={years} onChange={setYears} placeholder="20" suffix="yrs" />
            </div>
            <NumField
              label="New money added monthly"
              value={contribution}
              onChange={setContribution}
              placeholder="200"
              prefix="$"
              hint="Optional — added to both scenarios so the comparison stays fair."
            />
            <Toggle checked={taxable} onChange={setTaxable}>
              This is a taxable brokerage account (dividends are taxed each year)
            </Toggle>
            {taxable && (
              <NumField label="Dividend tax rate" value={taxRate} onChange={setTaxRate} placeholder="15" suffix="%" step={1} />
            )}
          </div>
        </Card>

        <Card title="Reinvesting vs. cashing out" badge="RESULT" badgeTone="green" className="bg-gray-50">
          {r ? (
            <>
              <Headline label={`Value after ${n(years)} years with DRIP`} value={fmtK(r.dripFinal)} />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="If you took the cash" value={fmtK(r.cashFinal)} />
                <Stat label="DRIP advantage" value={fmtK(r.advantage)} tone="green" />
                <Stat label="Shares owned" value={Math.round(r.shares).toLocaleString()} sub={`vs ${Math.round(r.sharesNoDrip).toLocaleString()} without DRIP`} />
                <Stat label="Dividends reinvested" value={fmtK(r.dripDividends)} />
                <Stat label="Annual dividend income" value={fmt(r.finalIncome)} sub={`${fmt(r.monthlyIncome)}/mo`} tone="green" />
                <Stat label="Yield on cost" value={pct(r.yieldOnCost, 2)} sub={`started at ${pct(n(yieldPct), 2)}`} />
              </div>
              <Takeaway>
                Reinvesting turns <strong>{fmtK(r.dripDividends)}</strong> of dividends into{" "}
                <strong>{Math.round(r.shares - r.sharesNoDrip).toLocaleString()}</strong> extra shares,
                worth <strong>{fmtK(r.advantage)}</strong> more than taking the cash. Dividend growth also
                lifts your yield on cost from {pct(n(yieldPct), 2)} to{" "}
                <strong>{pct(r.yieldOnCost, 2)}</strong>.
              </Takeaway>
            </>
          ) : (
            <EmptyState>Enter an amount invested, a share price, and a holding period.</EmptyState>
          )}
        </Card>
      </div>

      {r && (
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
              Both lines start identical. The DRIP line pulls away because each reinvested dividend buys
              shares that pay dividends of their own — the compounding is in the share count, not just the
              price.
              {taxable && " Taxes drag on both paths here, since dividends in a taxable account are taxed the year they're paid whether you spend them or not."}
            </Takeaway>
          </div>
        </ChartCard>
      )}
    </CalcShell>
  );
}
