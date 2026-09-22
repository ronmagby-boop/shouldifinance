"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, DonutChart, COLORS } from "../../components/Charts";
import {
  TAX_YEAR, taxOnCapitalGain, taxOnExtraIncome, niitOn, standardDeduction,
  type FilingStatus,
} from "../../lib/tax";

type Status = FilingStatus;

export default function Calculator() {
  const [buyPrice, setBuyPrice] = useState<Num>("");
  const [sellPrice, setSellPrice] = useState<Num>("");
  const [costs, setCosts] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [stateRate, setStateRate] = useState<Num>("");
  const [status, setStatus] = useState<Status>("single");
  const [longTerm, setLongTerm] = useState(true);

  const loadExample = () => {
    setBuyPrice(40000);
    setSellPrice(115000);
    setCosts(500);
    setIncome(120000);
    setStateRate(5);
    setStatus("single");
    setLongTerm(true);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setBuyPrice("");
    setSellPrice("");
    setCosts("");
    setIncome("");
    setStateRate("");
    setStatus("single");
    setLongTerm(true);
  };

  const r = useMemo(() => {
    if (n(sellPrice) <= 0 || n(buyPrice) <= 0) return null;

    const gain = n(sellPrice) - n(buyPrice) - n(costs);
    const inc = n(income);
    const taxableGain = Math.max(0, gain);

    /* Both holding periods are costed by stacking the gain on top of taxable
     * ordinary income and filling brackets from there — long-term into the
     * 0/15/20% bands, short-term into the ordinary ones. The page used to
     * pick the single rate the stacked total landed in and apply it to every
     * dollar, which is wrong whenever a gain spans two bands. */
    const lt = taxOnCapitalGain(inc, taxableGain, status);
    const st = taxOnExtraIncome(inc, taxableGain, status);
    const applied = longTerm ? lt : st;
    const alt = longTerm ? st : lt;
    const fedTax = applied.tax;

    // MAGI is gross income plus the gain — before the standard deduction,
    // which is why it is not the same base the brackets above are filled on.
    const magi = inc + taxableGain;
    const niitCalc = niitOn(magi, taxableGain, status);
    const niit = niitCalc.tax;

    const stateTax = (taxableGain * n(stateRate)) / 100;
    const totalTax = fedTax + niit + stateTax;
    const net = n(sellPrice) - n(costs) - totalTax;
    const altTotal = alt.tax + niit + stateTax;

    return {
      gain,
      taxableGain,
      isLoss: gain < 0,
      appliedFedRate: applied.effectiveRate,
      bands: applied.bands,
      ltTax: lt.tax,
      stTax: st.tax,
      ltRate: lt.effectiveRate,
      stRate: st.effectiveRate,
      baseTaxable: lt.baseTaxable,
      deduction: standardDeduction(status),
      fedTax,
      niit,
      niitCalc,
      magi,
      stateTax,
      totalTax,
      net,
      effectiveRate: taxableGain > 0 ? (totalTax / taxableGain) * 100 : 0,
      keepPct: taxableGain > 0 ? ((taxableGain - totalTax) / taxableGain) * 100 : 0,
      difference: Math.abs(altTotal - totalTax),
      altTotal,
      returnPct: n(buyPrice) > 0 ? (gain / n(buyPrice)) * 100 : 0,
    };
  }, [buyPrice, sellPrice, costs, income, stateRate, status, longTerm]);

  return (
    <CalcShell
      slug="capital-gains"
      intro="The tax on a sale depends on one thing more than any other: whether you held the asset longer than a year. Enter your numbers to see federal, state, and net investment income tax — and what the holding period is worth."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["investment-growth", "dividend-reinvestment", "early-withdrawal"]}
      disclaimer={`For educational purposes only and not tax advice. Uses ${TAX_YEAR} federal brackets and assumes a flat state rate. Models a single sale only: it does not net this gain against other gains or losses, apply the $3,000 annual limit on deducting a net loss against ordinary income, or carry anything forward. Ignores wash sales, AMT, the qualified dividend interaction, and special asset classes such as collectibles or Section 1202 stock. Consult a tax professional.`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The sale" badge="INPUTS">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="What you paid" value={buyPrice} onChange={setBuyPrice} min={0} placeholder="40000" prefix="$" />
              <NumField label="What you sold for" value={sellPrice} onChange={setSellPrice} min={0} placeholder="115000" prefix="$" />
            </div>
            <NumField
              label="Commissions and fees"
              value={costs}
              onChange={setCosts}
              min={0}
              placeholder="500"
              prefix="$"
              hint="Added to your cost basis, which lowers the taxable gain."
            />
            <Toggle checked={longTerm} onChange={setLongTerm}>
              Held longer than one year (qualifies for long-term rates)
            </Toggle>
            <SelectField
              label="Filing status"
              value={status}
              onChange={(v) => setStatus(v as Status)}
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married filing jointly" },
                { value: "head", label: "Head of household" },
              ]}
            />
            <NumField
              label="Other income"
              value={income}
              onChange={setIncome}
              min={0}
              placeholder="120000"
              prefix="$"
              hint={`Wages and everything else before deductions — the standard deduction for your filing status is taken off here. The gain stacks on top of what is left, which is what decides the rate it is taxed at.`}
            />
            <NumField
              label="State tax rate"
              value={stateRate}
              onChange={setStateRate}
              min={0}
              placeholder="5"
              suffix="%"
              step={0.5}
              hint="Most states tax capital gains as ordinary income, so use your state's ordinary income rate. A few tax them at a lower rate, and several have no income tax at all — enter 0 for those."
            />
          </div>
        </Card>

        <Card title="What you owe" badge="ESTIMATE" badgeTone="amber" className="bg-gray-50">
          {r ? (
            <>
              <Headline
                label="Estimated total tax"
                value={fmt(r.totalTax)}
                tone={r.totalTax > 0 ? "red" : "green"}
              />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Capital gain" value={fmtK(r.gain)} sub={pct(r.returnPct, 1) + " return"} tone={r.gain >= 0 ? "green" : "red"} />
                <Stat
                  label={`Federal (${pct(r.appliedFedRate, 1)} on the gain)`}
                  value={fmt(r.fedTax)}
                  sub={
                    r.bands.length > 1
                      ? r.bands.map((b) => `${b.rate}% on ${fmtK(b.amount)}`).join(" + ")
                      : undefined
                  }
                />
                <Stat
                  label="Net investment income tax"
                  value={fmt(r.niit)}
                  sub={
                    r.taxableGain <= 0
                      ? undefined
                      : r.niitCalc.margin < 0
                        ? `${fmtK(-r.niitCalc.margin)} below the ${fmtK(r.niitCalc.threshold)} threshold`
                        : `3.8% on ${fmtK(r.niitCalc.base)} — the lesser of the gain and ${fmtK(r.niitCalc.excess)} over the threshold`
                  }
                />
                <Stat label={`State (${pct(n(stateRate), 1)})`} value={fmt(r.stateTax)} />
                {!r.isLoss && <Stat label="Effective tax rate" value={pct(r.effectiveRate, 1)} tone="amber" />}
                {!r.isLoss && <Stat label="You keep" value={pct(r.keepPct, 1)} sub="of the gain" tone="green" />}
              </div>
              {r.gain > 0 ? (
                <div className="space-y-2">
                  <Takeaway tone={longTerm ? "green" : "amber"}>
                    {longTerm ? (
                      <>
                        <strong>✓ Long-term rates apply.</strong> This gain costs{" "}
                        <strong>{fmt(r.ltTax)}</strong> in federal tax — an effective{" "}
                        {pct(r.ltRate, 1)} — against <strong>{fmt(r.stTax)}</strong> at{" "}
                        {pct(r.stRate, 1)} if you had sold inside a year. Holding past the one-year mark
                        saved you <strong>{fmt(r.difference)}</strong>.
                      </>
                    ) : (
                      <>
                        <strong>⚠ This is a short-term gain</strong>, taxed as ordinary income: it stacks
                        on your other income and costs <strong>{fmt(r.stTax)}</strong>, an effective{" "}
                        {pct(r.stRate, 1)}. Holding past the one-year mark would cost{" "}
                        <strong>{fmt(r.ltTax)}</strong> instead and save about{" "}
                        <strong>{fmt(r.difference)}</strong>.
                      </>
                    )}
                  </Takeaway>
                  {/* Both rates are effective rates across the bands the gain
                      actually fills, not the single band its top dollar lands
                      in — so this line has to show the working. */}
                  <Takeaway tone="blue">
                    Your {fmtK(n(income))} of income less the {fmtK(r.deduction)} standard deduction
                    leaves <strong>{fmtK(r.baseTaxable)}</strong> of taxable income, and the gain stacks
                    on top of it. That is what puts{" "}
                    {r.bands.map((b, i) => (
                      <span key={b.rate}>
                        {i > 0 ? (i === r.bands.length - 1 ? " and " : ", ") : ""}
                        <strong>{fmtK(b.amount)}</strong> in the {b.rate}% band
                      </span>
                    ))}
                    .
                  </Takeaway>
                </div>
              ) : (
                <Takeaway tone="blue">
                  This sale is a loss of <strong>{fmt(Math.abs(r.gain))}</strong>, so there is no tax to
                  compute on it and the page shows zero rather than a negative bill. Losses have their
                  own rules this page does not model: they offset other capital gains first, then up to
                  $3,000 a year of ordinary income, and anything left carries forward to future years.
                  What this sale is worth to you depends on the rest of your year, not on this sale
                  alone.
                </Takeaway>
              )}
            </>
          ) : (
            <EmptyState>Enter what you paid and what you sold for.</EmptyState>
          )}
        </Card>
      </div>

      {r && r.gain > 0 && (
        <>
          <ChartCard title="Where the proceeds go">
            <DonutChart
              ariaLabel="Breakdown of sale proceeds between your cost basis, taxes, and net gain"
              centerLabel="net to you"
              centerValue={fmtK(r.net)}
              slices={[
                { label: "Your original investment", value: n(buyPrice), color: COLORS.gray },
                { label: "Gain you keep", value: Math.max(0, r.taxableGain - r.totalTax), color: COLORS.green },
                { label: "Federal tax", value: r.fedTax, color: COLORS.amber },
                { label: "Net investment income tax", value: r.niit, color: COLORS.purple },
                { label: "State tax", value: r.stateTax, color: COLORS.red },
              ]}
            />
          </ChartCard>

          <ChartCard title="Short-term vs. long-term on the same gain">
            <BarChart
              ariaLabel="Total tax owed at short-term rates compared with long-term rates"
              height={200}
              bars={[
                {
                  label: "Held under 1 year",
                  segments: [
                    { label: "Federal", value: r.stTax, color: COLORS.amber },
                    { label: "NIIT + state", value: r.niit + r.stateTax, color: COLORS.gray },
                  ],
                },
                {
                  label: "Held over 1 year",
                  segments: [
                    { label: "Federal", value: r.ltTax, color: COLORS.amber },
                    { label: "NIIT + state", value: r.niit + r.stateTax, color: COLORS.gray },
                  ],
                },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                One day past the one-year mark takes this gain from {pct(r.stRate, 1)} to{" "}
                {pct(r.ltRate, 1)} in federal tax — <strong>{fmt(r.difference)}</strong>. If you are close
                to that date, the calendar is worth more than most trades.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      )}
    </CalcShell>
  );
}
