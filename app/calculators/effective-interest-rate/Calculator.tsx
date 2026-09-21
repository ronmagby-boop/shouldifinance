"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment, aprFromFees, aprFromFeesHeld, balanceAfter, effectiveAnnualRate } from "../../lib/finance";

const FREQ: Record<string, number> = {
  daily: 365, monthly: 12, quarterly: 4, semiannually: 2, annually: 1,
};

export default function Calculator() {
  // Borrowing side
  const [loanAmount, setLoanAmount] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [points, setPoints] = useState<Num>("");
  const [fees, setFees] = useState<Num>("");
  const [holdYears, setHoldYears] = useState<Num>("");

  // Saving side
  const [savingRate, setSavingRate] = useState<Num>("");
  const [freq, setFreq] = useState("monthly");
  const [deposit, setDeposit] = useState<Num>("");

  const loadExample = () => {
    setLoanAmount(350000);
    setRate(6.375);
    setTerm(30);
    setPoints(1);
    setFees(3400);
    setHoldYears(7);
    setSavingRate(4.5);
    setFreq("monthly");
    setDeposit(25000);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setLoanAmount("");
    setRate("");
    setTerm("");
    setPoints("");
    setFees("");
    setHoldYears("");
    setSavingRate("");
    setFreq("monthly");
    setDeposit("");
  };

  const loan = useMemo(() => {
    if (n(loanAmount) <= 0 || n(rate) <= 0) return null;
    const months = Math.max(12, Math.round(n(term) * 12));
    const pointCost = (n(loanAmount) * n(points)) / 100;
    const totalFees = pointCost + n(fees);
    const monthly = payment(n(loanAmount), n(rate), months);

    /* Over the full term. The same function loan-estimate-comparison uses per
     * lender, so the same loan entered on either page gives the same answer. */
    const apr = aprFromFees(n(loanAmount), n(rate), months, totalFees);

    /* Over a shorter hold.
     *
     * This used to be (interest over the hold + fees) / loan amount / years —
     * an average annual cost measured against the opening balance, which is
     * not a rate at all. Because the balance falls as it amortises, that
     * average lands just under the quoted rate, and adding the fees pushed it
     * back to roughly the quoted rate: 6.37% against a 6.375% quote and a
     * 6.566% full-term APR. The page then explained, correctly, that fees over
     * fewer payments cost more — beside a number saying they cost less.
     *
     * The borrower receives the loan net of points and fees, makes the
     * scheduled payments for the hold, and repays the balance in one lump on
     * the sale or refinance. The rate that prices those flows is the answer,
     * and it is always above the full-term figure. */
    const holdCapped = Math.min(Math.max(1, Math.round(n(holdYears))), months / 12);
    const holdMonths = Math.round(holdCapped * 12);
    const holdRate = aprFromFeesHeld(n(loanAmount), n(rate), months, totalFees, holdMonths);

    return {
      pointCost,
      totalFees,
      monthly,
      apr,
      holdRate,
      holdCapped,
      holdMonths,
      holdWasCapped: n(holdYears) > months / 12,
      isFullTerm: holdMonths >= months,
      premium: apr - n(rate),
      holdPremium: holdRate - n(rate),
      balanceLeft: balanceAfter(n(loanAmount), n(rate), months, holdMonths),
      termYears: months / 12,
    };
  }, [loanAmount, rate, term, points, fees, holdYears]);

  const saving = useMemo(() => {
    if (n(savingRate) <= 0) return null;
    const apy = effectiveAnnualRate(n(savingRate), FREQ[freq]);
    const annual = FREQ[freq];
    const perYear = n(deposit) * (apy / 100);
    const simpleYear = n(deposit) * (n(savingRate) / 100);
    const comparisons = Object.entries(FREQ).map(([label, periods]) => ({
      label,
      apy: effectiveAnnualRate(n(savingRate), periods),
    }));
    return { apy, annual, perYear, simpleYear, bonus: perYear - simpleYear, comparisons };
  }, [savingRate, freq, deposit]);

  return (
    <CalcShell
      slug="effective-interest-rate"
      intro="A quoted rate is rarely what you actually pay or earn. Points and fees push a loan's real cost above its rate, and compounding pushes a savings yield above its rate. Both sides are here."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["loan-estimate-comparison", "mortgage-payment", "compound-interest"]}
      disclaimer="For educational purposes only. APR calculated here is an approximation using the fees you enter and may differ from a lender's disclosed APR, which follows specific regulatory rules about which fees are included. Not a commitment to lend."
    >
      {/* BORROWING */}
      <h2 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">
        What a loan really costs
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="The quoted loan" badge="BORROWING" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Loan amount" value={loanAmount} onChange={setLoanAmount} min={0} placeholder="350000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Quoted rate" value={rate} onChange={setRate} min={0} placeholder="6.375" suffix="%" step={0.125} />
              <NumField label="Term" value={term} onChange={setTerm} min={1} placeholder="30" suffix="yrs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Discount points" value={points} onChange={setPoints} min={0} placeholder="1" suffix="%" step={0.125} />
              <NumField
                label="Other fees"
                value={fees}
                onChange={setFees}
                min={0}
                placeholder="3400"
                hint="Everything but the points — those go in the field beside this one."
                prefix="$"
              />
            </div>
            <NumField
              label="How long you'll keep the loan"
              value={holdYears}
              onChange={setHoldYears}
              min={1}
              placeholder="7"
              suffix="yrs"
              hint={
                loan && loan.holdWasCapped
                  ? `Capped at the ${loan.termYears}-year term — you cannot hold a loan longer than it runs.`
                  : "Fees spread over fewer years make the real rate higher."
              }
            />
          </div>
        </Card>

        <Card title="What you actually pay" badge="EFFECTIVE" badgeTone="amber" className="bg-gray-50">
          {loan ? (
            <>
              {/* Labelled the way loan-estimate-comparison labels its column, and
                  computed by the same function, so the two pages agree. */}
              <Headline label="APR over the full term (all costs)" value={pct(loan.apr, 3)} tone="gray" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Quoted rate" value={pct(n(rate), 3)} />
                <Stat label="Rate premium from fees" value={`+${pct(loan.premium, 3)}`} tone="amber" />
                <Stat label="Points cost" value={fmt(loan.pointCost)} />
                <Stat label="Total upfront cost" value={fmt(loan.totalFees)} tone="amber" />
                <Stat label="Monthly payment" value={fmt(loan.monthly)} />
                <Stat
                  label={
                    loan.isFullTerm
                      ? "APR if you keep it the full term"
                      : `APR if you leave in ${loan.holdCapped} ${loan.holdCapped === 1 ? "yr" : "yrs"}`
                  }
                  value={pct(loan.holdRate, 3)}
                  sub={`+${pct(loan.holdPremium, 3)} on the quote`}
                  tone="red"
                />
              </div>
              <Takeaway tone="amber">
                Fees of <strong>{fmt(loan.totalFees)}</strong> turn a {pct(n(rate), 3)} quote into a{" "}
                <strong>{pct(loan.apr, 3)}</strong> APR over {loan.termYears} years.
                {loan.isFullTerm ? (
                  <>
                    {" "}
                    Holding it the whole way is the cheapest that cost can be spread — leave earlier and
                    the same fees land on fewer payments, which raises the rate rather than lowering it.
                  </>
                ) : (
                  <>
                    {" "}
                    Sell or refinance after {loan.holdCapped} {loan.holdCapped === 1 ? "year" : "years"} and those fees are spread over{" "}
                    {loan.holdMonths} payments instead of {loan.termYears * 12}, so the real cost rises to{" "}
                    <strong>{pct(loan.holdRate, 3)}</strong> — you still owe{" "}
                    <strong>{fmt(loan.balanceLeft)}</strong> at that point and repay it in one go. That is
                    the number to use when deciding whether points are worth buying.
                  </>
                )}
              </Takeaway>
              <p className="text-xs text-gray-400 leading-relaxed mt-3">
                Both figures treat everything you entered as a cost of borrowing. A lender&apos;s
                disclosed APR counts only finance charges, so it reads lower than this — use these to
                compare quotes, not to match a Loan Estimate.
              </p>
            </>
          ) : (
            <EmptyState>Enter a loan amount and quoted rate to see the effective cost.</EmptyState>
          )}
        </Card>
      </div>

      {loan && (
        <ChartCard
          title="Quoted rate vs. what it really costs"
          footnote="The shorter the hold, the fewer payments the up-front cost is spread across — so the bar on the right is always the tallest."
        >
          <BarChart
            ariaLabel="Comparison of the quoted rate, the APR over the full term, and the APR over a shorter holding period"
            height={210}
            bars={[
              { label: "Quoted rate", segments: [{ label: "Rate", value: n(rate), color: COLORS.gray }] },
              { label: "APR full term", segments: [{ label: "Rate", value: loan.apr, color: COLORS.blue }] },
              {
                label: loan.isFullTerm ? "APR full term" : `APR at ${loan.holdCapped} ${loan.holdCapped === 1 ? "yr" : "yrs"}`,
                segments: [{ label: "Rate", value: loan.holdRate, color: COLORS.amber }],
              },
            ]}
            valueFormat={(v) => `${v.toFixed(3)}%`}
          />
        </ChartCard>
      )}

      {/* SAVING */}
      <h2 className="text-base font-medium text-gray-900 mb-3 mt-6 pb-2 border-b border-gray-100">
        What a savings rate really earns
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The quoted yield" badge="SAVING" badgeTone="green">
          <div className="space-y-4">
            <NumField label="Nominal annual rate" value={savingRate} onChange={setSavingRate} min={0} placeholder="4.5" suffix="%" step={0.05} />
            <SelectField
              label="Compounding frequency"
              value={freq}
              onChange={setFreq}
              options={[
                { value: "daily", label: "Daily" },
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "semiannually", label: "Semi-annually" },
                { value: "annually", label: "Annually" },
              ]}
            />
            <NumField label="Deposit amount" value={deposit} onChange={setDeposit} min={0} placeholder="25000" prefix="$" />
          </div>
        </Card>

        <Card title="What you actually earn" badge="APY" badgeTone="green" className="bg-gray-50">
          {saving ? (
            <>
              <Headline label="Effective annual yield (APY)" value={pct(saving.apy, 3)} />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Nominal rate" value={pct(n(savingRate), 3)} />
                <Stat label="Compounding bonus" value={`+${pct(saving.apy - n(savingRate), 3)}`} tone="green" />
                <Stat label="First-year interest" value={fmt(saving.perYear)} tone="green" />
                <Stat label="Without compounding" value={fmt(saving.simpleYear)} />
              </div>
              <Takeaway>
                Compounding {freq} turns a {pct(n(savingRate), 2)} rate into a{" "}
                <strong>{pct(saving.apy, 3)}</strong> yield — an extra{" "}
                <strong>{fmt(saving.bonus)}</strong> in the first year on a {fmt(n(deposit))} deposit. When
                comparing accounts, always compare APY to APY; the headline rate hides this difference.
              </Takeaway>
            </>
          ) : (
            <EmptyState>Enter a nominal savings rate to see its true yield.</EmptyState>
          )}
        </Card>
      </div>

      {saving && (
        <ChartCard title="Same rate, different compounding">
          <BarChart
            ariaLabel="Effective annual yield at different compounding frequencies for the same nominal rate"
            height={200}
            bars={saving.comparisons.map((c) => ({
              label: c.label.charAt(0).toUpperCase() + c.label.slice(1),
              segments: [{ label: "APY", value: c.apy, color: c.label === freq ? COLORS.green : COLORS.gray }],
            }))}
            valueFormat={(v) => `${v.toFixed(3)}%`}
          />
          <div className="mt-4">
            <Takeaway tone="blue">
              More frequent compounding always yields more, but the gains shrink fast — moving from annual
              to monthly matters far more than moving from monthly to daily.
            </Takeaway>
          </div>
        </ChartCard>
      )}
    </CalcShell>
  );
}
