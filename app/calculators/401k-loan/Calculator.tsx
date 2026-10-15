"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, has, months, n, pct, type Num,
} from "../../components/Inputs";
import { payment } from "../../lib/finance";
import { EARLY_DISTRIBUTION_AGE } from "../../lib/distributionTax";
import { KLOAN_DOLLAR_CAP, KLOAN_MAX_YEARS, jobChange, loanInterest, maxLoan, opportunityCost } from "../../lib/k401Loan";
import type { FilingStatus } from "../../lib/tax";

type Alt = { key: string; label: string; rate: Num; years: Num };

/** 59.5 as the IRS writes it, 59½. */
const ageHalf = (age: number) => (age % 1 === 0.5 ? `${Math.floor(age)}½` : String(age));

export default function Calculator() {
  const [amount, setAmount] = useState<Num>("");
  const [vested, setVested] = useState<Num>("");
  const [floor, setFloor] = useState(false);
  const [rate, setRate] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [home, setHome] = useState(false);
  const [ret, setRet] = useState<Num>("");
  const [keepContributing, setKeepContributing] = useState<"yes" | "no">("yes");
  const [missedContribution, setMissedContribution] = useState<Num>("");
  const [jobRisk, setJobRisk] = useState(false);
  const [leaveAfter, setLeaveAfter] = useState<Num>("");
  const [age, setAge] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [status, setStatus] = useState<FilingStatus>("single");
  const [stateRate, setStateRate] = useState<Num>("");
  const [alts, setAlts] = useState<Alt[]>([
    { key: "heloc", label: "HELOC", rate: "", years: "" },
    { key: "personal", label: "Personal loan", rate: "", years: "" },
    { key: "card", label: "Credit card", rate: "", years: "" },
  ]);

  const setAlt = (key: string, patch: Partial<Alt>) => setAlts((as) => as.map((a) => (a.key === key ? { ...a, ...patch } : a)));

  const loadExample = () => {
    setAmount(10000); setVested(60000); setFloor(false); setRate(8.5); setYears(5); setHome(false);
    setRet(7); setKeepContributing("yes"); setMissedContribution("");
    setJobRisk(true); setLeaveAfter(12); setAge(40); setIncome(70000); setStatus("single"); setStateRate(5);
    setAlts([
      { key: "heloc", label: "HELOC", rate: 8, years: 5 },
      { key: "personal", label: "Personal loan", rate: 12, years: 5 },
      { key: "card", label: "Credit card", rate: 24, years: 5 },
    ]);
  };

  const clearExample = () => {
    for (const f of [setAmount, setVested, setRate, setYears, setRet, setMissedContribution, setLeaveAfter, setAge, setIncome, setStateRate]) f("");
    setFloor(false); setHome(false); setKeepContributing("yes"); setJobRisk(false); setStatus("single");
    setAlts((as) => as.map((a) => ({ ...a, rate: "", years: "" })));
  };

  const r = useMemo(() => {
    if (!(n(amount) > 0) || !(n(vested) > 0) || !has(rate) || !(n(years) > 0)) return null;
    const limit = maxLoan(n(vested), floor);
    const borrowed = Math.min(n(amount), limit);
    const termYears = home ? n(years) : Math.min(n(years), KLOAN_MAX_YEARS);
    const term = Math.round(termYears * 12);
    if (borrowed <= 0 || term <= 0) return { kind: "none" as const, limit };
    const cost = opportunityCost(borrowed, n(rate), term, n(ret), keepContributing === "no" ? n(missedContribution) : 0);
    const alternatives = alts
      .filter((a) => has(a.rate) && n(a.years) > 0)
      .map((a) => {
        const m = Math.round(n(a.years) * 12);
        return { ...a, payment: payment(borrowed, n(a.rate), m), cost: loanInterest(borrowed, n(a.rate), m) };
      });
    const job = jobRisk && has(age)
      ? jobChange(borrowed, n(rate), term, n(leaveAfter), { otherIncome: n(income), status, stateRatePct: n(stateRate), age: n(age) + n(leaveAfter) / 12, exception: false })
      : null;
    return {
      kind: "ok" as const, limit, borrowed, term, termCapped: !home && n(years) > KLOAN_MAX_YEARS, overLimit: n(amount) > limit,
      cost, alternatives, job,
    };
  }, [amount, vested, floor, rate, years, home, ret, keepContributing, missedContribution, alts, jobRisk, leaveAfter, age, income, status, stateRate]);

  return (
    <CalcShell
      slug="401k-loan"
      intro="A 401(k) loan pays its interest back into your own account, so the rate is not the real cost. The cost is the growth the money misses while it is out, and the risk of a tax bill if you leave your job before it is repaid. See both, and how it compares with borrowing elsewhere."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["early-withdrawal", "heloc-debt-payoff", "debt-consolidation", "401k-vs-debt-payoff"]}
      disclaimer="For educational purposes only and not tax advice. Your plan sets whether it offers loans, its rate, its limits and what happens when you leave. Growth assumes a steady return, which investments do not deliver. Tax on a distribution uses the same federal brackets, standard deduction and flat state rate as the early withdrawal calculator."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The loan" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Amount needed" value={amount} onChange={setAmount} min={0} placeholder="10000" prefix="$" />
              <NumField label="Vested 401(k) balance" value={vested} onChange={setVested} min={0} placeholder="60000" prefix="$" />
            </div>
            <Toggle checked={floor} onChange={setFloor} label="Plan has the $10,000 exception">
              My plan lets me borrow up to $10,000 even when that is more than half my balance (plans are not required to)
            </Toggle>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Plan's loan rate" value={rate} onChange={setRate} min={0} placeholder="8.5" suffix="%" step={0.25} hint="Your plan sets it; often prime plus 1 or 2." />
              <NumField label="Repay over" value={years} onChange={setYears} min={0} placeholder="5" suffix="yrs" hint={home ? "Your plan sets the longest term for a home loan." : `Up to ${KLOAN_MAX_YEARS} years.`} />
            </div>
            <Toggle checked={home} onChange={setHome} label="Buying a principal residence">
              The loan is to buy my main home, which can be repaid over more than five years if the plan allows
            </Toggle>
          </div>
        </Card>
        <Card title="Your account" className="h-full">
          <div className="space-y-4">
            <NumField label="Return the money would have earned" value={ret} onChange={setRet} placeholder="7" suffix="%" step={0.25} hint="A year, on what the money is invested in now." />
            <SelectField
              label="Keep contributing while repaying?"
              value={keepContributing}
              onChange={(v) => setKeepContributing(v as "yes" | "no")}
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No, contributions stop" }]}
              hint="Some people cut contributions to afford the repayments; ask your plan whether it restricts them during a loan."
            />
            {keepContributing === "no" && (
              <NumField label="Monthly contribution missed, incl. match" value={missedContribution} onChange={setMissedContribution} min={0} placeholder="500" prefix="$" />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Borrowing elsewhere instead" className="h-full">
          <div className="space-y-3">
            {alts.map((a) => (
              <div key={a.key} className="grid grid-cols-2 gap-3">
                <NumField label={`${a.label} rate`} value={a.rate} onChange={(v) => setAlt(a.key, { rate: v })} min={0} placeholder={a.key === "card" ? "24" : a.key === "personal" ? "12" : "8"} suffix="%" step={0.25} />
                <NumField label={`${a.label} term`} value={a.years} onChange={(v) => setAlt(a.key, { years: v })} min={0} placeholder="5" suffix="yrs" />
              </div>
            ))}
            <p className="text-xs text-gray-400 leading-relaxed">Leave any blank to skip it. A card here means paying it down on a fixed schedule.</p>
          </div>
        </Card>
        <Card title="If you leave your job" className="h-full">
          <div className="space-y-4">
            <Toggle checked={jobRisk} onChange={setJobRisk} label="Show a job change">
              Show what happens if I leave my job before the loan is repaid
            </Toggle>
            {jobRisk && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Leave after" value={leaveAfter} onChange={setLeaveAfter} min={0} placeholder="12" suffix="mo" />
                  <NumField label="Your age now" value={age} onChange={setAge} min={0} placeholder="40" suffix="yrs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Other income that year" value={income} onChange={setIncome} min={0} placeholder="70000" prefix="$" />
                  <NumField label="State tax rate" value={stateRate} onChange={setStateRate} min={0} placeholder="5" suffix="%" step={0.25} />
                </div>
                <SelectField
                  label="Filing status"
                  value={status}
                  onChange={(v) => setStatus(v as FilingStatus)}
                  options={[{ value: "single", label: "Single" }, { value: "married", label: "Married filing jointly" }, { value: "head", label: "Head of household" }]}
                />
              </>
            )}
          </div>
        </Card>
      </div>

      {r && r.kind === "ok" ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="The real cost of the loan" value={fmt(r.cost.totalCost)} tone={r.cost.totalCost > 0 ? "gray" : "green"} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Most you can borrow" value={fmt(r.limit)} sub={r.limit === KLOAN_DOLLAR_CAP ? "the $50,000 cap" : "half your vested balance"} />
              <Stat label="Payment" value={`${fmt(r.cost.payment)}/mo`} sub={`over ${months(r.term)}`} />
              <Stat label="Interest paid to yourself" value={fmt(r.cost.interestToYourself)} sub="goes back into your account" />
              <Stat
                label={r.cost.accountDifference >= 0 ? "Account ends ahead by" : "Account ends behind by"}
                value={fmt(Math.abs(r.cost.accountDifference))}
                tone={r.cost.accountDifference >= 0 ? "green" : "red"}
                sub={`counting the interest paid in, at ${pct(n(ret), 1)} a year`}
              />
            </div>
            <div className="space-y-2">
              {r.overLimit && (
                <Takeaway tone="red">
                  {fmt(n(amount))} is more than the {fmt(r.limit)} limit; the figures use {fmt(r.borrowed)}. The IRS treats the
                  part of a loan over the limit as a distribution.
                </Takeaway>
              )}
              {r.termCapped && (
                <Takeaway tone="amber">A loan that is not for a home must be repaid within {KLOAN_MAX_YEARS} years, so the term is held there.</Takeaway>
              )}
              <Takeaway tone="blue">
                The interest goes back into your account, so the rate is not the cost. You pay{" "}
                {fmt(r.cost.interestToYourself)} of interest out of take-home pay (the IRS: &quot;Loan repayments are not plan
                contributions.&quot;), and your account ends {fmt(Math.abs(r.cost.accountDifference))}{" "}
                {r.cost.accountDifference >= 0 ? "ahead of" : "behind"} where it would have been. Together that is{" "}
                <strong>{fmt(r.cost.growthMissed)}</strong>, the growth the money would have earned while it was out
                {r.cost.missedContributions > 0 ? `, plus ${fmt(r.cost.missedContributions)} for the contributions you stopped` : ""}.
                It is the figure to set against another loan&apos;s interest.
              </Takeaway>
            </div>
          </div>

          {r.alternatives.length > 0 && (
            <div className="border border-gray-200 rounded-2xl p-5 mb-4">
              <h2 className="text-sm font-medium text-gray-900 mb-1">Against borrowing {fmt(r.borrowed)} elsewhere</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                The 401(k) loan&apos;s cost is the growth your account misses; another loan&apos;s cost is the interest you pay the lender.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-xs text-gray-400 text-left">
                      <th className="py-2 pr-3 font-normal">Borrowing from</th>
                      <th className="py-2 pr-3 font-normal">Payment</th>
                      <th className="py-2 font-normal">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-100 font-medium">
                      <td className="py-2 pr-3">401(k) loan</td>
                      <td className="py-2 pr-3">{fmt(r.cost.payment)}/mo</td>
                      <td className="py-2">{fmt(r.cost.totalCost)}</td>
                    </tr>
                    {r.alternatives.map((a) => (
                      <tr key={a.key} className="border-t border-gray-100">
                        <td className="py-2 pr-3">{a.label} at {pct(n(a.rate), 2)}</td>
                        <td className="py-2 pr-3">{fmt(a.payment)}/mo</td>
                        <td className={`py-2 ${a.cost < r.cost.totalCost ? "text-green-700" : ""}`}>{fmt(a.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mt-3">
                The 401(k) loan also carries the job-change risk below, which the others do not; a HELOC puts your home up as
                security instead. The{" "}
                <Link href="/calculators/heloc-debt-payoff" className="text-green-700 underline">HELOC debt payoff calculator</Link> and the{" "}
                <Link href="/calculators/debt-consolidation" className="text-green-700 underline">debt consolidation calculator</Link> look at those options in detail.
              </p>
            </div>
          )}

          {r.job && (
            <div className="border border-gray-200 rounded-2xl p-5 mb-4">
              <h2 className="text-sm font-medium text-gray-900 mb-3">If you leave your job after {months(n(leaveAfter))}</h2>
              {r.job.outstanding <= 0 ? (
                <Takeaway tone="green">The loan is repaid by then, so leaving changes nothing.</Takeaway>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <Stat label="Still owed" value={fmt(r.job.outstanding)} />
                    <Stat label="Federal tax" value={fmt(r.job.fedTax)} />
                    <Stat label="State tax" value={fmt(r.job.stateTax)} />
                    <Stat label={`10% additional tax`} value={fmt(r.job.penalty)} sub={r.job.penaltyApplies ? `under ${ageHalf(EARLY_DISTRIBUTION_AGE)}` : `not owed at ${ageHalf(EARLY_DISTRIBUTION_AGE)} or over`} />
                  </div>
                  <Takeaway tone="red">
                    Your plan may require the {fmt(r.job.outstanding)} still owed to be repaid when you leave. If it is not, it is
                    treated as a distribution: about <strong>{fmt(r.job.total)}</strong> in tax on these numbers. You can avoid that by
                    putting the same amount into an IRA or another eligible plan by your tax-return due date, including
                    extensions, for the year it happens. The{" "}
                    <Link href="/calculators/early-withdrawal" className="underline">early withdrawal calculator</Link> taxes
                    distributions the same way.
                  </Takeaway>
                </>
              )}
            </div>
          )}
        </>
      ) : r && r.kind === "none" ? (
        <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-amber-900">No loan is available on this balance.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the amount, your vested balance, the plan&apos;s rate and the term.</EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Rules to know</h2>
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <p>
            <strong>Your plan may not offer loans.</strong> Plans can, but do not have to; check the Summary Plan Description
            or ask the plan administrator. IRAs cannot lend at all.
          </p>
          <p>
            <strong>The limit.</strong> Half your vested balance or {fmt(KLOAN_DOLLAR_CAP)}, whichever is less. If half your
            balance is under $10,000 your plan may let you borrow up to $10,000, but it does not have to. Earlier loans in the
            past year can lower the limit.
          </p>
          <p>
            <strong>Repaying.</strong> Generally within {KLOAN_MAX_YEARS} years, with payments at least quarterly, usually
            through payroll. A loan to buy your main home can run longer. Repayments come out of take-home pay, because
            they are not plan contributions.
          </p>
          <p>
            <strong>Missing payments</strong> turns the unpaid balance into a taxable distribution, which may also carry the 10%
            additional tax.
          </p>
        </div>
      </div>
    </CalcShell>
  );
}
