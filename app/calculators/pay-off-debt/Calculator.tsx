"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";
import { TAX_YEAR, STANDARD_DEDUCTION, STUDENT_LOAN_INTEREST_CAP } from "../../lib/tax";

/**
 * What kind of debt this is decides how (and whether) the interest is taxed.
 * Getting this wrong is not a rounding issue: applying a mortgage-style
 * deduction to a credit card would quietly cut its stated rate by the user's
 * marginal bracket on interest that is never deductible.
 */
type DebtType = "mortgage" | "student" | "credit-card" | "auto" | "other";

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: "mortgage", label: "Mortgage" },
  { value: "student", label: "Student loan" },
  { value: "credit-card", label: "Credit card" },
  { value: "auto", label: "Auto loan" },
  { value: "other", label: "Other" },
];

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [yearsLeft, setYearsLeft] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");
  const [investReturn, setInvestReturn] = useState<Num>("");
  const [taxRate, setTaxRate] = useState<Num>("");
  const [deductible, setDeductible] = useState(false);
  const [marginalRate, setMarginalRate] = useState<Num>("");
  const [debtType, setDebtType] = useState<DebtType>("mortgage");

  const loadExample = () => {
    setBalance(280000);
    setRate(6.75);
    setYearsLeft(26);
    setExtra(600);
    setInvestReturn(7.5);
    setTaxRate(15);
    setDeductible(false);
    setMarginalRate(24);
    setDebtType("mortgage");
  };

  const r = useMemo(() => {
    const bal = n(balance);
    const term = Math.round(n(yearsLeft) * 12);
    if (bal <= 0 || term <= 0 || n(extra) <= 0) return null;

    const basePayment = payment(bal, n(rate), term);
    const base = amortize(bal, n(rate), term);
    const fast = amortize(bal, n(rate), term, n(extra), basePayment);
    if (!Number.isFinite(fast.totalInterest)) return null;

    // What the debt really costs after any tax relief its type actually allows.
    let effectiveDebtRate = n(rate);
    if (debtType === "mortgage" && deductible) {
      effectiveDebtRate = n(rate) * (1 - n(marginalRate) / 100);
    } else if (debtType === "student") {
      // Above the line, so no itemizing needed, but capped per year. Once the
      // cap binds, relief stops scaling with the balance and the effective rate
      // climbs back towards the stated one.
      const annualInterest = (bal * n(rate)) / 100;
      const deductiblePart = Math.min(annualInterest, STUDENT_LOAN_INTEREST_CAP);
      const saving = (deductiblePart * n(marginalRate)) / 100;
      effectiveDebtRate = bal > 0 ? n(rate) - (saving / bal) * 100 : n(rate);
    }
    // Credit card, auto and other: interest is never deductible, so the stated
    // rate stands.

    // Concrete context for the standard-deduction point in the mortgage panel.
    const monthlyR = n(rate) / 100 / 12;
    let firstYearInterest = 0;
    for (let i = 0; i < Math.min(12, base.balances.length - 1); i++) {
      firstYearInterest += base.balances[i] * monthlyR;
    }
    const afterTaxInvestReturn = n(investReturn) * (1 - n(taxRate) / 100);

    const horizon = base.payoffMonths;
    const monthlyInvest = n(investReturn) / 100 / 12;
    const marginal = n(marginalRate) / 100;

    /**
     * The deductible slice of one month's interest, given what this year has
     * already used. The student loan cap is annual, so it has to be applied as
     * the year runs rather than to a whole-year total.
     */
    const deductibleSlice = (interest: number, usedThisYear: number): number => {
      if (debtType === "mortgage") return deductible ? interest : 0;
      if (debtType === "student") {
        return Math.max(0, Math.min(interest, STUDENT_LOAN_INTEREST_CAP - usedThisYear));
      }
      return 0;
    };

    // Path A: prepay the debt, then invest the whole payment once it's gone.
    // Path B: keep the minimum payment and invest the extra from day one.
    //
    // Tax relief on deductible interest is cash back, so it is invested on
    // whichever path earned it. Path B carries the debt longer and so collects
    // more of it — which is exactly how a deduction tilts the comparison, and
    // was missing while the effective rate was only ever displayed. The relief
    // is invested rather than thrown at the loan so that the payoff date and
    // interest saved stay what the amortization says.
    const payoffNet: number[] = [];
    const investNet: number[] = [];
    const difference: number[] = [];
    let payoffPortfolio = 0;
    let investPortfolio = 0;
    // Contributions are tracked as running totals because relief now adds to
    // them; without that the relief would be taxed again as though it were gain.
    let contributedA = 0;
    let contributedB = 0;
    let yearUsedA = 0;
    let yearUsedB = 0;
    let reliefA = 0;
    let reliefB = 0;

    for (let m = 1; m <= horizon; m++) {
      if ((m - 1) % 12 === 0) {
        yearUsedA = 0;
        yearUsedB = 0;
      }
      const openA = fast.balances[Math.min(m - 1, fast.balances.length - 1)] ?? 0;
      const openB = base.balances[Math.min(m - 1, base.balances.length - 1)] ?? 0;
      const dedA = deductibleSlice(openA * monthlyR, yearUsedA);
      const dedB = deductibleSlice(openB * monthlyR, yearUsedB);
      yearUsedA += dedA;
      yearUsedB += dedB;
      const backA = dedA * marginal;
      const backB = dedB * marginal;
      reliefA += backA;
      reliefB += backB;

      // Path A
      const debtGoneA = m > fast.payoffMonths;
      payoffPortfolio = payoffPortfolio * (1 + monthlyInvest) + backA;
      contributedA += backA;
      if (debtGoneA) {
        payoffPortfolio += basePayment + n(extra);
        contributedA += basePayment + n(extra);
      }
      const balanceA = fast.balances[Math.min(m, fast.balances.length - 1)] ?? 0;

      // Path B
      investPortfolio = investPortfolio * (1 + monthlyInvest) + n(extra) + backB;
      contributedB += n(extra) + backB;
      const balanceB = base.balances[Math.min(m, base.balances.length - 1)] ?? 0;

      // Only gains are taxed, and only when the money is eventually sold.
      const afterTaxA = payoffPortfolio - Math.max(0, payoffPortfolio - contributedA) * (n(taxRate) / 100);
      const afterTaxB = investPortfolio - Math.max(0, investPortfolio - contributedB) * (n(taxRate) / 100);

      payoffNet.push(afterTaxA - balanceA);
      investNet.push(afterTaxB - balanceB);
      difference.push(afterTaxB - balanceB - (afterTaxA - balanceA));
    }

    // Same gross return, taxed once at the end instead of every year. This is
    // what the projection above actually earns, and it is why the displayed
    // spread can disagree with it.
    const years = horizon / 12;
    const grossEnd = Math.pow(1 + n(investReturn) / 100, years);
    const deferredEquivalent =
      years > 0 && grossEnd - (grossEnd - 1) * (n(taxRate) / 100) > 0
        ? (Math.pow(grossEnd - (grossEnd - 1) * (n(taxRate) / 100), 1 / years) - 1) * 100
        : n(investReturn);

    const allNet = [...payoffNet, ...investNet];
    const netRange = allNet.length ? Math.max(...allNet) - Math.min(...allNet) : 0;

    const finalPayoff = payoffNet[payoffNet.length - 1] ?? 0;
    const finalInvest = investNet[investNet.length - 1] ?? 0;
    const interestSaved = base.totalInterest - fast.totalInterest;

    return {
      basePayment,
      base,
      fast,
      interestSaved,
      monthsSaved: base.payoffMonths - fast.payoffMonths,
      effectiveDebtRate,
      firstYearInterest,
      afterTaxInvestReturn,
      spread: afterTaxInvestReturn - effectiveDebtRate,
      payoffNet,
      investNet,
      difference,
      netRange,
      deferredEquivalent,
      reliefA,
      reliefB,
      finalPayoff,
      finalInvest,
      advantage: finalInvest - finalPayoff,
      horizonYears: horizon / 12,
    };
  }, [balance, rate, yearsLeft, extra, investReturn, taxRate, deductible, marginalRate, debtType]);

  return (
    <CalcShell
      slug="pay-off-debt"
      intro="Paying down a loan is a guaranteed return equal to its interest rate. Investing might do better — or might not. Compare both after tax, and see how much of the answer rests on an assumption."
      onExample={loadExample}
      relatedSlugs={["extra-payments", "debt-payoff", "investment-growth"]}
      disclaimer="For educational purposes only. Paying down debt is a certain return; investment returns are not — the comparison assumes a steady rate that real markets do not deliver. Before doing either, capture any employer retirement match and fund your emergency savings. Not investment or tax advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The debt" badge="LOAN">
          <div className="space-y-4">
            <SelectField
              label="Type of debt"
              value={debtType}
              onChange={(v) => setDebtType(v as DebtType)}
              options={DEBT_TYPES}
              hint="This decides whether any of the interest is deductible."
            />
            <NumField label="Balance" value={balance} onChange={setBalance} placeholder="280000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Interest rate" value={rate} onChange={setRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Years remaining" value={yearsLeft} onChange={setYearsLeft} placeholder="26" suffix="yrs" />
            </div>
            <NumField
              label="Extra money available each month"
              value={extra}
              onChange={setExtra}
              placeholder="600"
              prefix="$"
              hint="The amount you'd either prepay or invest."
            />
            {debtType === "mortgage" && (
              <div className="space-y-2">
                <Toggle checked={deductible} onChange={setDeductible}>
                  I itemize, and this mortgage interest is part of my itemized deductions
                </Toggle>
                <p className="text-xs text-gray-400 leading-relaxed pl-6">
                  Around nine in ten filers take the standard deduction and get nothing back for
                  mortgage interest. For {TAX_YEAR} it is{" "}
                  {fmt(STANDARD_DEDUCTION.marriedFilingJointly)} married filing jointly and{" "}
                  {fmt(STANDARD_DEDUCTION.single)} single, and the deduction only helps to the extent
                  your total itemized deductions clear that bar.
                  {r && (
                    <>
                      {" "}
                      This loan&apos;s first-year interest is about{" "}
                      <strong className="font-medium text-gray-500">{fmt(r.firstYearInterest)}</strong>.
                    </>
                  )}
                </p>
              </div>
            )}
            {debtType === "student" && (
              <p className="text-xs text-gray-400 leading-relaxed">
                Student loan interest has its own deduction, so you do not have to itemize — but it is
                capped at {fmt(STUDENT_LOAN_INTEREST_CAP)} of interest a year and phases out at higher
                incomes. Above the cap, relief stops growing with the balance, so a bigger loan has a
                higher effective cost, not a lower one.
              </p>
            )}
            {(debtType === "mortgage" ? deductible : debtType === "student") && (
              <NumField label="Your marginal tax rate" value={marginalRate} onChange={setMarginalRate} placeholder="24" suffix="%" step={1} />
            )}
            {(debtType === "credit-card" || debtType === "auto" || debtType === "other") && (
              <p className="text-xs text-gray-400 leading-relaxed">
                Interest on this kind of debt is not deductible, so there is no tax adjustment to make —
                the effective cost below is simply the rate you are paying.
              </p>
            )}
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Effective cost of this debt</span>
                <span className="text-sm font-medium text-gray-900">{pct(r.effectiveDebtRate, 2)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The investment alternative" badge="MARKET" badgeTone="blue">
          <div className="space-y-4">
            <NumField label="Expected annual return" value={investReturn} onChange={setInvestReturn} placeholder="7.5" suffix="%" step={0.25} />
            <NumField
              label="Tax on investment gains"
              value={taxRate}
              onChange={setTaxRate}
              placeholder="15"
              suffix="%"
              step={1}
              hint="Use 0 for a 401(k), IRA, or other tax-sheltered account. This is charged as an annual drag, which overstates the cost for a buy-and-hold investor — if you expect to defer capital gains for decades, enter something below your marginal capital gains rate."
            />
            {r && (
              <>
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">After-tax expected return</span>
                  <span className="text-sm font-medium text-blue-800">{pct(r.afterTaxInvestReturn, 2)}</span>
                </div>
                <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.spread > 0 ? "bg-blue-50" : "bg-green-50"}`}>
                  <span className={`text-xs font-medium ${r.spread > 0 ? "text-blue-700" : "text-green-700"}`}>
                    Spread over debt cost
                  </span>
                  <span className={`text-sm font-medium ${r.spread > 0 ? "text-blue-800" : "text-green-800"}`}>
                    {r.spread > 0 ? "+" : ""}{pct(r.spread, 2)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This spread charges the investment tax <strong className="font-medium text-gray-500">every
                  year</strong>. The projection below instead defers it to a single gain taxed when you
                  sell, which over {r.horizonYears.toFixed(0)} years is worth about{" "}
                  <strong className="font-medium text-gray-500">{pct(r.deferredEquivalent, 2)}</strong> a
                  year — so the two can point different ways, and the projection is the one the results
                  below use.
                </p>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Pay off the debt</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalPayoff)}</p>
              </div>
              <div className={`p-4 text-center ${r.advantage > 0 ? "bg-[#1a2744]" : "bg-green-800"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.advantage > 0 ? "Investing wins by" : "Paying off wins by"}
                </p>
                <p className="text-2xl font-medium text-white">{fmtK(Math.abs(r.advantage))}</p>
                <p className="text-xs text-green-300">after {r.horizonYears.toFixed(0)} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Invest instead</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalInvest)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="If you prepay, interest saved" value={fmtK(r.interestSaved)} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Debt-free" value={fmtMonths(r.fast.payoffMonths)} sub={`${fmtMonths(r.monthsSaved)} early`} tone="green" />
              <Stat label="Guaranteed return" value={pct(r.effectiveDebtRate, 2)} tone="green" />
              <Stat label="Expected after-tax return" value={pct(r.afterTaxInvestReturn, 2)} tone="amber" sub="not guaranteed" />
              <Stat label="Regular payment" value={`${fmt(r.basePayment)}/mo`} />
            </div>
            {/* Branch on the projected outcome, not on the spread. The spread charges
                the investment tax every year while the projection defers it to a single
                gain taxed at the end, so the two can point opposite ways — which used to
                put "Paying off wins here" directly under a tile reading "Investing wins". */}
            <div className="space-y-2">
              <Takeaway tone={r.advantage > 0 ? "blue" : "green"}>
                {r.advantage > 0 ? (
                  <>
                    On these assumptions investing edges ahead by{" "}
                    <strong>{fmtK(Math.abs(r.advantage))}</strong> over{" "}
                    {r.horizonYears.toFixed(0)} years. But that margin is an expectation, not a promise:
                    a decade of poor returns flips it, while the {pct(r.effectiveDebtRate, 2)} you save
                    by prepaying happens no matter what markets do.
                    {r.spread <= 0 && (
                      <>
                        {" "}
                        The spread above reads negative because it charges the investment tax every
                        year; this projection compounds untaxed and taxes the gain once at the end,
                        which is what tips it.
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Paying off wins here.</strong> Your debt costs{" "}
                    {pct(r.effectiveDebtRate, 2)} after tax, more than the{" "}
                    {pct(r.afterTaxInvestReturn, 2)} you&apos;d expect to net from investing — and the
                    payoff return is guaranteed. Prepaying also clears the debt{" "}
                    {fmtMonths(r.monthsSaved)} early, freeing {fmt(r.basePayment)}/mo afterwards.
                  </>
                )}
              </Takeaway>
              {r.effectiveDebtRate > 10 && (
                <Takeaway tone="green">
                  At <strong>{pct(r.effectiveDebtRate, 2)}</strong> this debt costs more than the
                  long-run average return of a broad stock index, before any tax on that return — and
                  the debt cost is certain while the return is not. Once the effective rate is into
                  double digits the gap is wider than the range long-run return assumptions usually
                  fall in, so the comparison stops being close.
                </Takeaway>
              )}
            </div>
          </div>

          <ChartCard title="Net worth under each strategy">
            <LineChart
              ariaLabel="Net worth when prepaying the debt compared with investing the extra money"
              periodsPerYear={12}
              baselineZero
              series={[
                { label: "Prepay, then invest", color: COLORS.green, data: r.payoffNet },
                { label: "Invest from day one", color: COLORS.blue, data: r.investNet, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="amber">
                The prepay line jumps when the loan clears and the whole payment starts going into
                investments instead. Net worth counts both sides — portfolio minus remaining balance — so
                the two paths are compared on the same footing.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Difference between the strategies">
            <LineChart
              ariaLabel="How far ahead investing is compared with prepaying, month by month"
              periodsPerYear={12}
              baselineZero
              series={[{ label: "Investing minus prepaying", color: COLORS.blue, data: r.difference }]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Above the zero line investing is ahead; below it prepaying is. This is the same
                comparison as the chart above, on its own scale — a {fmtK(Math.abs(r.advantage))} gap is
                invisible against two lines that span {fmtK(r.netRange)}, which is why they look like one.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Total interest paid">
            <BarChart
              ariaLabel="Total interest paid on the current schedule compared with prepaying"
              height={200}
              bars={[
                { label: "Minimum payments", segments: [{ label: "Interest", value: r.base.totalInterest, color: COLORS.amber }] },
                { label: "With extra payments", segments: [{ label: "Interest", value: r.fast.totalInterest, color: COLORS.green }] },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Enter a balance, rate, years remaining, and the extra amount you have available each month.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
