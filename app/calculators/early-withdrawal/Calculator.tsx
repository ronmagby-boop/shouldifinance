"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, DonutChart, COLORS } from "../../components/Charts";
import { ordinaryRate, futureValue } from "../../lib/finance";

type Status = "single" | "married" | "head";
type Account = "401k" | "traditional-ira" | "roth";

export default function Calculator() {
  const [amount, setAmount] = useState<Num>("");
  const [age, setAge] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [stateRate, setStateRate] = useState<Num>("");
  const [returnRate, setReturnRate] = useState<Num>("");
  const [retireAge, setRetireAge] = useState<Num>("");
  const [contributions, setContributions] = useState<Num>("");
  const [status, setStatus] = useState<Status>("single");
  const [account, setAccount] = useState<Account>("401k");
  const [exception, setException] = useState(false);

  const loadExample = () => {
    setAmount(30000);
    setAge(40);
    setIncome(95000);
    setStateRate(5);
    setReturnRate(7);
    setRetireAge(65);
    setContributions(20000);
    setStatus("single");
    setAccount("401k");
    setException(false);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setAmount("");
    setAge("");
    setIncome("");
    setStateRate("");
    setReturnRate("");
    setRetireAge("");
    setContributions("");
    setStatus("single");
    setAccount("401k");
    setException(false);
  };

  const r = useMemo(() => {
    const gross = n(amount);
    if (gross <= 0) return null;

    const isRoth = account === "roth";
    // Roth contributions come out tax and penalty free; only earnings are hit.
    const taxablePortion = isRoth ? Math.max(0, gross - n(contributions)) : gross;

    const under59 = n(age) < 59.5;
    const penaltyApplies = under59 && !exception;
    const penalty = penaltyApplies ? taxablePortion * 0.1 : 0;

    const fedRate = ordinaryRate(n(income) + taxablePortion, status);
    const fedTax = (taxablePortion * fedRate) / 100;
    const stateTax = (taxablePortion * n(stateRate)) / 100;

    // 401(k) distributions carry a mandatory 20% federal withholding.
    const withholding = account === "401k" && !isRoth ? gross * 0.2 : 0;

    const totalCost = penalty + fedTax + stateTax;
    const net = gross - totalCost;
    const keepPct = (net / gross) * 100;

    const yearsToRetire = Math.max(0, n(retireAge) - n(age));
    const forgone = futureValue(gross, n(returnRate), yearsToRetire);
    const forgoneNet = futureValue(net, n(returnRate), yearsToRetire);

    // Grossed-up amount you would need to withdraw to net a target.
    const effectiveRate = totalCost / gross;
    const grossUpFor10k = effectiveRate < 1 ? 10000 / (1 - effectiveRate) : Infinity;

    return {
      gross,
      taxablePortion,
      penalty,
      penaltyApplies,
      fedRate,
      fedTax,
      stateTax,
      withholding,
      totalCost,
      net,
      keepPct,
      effectiveRate: effectiveRate * 100,
      yearsToRetire,
      forgone,
      forgoneNet,
      grossUpFor10k,
      isRoth,
      under59,
    };
  }, [amount, age, income, stateRate, returnRate, retireAge, contributions, status, account, exception]);

  return (
    <CalcShell
      slug="early-withdrawal"
      intro="Taking money out of a retirement account early costs you three times: income tax, a 10% penalty, and every dollar of growth that money would have earned. Here's the full bill."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["retirement-savings", "emergency-fund", "capital-gains"]}
      disclaimer="For educational purposes only and not tax advice. Uses 2025 federal brackets with a flat state rate. Exceptions to the 10% penalty are specific and fact-dependent (disability, certain medical costs, first-home purchase from an IRA, substantially equal periodic payments, and others). A 401(k) loan or hardship distribution may have different rules. Talk to a tax professional before withdrawing."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The withdrawal" badge="INPUTS">
          <div className="space-y-4">
            <NumField label="Amount you want to withdraw" value={amount} onChange={setAmount} placeholder="30000" prefix="$" />
            <SelectField
              label="Account type"
              value={account}
              onChange={(v) => setAccount(v as Account)}
              options={[
                { value: "401k", label: "401(k) / 403(b)" },
                { value: "traditional-ira", label: "Traditional IRA" },
                { value: "roth", label: "Roth IRA" },
              ]}
            />
            {account === "roth" && (
              <NumField
                label="Contributions you've made"
                value={contributions}
                onChange={setContributions}
                placeholder="20000"
                prefix="$"
                hint="Roth contributions come out tax and penalty free — only earnings are taxed."
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Your age" value={age} onChange={setAge} placeholder="40" suffix="yrs" />
              <NumField label="Retirement age" value={retireAge} onChange={setRetireAge} placeholder="65" suffix="yrs" />
            </div>
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
              <NumField label="Other income" value={income} onChange={setIncome} placeholder="95000" prefix="$" />
              <NumField label="State tax rate" value={stateRate} onChange={setStateRate} placeholder="5" suffix="%" step={0.5} />
            </div>
            <NumField label="Expected investment return" value={returnRate} onChange={setReturnRate} placeholder="7" suffix="%" step={0.25} />
            <Toggle checked={exception} onChange={setException}>
              A penalty exception applies (disability, qualified medical costs, SEPP, and similar)
            </Toggle>
          </div>
        </Card>

        <Card title="What you actually get" badge="AFTER TAX" badgeTone="amber" className="bg-gray-50">
          {r ? (
            <>
              <Headline label={`Cash in hand from a ${fmt(r.gross)} withdrawal`} value={fmt(r.net)} tone="gray" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label={`Federal tax (${pct(r.fedRate, 0)})`} value={fmt(r.fedTax)} tone="red" />
                <Stat
                  label="10% early penalty"
                  value={r.penaltyApplies ? fmt(r.penalty) : "None ✓"}
                  tone={r.penaltyApplies ? "red" : "green"}
                />
                <Stat label={`State tax (${pct(n(stateRate), 1)})`} value={fmt(r.stateTax)} tone="red" />
                <Stat label="Total cost" value={fmt(r.totalCost)} sub={pct(r.effectiveRate, 1) + " of the withdrawal"} tone="red" />
                <Stat label="You keep" value={pct(r.keepPct, 1)} tone="amber" />
                <Stat
                  label="To net $10,000 you'd withdraw"
                  value={Number.isFinite(r.grossUpFor10k) ? fmt(r.grossUpFor10k) : "—"}
                />
              </div>
              <Takeaway tone={r.penaltyApplies ? "red" : "amber"}>
                {r.isRoth && r.taxablePortion < r.gross ? (
                  <>
                    Only <strong>{fmt(r.taxablePortion)}</strong> of this withdrawal is earnings — your
                    Roth contributions come out free. That keeps the bill to{" "}
                    <strong>{fmt(r.totalCost)}</strong>.
                  </>
                ) : (
                  <>
                    Taxes and penalties take <strong>{fmt(r.totalCost)}</strong> — about{" "}
                    <strong>{pct(r.effectiveRate, 0)}</strong> of the withdrawal. You asked for{" "}
                    {fmt(r.gross)} and walk away with {fmt(r.net)}.
                  </>
                )}
                {r.withholding > 0 && (
                  <>
                    {" "}
                    Your plan must also withhold <strong>{fmt(r.withholding)}</strong> (20%) up front; you
                    settle up at tax time.
                  </>
                )}
              </Takeaway>
            </>
          ) : (
            <EmptyState>Enter the amount you&apos;re thinking of withdrawing.</EmptyState>
          )}
        </Card>
      </div>

      {r && (
        <>
          <ChartCard title="Where the money goes">
            <DonutChart
              ariaLabel="Split of the withdrawal between cash you keep, federal tax, state tax, and penalty"
              centerLabel="you keep"
              centerValue={fmt(r.net)}
              slices={[
                { label: "Cash you keep", value: r.net, color: COLORS.green },
                { label: "Federal income tax", value: r.fedTax, color: COLORS.amber },
                { label: "State income tax", value: r.stateTax, color: COLORS.purple },
                { label: "10% early penalty", value: r.penalty, color: COLORS.red },
              ]}
            />
          </ChartCard>

          {r.yearsToRetire > 0 && (
            <ChartCard title={`The bigger cost: ${r.yearsToRetire} years of growth`}>
              <BarChart
                ariaLabel="Cash received today compared with what the money would be worth at retirement"
                height={210}
                bars={[
                  { label: "Cash today", segments: [{ label: "Net cash", value: r.net, color: COLORS.gray }] },
                  {
                    label: `Left invested to age ${n(retireAge)}`,
                    segments: [{ label: "Future value", value: r.forgone, color: COLORS.green }],
                  },
                ]}
              />
              <div className="mt-4">
                <Takeaway tone="red">
                  Left alone at {pct(n(returnRate), 1)}, that <strong>{fmt(r.gross)}</strong> would be worth{" "}
                  <strong>{fmtK(r.forgone)}</strong> by age {n(retireAge)}. Withdrawing it now trades{" "}
                  {fmtK(r.forgone)} of future money for {fmt(r.net)} today — roughly{" "}
                  <strong>{(r.forgone / Math.max(1, r.net)).toFixed(1)}× </strong>
                  what you receive. If this is an emergency, a 401(k) loan or a smaller withdrawal may cost
                  far less.
                </Takeaway>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </CalcShell>
  );
}
