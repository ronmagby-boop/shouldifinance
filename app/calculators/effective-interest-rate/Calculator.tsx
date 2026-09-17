"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment, aprFromFees, effectiveAnnualRate } from "../../lib/finance";

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

  const loan = useMemo(() => {
    if (n(loanAmount) <= 0 || n(rate) <= 0) return null;
    const months = Math.max(1, Math.round(n(term) * 12));
    const pointCost = (n(loanAmount) * n(points)) / 100;
    const totalFees = pointCost + n(fees);
    const monthly = payment(n(loanAmount), n(rate), months);

    // APR over the full term — the disclosed figure.
    const apr = aprFromFees(n(loanAmount), n(rate), months, totalFees);

    // Effective rate if you only keep the loan for a few years: the same fees
    // are spread over far fewer payments, so the true cost is higher.
    const holdMonths = Math.max(1, Math.round(n(holdYears) * 12));
    const r = n(rate) / 100 / 12;
    let bal = n(loanAmount);
    let interestPaid = 0;
    for (let i = 0; i < holdMonths; i++) {
      const int = bal * r;
      interestPaid += int;
      bal = Math.max(0, bal - (monthly - int));
    }
    const costOverHold = interestPaid + totalFees;
    const effectiveHoldRate = (costOverHold / n(loanAmount) / n(holdYears)) * 100;

    return {
      pointCost,
      totalFees,
      monthly,
      apr,
      interestPaid,
      costOverHold,
      effectiveHoldRate,
      premium: apr - n(rate),
      balanceLeft: bal,
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
            <NumField label="Loan amount" value={loanAmount} onChange={setLoanAmount} placeholder="350000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Quoted rate" value={rate} onChange={setRate} placeholder="6.375" suffix="%" step={0.125} />
              <NumField label="Term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Discount points" value={points} onChange={setPoints} placeholder="1" suffix="%" step={0.125} />
              <NumField label="Other fees" value={fees} onChange={setFees} placeholder="3400" prefix="$" />
            </div>
            <NumField
              label="How long you'll keep the loan"
              value={holdYears}
              onChange={setHoldYears}
              placeholder="7"
              suffix="yrs"
              hint="Fees spread over fewer years make the real rate higher."
            />
          </div>
        </Card>

        <Card title="What you actually pay" badge="EFFECTIVE" badgeTone="amber" className="bg-gray-50">
          {loan ? (
            <>
              <Headline label="Effective APR over the full term" value={pct(loan.apr, 3)} tone="gray" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Quoted rate" value={pct(n(rate), 3)} />
                <Stat label="Rate premium from fees" value={`+${pct(loan.premium, 3)}`} tone="amber" />
                <Stat label="Points cost" value={fmt(loan.pointCost)} />
                <Stat label="Total upfront cost" value={fmt(loan.totalFees)} tone="amber" />
                <Stat label="Monthly payment" value={fmt(loan.monthly)} />
                <Stat
                  label={`Effective cost if you leave in ${n(holdYears)} yrs`}
                  value={pct(loan.effectiveHoldRate, 2)}
                  tone="red"
                />
              </div>
              <Takeaway tone="amber">
                Fees of <strong>{fmt(loan.totalFees)}</strong> turn a {pct(n(rate), 3)} rate into a{" "}
                <strong>{pct(loan.apr, 3)}</strong> APR over 30 years. But if you sell or refinance after{" "}
                {n(holdYears)} years, those same fees spread over far fewer payments — the real cost of
                borrowing works out closer to <strong>{pct(loan.effectiveHoldRate, 2)}</strong> a year.
                That is the number to use when deciding whether points are worth buying.
              </Takeaway>
            </>
          ) : (
            <EmptyState>Enter a loan amount and quoted rate to see the effective cost.</EmptyState>
          )}
        </Card>
      </div>

      {loan && (
        <ChartCard title="Quoted rate vs. what it really costs">
          <BarChart
            ariaLabel="Comparison of quoted rate, full-term APR, and effective rate over a shorter holding period"
            height={210}
            bars={[
              { label: "Quoted rate", segments: [{ label: "Rate", value: n(rate), color: COLORS.gray }] },
              { label: "APR full term", segments: [{ label: "Rate", value: loan.apr, color: COLORS.blue }] },
              { label: `Effective at ${n(holdYears)} yrs`, segments: [{ label: "Rate", value: loan.effectiveHoldRate, color: COLORS.amber }] },
            ]}
            valueFormat={(v) => `${v.toFixed(2)}%`}
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
            <NumField label="Nominal annual rate" value={savingRate} onChange={setSavingRate} placeholder="4.5" suffix="%" step={0.05} />
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
            <NumField label="Deposit amount" value={deposit} onChange={setDeposit} placeholder="25000" prefix="$" />
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
