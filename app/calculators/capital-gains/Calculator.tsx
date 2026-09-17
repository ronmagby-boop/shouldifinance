"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, DonutChart, COLORS } from "../../components/Charts";
import { longTermRate, ordinaryRate } from "../../lib/finance";

type Status = "single" | "married" | "head";

const NIIT_THRESHOLD: Record<Status, number> = {
  single: 200000,
  married: 250000,
  head: 200000,
};

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

  const r = useMemo(() => {
    if (n(sellPrice) <= 0 || n(buyPrice) <= 0) return null;

    const gain = n(sellPrice) - n(buyPrice) - n(costs);
    const inc = n(income);

    const ltRate = longTermRate(inc + Math.max(0, gain), status);
    const stRate = ordinaryRate(inc + Math.max(0, gain), status);
    const appliedFedRate = longTerm ? ltRate : stRate;

    const taxableGain = Math.max(0, gain);
    const fedTax = (taxableGain * appliedFedRate) / 100;

    // Net investment income tax applies above the MAGI threshold.
    const overThreshold = Math.max(0, inc + taxableGain - NIIT_THRESHOLD[status]);
    const niitBase = Math.min(taxableGain, overThreshold);
    const niit = niitBase * 0.038;

    const stateTax = (taxableGain * n(stateRate)) / 100;
    const totalTax = fedTax + niit + stateTax;
    const net = n(sellPrice) - n(costs) - totalTax;

    // What the other holding period would cost.
    const altRate = longTerm ? stRate : ltRate;
    const altFed = (taxableGain * altRate) / 100;
    const altTotal = altFed + niit + stateTax;

    return {
      gain,
      taxableGain,
      appliedFedRate,
      ltRate,
      stRate,
      fedTax,
      niit,
      stateTax,
      totalTax,
      net,
      effectiveRate: taxableGain > 0 ? (totalTax / taxableGain) * 100 : 0,
      keepPct: taxableGain > 0 ? ((taxableGain - totalTax) / taxableGain) * 100 : 0,
      difference: Math.abs(altTotal - totalTax),
      altTotal,
      returnPct: (gain / n(buyPrice)) * 100,
    };
  }, [buyPrice, sellPrice, costs, income, stateRate, status, longTerm]);

  return (
    <CalcShell
      slug="capital-gains"
      intro="The tax on a sale depends on one thing more than any other: whether you held the asset longer than a year. Enter your numbers to see federal, state, and net investment income tax — and what the holding period is worth."
      onExample={loadExample}
      relatedSlugs={["investment-growth", "dividend-reinvestment", "early-withdrawal"]}
      disclaimer="For educational purposes only and not tax advice. Uses 2025 federal brackets and assumes a flat state rate; many states tax gains as ordinary income and some do not tax them at all. Ignores carryforward losses, wash sales, AMT, and special asset classes such as collectibles or Section 1202 stock. Consult a tax professional."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The sale" badge="INPUTS">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="What you paid" value={buyPrice} onChange={setBuyPrice} placeholder="40000" prefix="$" />
              <NumField label="What you sold for" value={sellPrice} onChange={setSellPrice} placeholder="115000" prefix="$" />
            </div>
            <NumField
              label="Commissions and fees"
              value={costs}
              onChange={setCosts}
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
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Other taxable income" value={income} onChange={setIncome} placeholder="120000" prefix="$" />
              <NumField label="State tax rate" value={stateRate} onChange={setStateRate} placeholder="5" suffix="%" step={0.5} />
            </div>
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
                <Stat label={`Federal (${pct(r.appliedFedRate, 0)})`} value={fmt(r.fedTax)} />
                <Stat label="Net investment income tax" value={fmt(r.niit)} sub={r.niit > 0 ? "3.8% surtax applies" : "Below threshold"} />
                <Stat label={`State (${pct(n(stateRate), 1)})`} value={fmt(r.stateTax)} />
                <Stat label="Effective tax rate" value={pct(r.effectiveRate, 1)} tone="amber" />
                <Stat label="You keep" value={pct(r.keepPct, 1)} sub="of the gain" tone="green" />
              </div>
              {r.gain > 0 ? (
                <Takeaway tone={longTerm ? "green" : "amber"}>
                  {longTerm ? (
                    <>
                      <strong>✓ Long-term rates apply.</strong> At {pct(r.ltRate, 0)} instead of the{" "}
                      {pct(r.stRate, 0)} you&apos;d pay on a short-term gain, holding past one year saved
                      you <strong>{fmt(r.difference)}</strong>.
                    </>
                  ) : (
                    <>
                      <strong>⚠ This is a short-term gain</strong>, taxed as ordinary income at{" "}
                      {pct(r.stRate, 0)}. Holding past the one-year mark would drop it to{" "}
                      {pct(r.ltRate, 0)} and save about <strong>{fmt(r.difference)}</strong>.
                    </>
                  )}
                </Takeaway>
              ) : (
                <Takeaway tone="blue">
                  This sale is a loss of <strong>{fmt(Math.abs(r.gain))}</strong>. Losses offset other
                  gains, and up to $3,000 a year can offset ordinary income, with the rest carried forward.
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
                    { label: "Federal", value: (r.taxableGain * r.stRate) / 100, color: COLORS.amber },
                    { label: "NIIT + state", value: r.niit + r.stateTax, color: COLORS.gray },
                  ],
                },
                {
                  label: "Held over 1 year",
                  segments: [
                    { label: "Federal", value: (r.taxableGain * r.ltRate) / 100, color: COLORS.amber },
                    { label: "NIIT + state", value: r.niit + r.stateTax, color: COLORS.gray },
                  ],
                },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                One day past the one-year mark changes the federal rate from {pct(r.stRate, 0)} to{" "}
                {pct(r.ltRate, 0)} on this gain. If you are close to that date, the calendar is worth more
                than most trades.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      )}
    </CalcShell>
  );
}
