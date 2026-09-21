"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, DonutChart, COLORS } from "../../components/Charts";
import { futureValue } from "../../lib/finance";
import { TAX_YEAR, taxOnExtraIncome, standardDeduction, type FilingStatus } from "../../lib/tax";

type Account = "401k" | "traditional-ira" | "roth";

/**
 * How much comes off the top before the money reaches you.
 *
 * A 401(k) or 403(b) distribution carries a mandatory 20% federal withholding
 * that cannot be waived. An IRA withholds 10% by default and the owner may opt
 * out. Neither is the tax — both are a prepayment settled on the return.
 */
const WITHHOLDING: Record<Account, { rate: number; waivable: boolean }> = {
  "401k": { rate: 20, waivable: false },
  "traditional-ira": { rate: 10, waivable: true },
  roth: { rate: 10, waivable: true },
};

export default function Calculator() {
  const [amount, setAmount] = useState<Num>("");
  const [age, setAge] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [stateRate, setStateRate] = useState<Num>("");
  const [returnRate, setReturnRate] = useState<Num>("");
  const [retireAge, setRetireAge] = useState<Num>("");
  const [contributions, setContributions] = useState<Num>("");
  const [status, setStatus] = useState<FilingStatus>("single");
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
    // Roth contributions come out first, tax and penalty free; only what is
    // left is earnings, and only earnings are taxed and penalised.
    const taxablePortion = isRoth ? Math.max(0, gross - n(contributions)) : gross;

    const under59 = n(age) < 59.5;
    const penaltyApplies = under59 && !exception;
    const penalty = penaltyApplies ? taxablePortion * 0.1 : 0;

    /* Federal tax on the withdrawal.
     *
     * This used to be a single marginal rate applied to the whole amount:
     * 24% of $30,000 = $7,200 on the example. But the withdrawal stacks on
     * income already sitting inside the 22% band, so most of it is taxed at
     * 22% and only the top slice reaches 24%. A flat marginal rate always
     * overstates, and it overstates most for the people least able to check. */
    const fed = taxOnExtraIncome(n(income), taxablePortion, status);
    const fedTax = fed.tax;
    const stateTax = (taxablePortion * n(stateRate)) / 100;

    const wh = WITHHOLDING[account];
    const withholding = (gross * wh.rate) / 100;

    const totalCost = penalty + fedTax + stateTax;
    const net = gross - totalCost;
    const keepPct = (net / gross) * 100;

    /* The gross-up has to be solved rather than divided, now that the federal
     * rate moves with the size of the withdrawal. */
    const netFrom = (w: number) => {
      const f = taxOnExtraIncome(n(income), isRoth ? Math.max(0, w - n(contributions)) : w, status).tax;
      const t = isRoth ? Math.max(0, w - n(contributions)) : w;
      return w - (penaltyApplies ? t * 0.1 : 0) - f - (t * n(stateRate)) / 100;
    };
    let lo = 0;
    let hi = 2_000_000;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (netFrom(mid) < 10_000) lo = mid;
      else hi = mid;
    }
    const grossUpFor10k = netFrom(hi) >= 9_999 ? (lo + hi) / 2 : Infinity;

    const yearsToRetire = n(retireAge) - n(age);
    const retirementReached = yearsToRetire > 0;
    /* Annual compounding, not the helper's monthly default. An "expected
     * return" of 7% is an annual return; compounding it twelve times a year
     * quietly turns it into 7.23% and reported $171,763 where $162,823 is
     * right. This is the only caller, so the default is left alone. */
    const forgone = retirementReached ? futureValue(gross, n(returnRate), yearsToRetire, 1) : gross;
    const growthMultiple = forgone / Math.max(1, gross);

    return {
      gross,
      taxablePortion,
      penalty,
      penaltyApplies,
      fed,
      fedTax,
      stateTax,
      withholding,
      withholdingRate: wh.rate,
      withholdingWaivable: wh.waivable,
      totalCost,
      net,
      keepPct,
      effectiveRate: (totalCost / gross) * 100,
      yearsToRetire,
      retirementReached,
      forgone,
      growthMultiple,
      grossUpFor10k,
      isRoth,
      under59,
      deduction: standardDeduction(status),
    };
  }, [amount, age, income, stateRate, returnRate, retireAge, contributions, status, account, exception]);

  return (
    <CalcShell
      slug="early-withdrawal"
      intro="Taking money out of a retirement account early costs you three times: income tax, a 10% penalty, and every dollar of growth that money would have earned. Here's the full bill."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["retirement-savings", "emergency-fund", "401k-vs-debt-payoff", "capital-gains"]}
      disclaimer={`For educational purposes only and not tax advice. Uses ${TAX_YEAR} federal brackets and the standard deduction, with a flat state rate — it does not model credits, phase-outs, or itemising. Exceptions to the 10% penalty are specific and fact-dependent (disability, certain medical costs, first-home purchase from an IRA, substantially equal periodic payments, and others). A 401(k) loan or hardship distribution may have different rules. Talk to a tax professional before withdrawing.`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The withdrawal" badge="INPUTS">
          <div className="space-y-4">
            <NumField label="Amount you want to withdraw" value={amount} onChange={setAmount} min={0} placeholder="30000" prefix="$" />
            <SelectField
              label="Account type"
              value={account}
              onChange={(v) => setAccount(v as Account)}
              options={[
                { value: "401k", label: "401(k) / 403(b)" },
                { value: "traditional-ira", label: "Traditional IRA" },
                { value: "roth", label: "Roth IRA" },
              ]}
              hint={
                account === "401k"
                  ? "A plan distribution carries a mandatory 20% federal withholding that you cannot waive."
                  : account === "traditional-ira"
                    ? "An IRA withholds 10% federal by default, and you can waive it — the tax is still owed either way."
                    : "Your contributions come out first, tax and penalty free. Only the earnings above them are taxed."
              }
            />
            {account === "roth" && (
              <NumField
                label="Contributions you've made"
                value={contributions}
                onChange={setContributions}
                min={0}
                placeholder="20000"
                prefix="$"
                hint="Total you have put in over the years, not the current balance. It comes out before any earnings do."
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Your age" value={age} onChange={setAge} min={1} placeholder="40" suffix="yrs" />
              <NumField
                label="Retirement age"
                value={retireAge}
                onChange={setRetireAge}
                min={1}
                placeholder="65"
                suffix="yrs"
                hint={r && !r.retirementReached ? "Set this above your current age to see the growth you'd give up." : undefined}
              />
            </div>
            <SelectField
              label="Filing status"
              value={status}
              onChange={(v) => setStatus(v as FilingStatus)}
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married filing jointly" },
                { value: "head", label: "Head of household" },
              ]}
            />
            <NumField
              label="Other gross income"
              value={income}
              onChange={setIncome}
              min={0}
              placeholder="95000"
              prefix="$"
              hint={
                r
                  ? `Wages and other taxable income before deductions — the figure on your W-2, not your taxable income. The ${fmt(r.deduction)} standard deduction is applied for you.`
                  : "Wages and other taxable income before deductions, not your taxable income."
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="State tax rate" value={stateRate} onChange={setStateRate} min={0} placeholder="5" suffix="%" step={0.5} />
              <NumField label="Expected return" value={returnRate} onChange={setReturnRate} placeholder="7" suffix="%" step={0.25} />
            </div>
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
                <Stat
                  label="Federal tax"
                  value={fmt(r.fedTax)}
                  sub={`${pct(r.fed.effectiveRate, 1)} of the withdrawal`}
                  tone="red"
                />
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
                    Your {account === "401k" ? "plan" : "custodian"} {r.withholdingWaivable ? "will withhold" : "must withhold"}{" "}
                    <strong>{fmt(r.withholding)}</strong> ({r.withholdingRate}%) up front
                    {r.withholdingWaivable ? ", which you can waive" : ""}; that is a prepayment, and you
                    settle up at tax time.
                  </>
                )}
              </Takeaway>
              {/* A single marginal rate on the whole withdrawal was the bug. Show
                  the bands it actually crosses so the effective rate is checkable. */}
              {r.taxablePortion > 0 && r.fed.bands.length > 0 && (
                <p className="text-xs text-gray-400 leading-relaxed mt-3">
                  Stacked on {fmt(n(income))} of income less the {fmt(r.deduction)} standard deduction,
                  this withdrawal is taxed at{" "}
                  {r.fed.bands.map((b, i) => (
                    <span key={b.rate}>
                      {i > 0 && (i === r.fed.bands.length - 1 ? " and " : ", ")}
                      <strong className="text-gray-600">{b.rate}% on {fmt(b.amount)}</strong>
                    </span>
                  ))}{" "}
                  — {pct(r.fed.effectiveRate, 2)} overall, not the {r.fed.marginalRate}% top rate it
                  reaches. {TAX_YEAR} brackets.
                </p>
              )}
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

          {r.retirementReached && (
            <ChartCard title={`The bigger cost: ${Math.round(r.yearsToRetire)} years of growth`}>
              {/* Both bars are the gross amount and what it becomes. Putting
                  after-tax cash beside a pre-tax future balance made the gap
                  look bigger than it is — that balance gets taxed too. */}
              <BarChart
                ariaLabel="The withdrawal today split into cash and tax, compared with what it would grow to by retirement before tax"
                height={210}
                bars={[
                  {
                    label: "Taken out today",
                    segments: [
                      { label: "Cash you keep", value: r.net, color: COLORS.gray },
                      { label: "Tax and penalty", value: r.totalCost, color: COLORS.red },
                    ],
                  },
                  {
                    label: `Left invested to ${n(retireAge)}, before tax`,
                    segments: [{ label: "Future balance", value: r.forgone, color: COLORS.green }],
                  },
                ]}
              />
              <div className="mt-4">
                <Takeaway tone="red">
                  Left alone at {pct(n(returnRate), 1)}, that <strong>{fmt(r.gross)}</strong> would be{" "}
                  <strong>{fmtK(r.forgone)}</strong> by age {n(retireAge)} —{" "}
                  <strong>{r.growthMultiple.toFixed(1)}×</strong> what you are taking out. If this is an
                  emergency, a 401(k) loan or a smaller withdrawal may cost far less.
                </Takeaway>
                <p className="text-xs text-gray-400 leading-relaxed mt-3">
                  {fmtK(r.forgone)} is the balance before tax. You would owe income tax on a traditional
                  account when you drew it in retirement, so it is not the same kind of money as the{" "}
                  {fmt(r.net)} of after-tax cash in your hand today — the comparison above is gross to
                  gross for that reason. What the retirement tax costs depends on your bracket then, which
                  nobody can know now.
                </p>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </CalcShell>
  );
}
