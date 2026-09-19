"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

type Debt = { name: string; balance: Num; rate: Num; pmt: Num; payoff: boolean };
const BLANK: Debt = { name: "", balance: "", rate: "", pmt: "", payoff: true };

/** VA funding fee on a cash-out refinance, financed into the loan. */
const VA_FUNDING_FEE = 2.15;

/** Total interest paying a balance down at a fixed payment until it clears. */
function interestToClear(balance: number, annualRate: number, pmt: number): number {
  const r = annualRate / 100 / 12;
  let bal = balance;
  let total = 0;
  for (let i = 0; i < 2000 && bal > 0.005; i++) {
    const interest = bal * r;
    const principal = pmt - interest;
    if (principal <= 0) return Infinity;
    total += interest;
    bal -= principal;
  }
  return total;
}

/** Interest and payoff month for a loan carrying an extra principal payment. */
function amortizeWithExtra(principal: number, annualRate: number, term: number, extra: number) {
  const r = annualRate / 100 / 12;
  const pmt = payment(principal, annualRate, term);
  let bal = principal;
  let interest = 0;
  let months = 0;
  const cap = term * 4 + 1200;
  for (let i = 0; i < cap && bal > 0.005; i++) {
    const int = bal * r;
    const prin = Math.min(pmt + extra - int, bal);
    if (prin <= 0) return { interest: Infinity, months: Infinity };
    interest += int;
    bal -= prin;
    months = i + 1;
  }
  return { interest, months };
}

export default function Calculator() {
  const [debts, setDebts] = useState<Debt[]>([{ ...BLANK }, { ...BLANK }, { ...BLANK }]);
  const [cashOut, setCashOut] = useState<Num>("");
  const [closing, setClosing] = useState<Num>("");
  const [va, setVa] = useState(false);
  const [newRate, setNewRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");

  const update = (i: number, patch: Partial<Debt>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addDebt = () => setDebts((d) => [...d, { ...BLANK }]);
  const removeDebt = (i: number) => setDebts((d) => (d.length > 1 ? d.filter((_, idx) => idx !== i) : d));

  const loadExample = () => {
    setDebts([
      { name: "Mortgage", balance: 248000, rate: 6.25, pmt: 1720, payoff: true },
      { name: "Credit card", balance: 14200, rate: 24.9, pmt: 430, payoff: true },
      { name: "Store card", balance: 3800, rate: 27.99, pmt: 120, payoff: true },
      { name: "Car loan", balance: 21500, rate: 7.4, pmt: 480, payoff: true },
      { name: "Student loan", balance: 18600, rate: 5.2, pmt: 205, payoff: false },
    ]);
    setCashOut(0);
    setClosing(6500);
    setVa(false);
    setNewRate(6.75);
    setTerm(30);
    setExtra("");
  };

  const r = useMemo(() => {
    const live = debts.filter((d) => n(d.balance) > 0);
    const term_m = Math.round(n(term) * 12);
    if (live.length === 0 || term_m <= 0 || n(newRate) <= 0) return null;

    /**
     * A payment at or below the monthly interest never touches principal, so
     * that debt has no payoff date and no lifetime interest to compare. The
     * epsilon is relative because a round figure like 14200 x 24.9%/12 does not
     * land exactly on itself in binary floating point.
     */
    const stuck = live.filter((d) => {
      const monthlyInterest = (n(d.balance) * n(d.rate)) / 100 / 12;
      return n(d.pmt) > 0 && n(d.rate) > 0 && n(d.pmt) <= monthlyInterest * (1 + 1e-9);
    });
    if (stuck.length > 0) {
      return {
        blocked: true as const,
        stuck: stuck.map((d, i) => ({
          name: d.name.trim() || `Debt ${i + 1}`,
          needed: (n(d.balance) * n(d.rate)) / 100 / 12,
          pmt: n(d.pmt),
          rate: n(d.rate),
          balance: n(d.balance),
        })),
      };
    }
    if (live.some((d) => n(d.pmt) <= 0)) return null;

    const totalBalance = live.reduce((a, d) => a + n(d.balance), 0);
    const totalPayments = live.reduce((a, d) => a + n(d.pmt), 0);
    const blendedAll = totalBalance > 0
      ? live.reduce((a, d) => a + n(d.balance) * n(d.rate), 0) / totalBalance
      : 0;

    const checked = live.filter((d) => d.payoff);
    const payoffTotal = checked.reduce((a, d) => a + n(d.balance), 0);
    const checkedPayments = checked.reduce((a, d) => a + n(d.pmt), 0);
    const blendedChecked = payoffTotal > 0
      ? checked.reduce((a, d) => a + n(d.balance) * n(d.rate), 0) / payoffTotal
      : 0;
    const keptPayments = totalPayments - checkedPayments;
    if (payoffTotal <= 0) return null;

    const beforeFee = payoffTotal + n(cashOut) + n(closing);
    const fundingFee = va ? (beforeFee * VA_FUNDING_FEE) / 100 : 0;
    const newLoan = beforeFee + fundingFee;
    const newPI = payment(newLoan, n(newRate), term_m);
    const newOutlay = newPI + keptPayments;
    const monthlySaving = totalPayments - newOutlay;
    const breakEvenMonths = monthlySaving > 0 && n(closing) > 0
      ? Math.ceil(n(closing) / monthlySaving)
      : null;

    // Lifetime interest, both ways. Debts left alone are charged on both sides,
    // so the comparison is like for like.
    const keptInterest = live
      .filter((d) => !d.payoff)
      .reduce((a, d) => a + interestToClear(n(d.balance), n(d.rate), n(d.pmt)), 0);
    const keepInterest = live.reduce(
      (a, d) => a + interestToClear(n(d.balance), n(d.rate), n(d.pmt)),
      0,
    );

    const extraPaid = Math.max(0, n(extra));
    const refi = amortizeWithExtra(newLoan, n(newRate), term_m, extraPaid);
    const refiPlain = amortizeWithExtra(newLoan, n(newRate), term_m, 0);
    const refiInterest = refiPlain.interest + keptInterest;
    const refiWithExtra = refi.interest + keptInterest;

    // What happens if the monthly saving itself goes back onto the loan. This
    // is the page's whole point, so it is computed whether or not the field is
    // filled in, rather than hidden behind it.
    const savingAsExtra = Math.max(0, Math.round(monthlySaving));
    const refiSavingApplied = amortizeWithExtra(newLoan, n(newRate), term_m, savingAsExtra);
    const savingAppliedInterest = refiSavingApplied.interest + keptInterest;

    /**
     * The rate a plain full-term loan would need to charge to cost the same
     * interest as this accelerated schedule. Bisection, because payment() has
     * no closed-form inverse in the rate.
     */
    let effectiveRate = n(newRate);
    if (extraPaid > 0 && Number.isFinite(refi.interest)) {
      let lo = 0;
      let hi = n(newRate);
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const midInterest = payment(newLoan, mid, term_m) * term_m - newLoan;
        if (midInterest > refi.interest) hi = mid;
        else lo = mid;
      }
      effectiveRate = (lo + hi) / 2;
    }

    const interestGap = refiInterest - keepInterest;
    const gapWithExtra = refiWithExtra - keepInterest;

    return {
      blocked: false as const,
      totalBalance, totalPayments, blendedAll,
      payoffTotal, blendedChecked, keptPayments, checkedCount: checked.length,
      fundingFee, newLoan, newPI, newOutlay, monthlySaving, breakEvenMonths, term_m,
      keepInterest, refiInterest, refiWithExtra, interestGap, gapWithExtra,
      keptInterest, clearedInterest: keepInterest - keptInterest,
      refiLoanInterest: refiPlain.interest, refiLoanInterestWithSaving: refiSavingApplied.interest,
      extraPaid, refiMonths: refi.months, monthsSaved: term_m - refi.months,
      interestSavedByExtra: refiPlain.interest - refi.interest,
      effectiveRate,
      savingAsExtra, savingAppliedInterest,
      savingAppliedMonths: refiSavingApplied.months,
      savingAppliedGap: savingAppliedInterest - keepInterest,
    };
  }, [debts, cashOut, closing, va, newRate, term, extra]);

  const inputCls =
    "w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400 bg-white";

  return (
    <CalcShell
      slug="refinance-to-pay-off-debt"
      intro="Rolling credit cards and car loans into a mortgage lowers what you pay each month, because a 30-year loan spreads the balance much further. It can also cost far more in total, for exactly the same reason. List what you owe, tick what a new mortgage would clear, and see both sides of that."
      onExample={loadExample}
      relatedSlugs={["should-i-refinance", "extra-payments", "pay-off-debt", "debt-payoff"]}
      disclaimer="For educational purposes only. Rates, closing costs and what a lender will approve depend on your credit, equity and income — these are estimates for discussion, not a commitment to lend. Consolidating unsecured debt into a mortgage puts your home behind it."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Today's debts" badge="CURRENT">
          <div className="space-y-3">
            {debts.map((d, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer min-h-11 shrink-0">
                    <input
                      type="checkbox"
                      checked={d.payoff}
                      onChange={(e) => update(i, { payoff: e.target.checked })}
                      className="w-4 h-4 accent-green-700 flex-shrink-0"
                      aria-label={`Pay off ${d.name.trim() || `debt ${i + 1}`} in the refinance`}
                    />
                    <span className="text-xs text-gray-500">Pay off</span>
                  </label>
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder={`Debt ${i + 1}`}
                    className={`${inputCls} flex-1 min-w-0`}
                  />
                  {debts.length > 1 && (
                    <button
                      onClick={() => removeDebt(i)}
                      aria-label={`Remove ${d.name.trim() || `debt ${i + 1}`}`}
                      className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <NumField label="Balance" value={d.balance} onChange={(v) => update(i, { balance: v })} placeholder="14200" prefix="$" />
                  <NumField label="Rate" value={d.rate} onChange={(v) => update(i, { rate: v })} placeholder="24.9" suffix="%" step={0.1} />
                  <NumField label="Payment" value={d.pmt} onChange={(v) => update(i, { pmt: v })} placeholder="430" prefix="$" />
                </div>
              </div>
            ))}

            <button
              onClick={addDebt}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 min-h-11 px-1 -mx-1"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add a debt
            </button>

            {r && !r.blocked && (
              <div className="space-y-2 pt-1">
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Total balance</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.totalBalance)}</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Combined payments</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.totalPayments)}/mo</span>
                </div>
                <div className="bg-amber-50 rounded-xl px-4 py-3 space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Blended rate, all debts</span>
                    <span className="text-sm font-medium text-amber-800">{pct(r.blendedAll, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Blended rate, the ones you&apos;d clear</span>
                    <span className="text-sm font-medium text-amber-800">{pct(r.blendedChecked, 2)}</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed pt-0.5">
                    Each balance weighted by its size. The debts you have ticked average{" "}
                    {r.blendedChecked >= r.blendedAll ? "above" : "below"} the overall rate.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="The new loan" badge="PROPOSED" badgeTone="blue">
          <div className="space-y-4">
            {r && !r.blocked && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Payoff of ticked debts</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.payoffTotal)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Cash out" value={cashOut} onChange={setCashOut} placeholder="0" prefix="$" />
              <NumField label="Closing costs" value={closing} onChange={setClosing} placeholder="6500" prefix="$" />
            </div>
            <Toggle checked={va} onChange={setVa}>
              VA loan — adds a {VA_FUNDING_FEE}% funding fee, financed into the balance
            </Toggle>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="New rate" value={newRate} onChange={setNewRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            </div>
            {r && !r.blocked && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">New loan amount</span>
                  <span className="text-sm font-medium text-blue-800">{fmt(r.newLoan)}</span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Payoff {fmt(r.payoffTotal)} plus cash out {fmt(n(cashOut))} plus costs {fmt(n(closing))}
                  {r.fundingFee > 0 && <> plus a {fmt(r.fundingFee)} funding fee</>}.
                </p>
              </div>
            )}
            <NumField
              label="Additional principal payment"
              value={extra}
              onChange={setExtra}
              placeholder="0"
              prefix="$"
              suffix="/mo"
              hint="Optional, paid on top of the new payment. This is what turns a lower monthly cost into a lower lifetime cost."
            />
          </div>
        </Card>
      </div>

      {r && r.blocked ? (
        <div className="border border-red-100 bg-red-50 rounded-2xl px-5 py-4 mb-4 text-sm text-red-700 leading-relaxed">
          <strong>
            {r.stuck.length === 1 ? "One debt never gets paid off." : `${r.stuck.length} debts never get paid off.`}
          </strong>{" "}
          {r.stuck.map((d) => (
            <span key={d.name}>
              {d.name} costs{" "}
              {d.needed.toLocaleString("en-US", { style: "currency", currency: "USD" })} a month in
              interest alone at {pct(d.rate, 2)} on {fmt(d.balance)}, and you have entered{" "}
              {d.pmt.toLocaleString("en-US", { style: "currency", currency: "USD" })}.{" "}
            </span>
          ))}
          The balance grows instead of shrinking, so there is no payoff date and no lifetime interest to
          compare against. Check the payment before reading anything else.
        </div>
      ) : r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Effective rate today</p>
                <p className="text-lg font-medium text-gray-900">{pct(r.blendedAll, 2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">across {fmt(r.totalBalance)}</p>
              </div>
              <div className={`p-4 text-center ${r.monthlySaving > 0 ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">
                  {r.monthlySaving > 0 ? "Monthly saving" : "Costs more each month"}
                </p>
                <p className="text-2xl font-medium text-white">{fmt(Math.abs(r.monthlySaving))}</p>
                <p className="text-xs text-white/70">
                  {fmt(r.totalPayments)} → {fmt(r.newOutlay)}
                </p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">New mortgage rate</p>
                <p className="text-lg font-medium text-gray-900">{pct(n(newRate), 2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">on {fmt(r.newLoan)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="New total monthly outlay" value={fmt(r.newOutlay)} tone={r.monthlySaving > 0 ? "green" : "red"} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="New mortgage payment" value={`${fmt(r.newPI)}/mo`} sub="principal and interest" />
              <Stat
                label="Debts kept"
                value={r.keptPayments > 0 ? `${fmt(r.keptPayments)}/mo` : "None"}
                tone={r.keptPayments > 0 ? "amber" : "green"}
                sub={r.keptPayments > 0 ? "not part of the refinance" : "everything is cleared"}
              />
              <Stat label="Blended rate cleared" value={pct(r.blendedChecked, 2)} tone="amber" sub={`${r.checkedCount} debts, ${fmt(r.payoffTotal)}`} />
              <Stat
                label="Break-even on costs"
                value={r.breakEvenMonths !== null ? fmtMonths(r.breakEvenMonths) : "—"}
                tone="green"
                sub={r.breakEvenMonths !== null ? `${fmt(n(closing))} ÷ ${fmt(r.monthlySaving)}/mo` : "no monthly saving"}
              />
            </div>
            <Takeaway tone={r.monthlySaving > 0 ? "green" : "amber"}>
              {r.monthlySaving > 0 ? (
                <>
                  Clearing <strong>{fmt(r.payoffTotal)}</strong> of debt averaging{" "}
                  <strong>{pct(r.blendedChecked, 2)}</strong> and replacing it at{" "}
                  <strong>{pct(n(newRate), 2)}</strong> cuts what you pay each month from{" "}
                  <strong>{fmt(r.totalPayments)}</strong> to <strong>{fmt(r.newOutlay)}</strong> — a{" "}
                  <strong>{fmt(r.monthlySaving)}</strong> saving.
                </>
              ) : (
                <>
                  On these numbers the new payment is <strong>{fmt(Math.abs(r.monthlySaving))}</strong>{" "}
                  higher each month, not lower. Check the rate and term against the debts you are
                  clearing — consolidating only reduces the monthly cost when the new loan is longer,
                  cheaper, or both.
                </>
              )}
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            {/* Branches on interestGap, the same figure the number above shows,
                so the verdict and the sentence under it cannot disagree. */}
            <Headline
              label={r.interestGap > 0 ? "Extra interest over the full term" : "Interest saved over the full term"}
              value={fmtK(Math.abs(r.interestGap))}
              tone={r.interestGap > 0 ? "red" : "green"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Keep today's debts" value={fmtK(r.keepInterest)} sub="interest, each paid to term" />
              <Stat label="Refinance, no extra" value={fmtK(r.refiInterest)} tone={r.interestGap > 0 ? "red" : "green"} sub="interest over the term" />
              <Stat
                label={`Refinance, ${fmt(r.savingAsExtra)}/mo extra`}
                value={fmtK(r.savingAppliedInterest)}
                tone={r.savingAppliedGap > 0 ? "amber" : "green"}
                sub="the saving put back on"
              />
              <Stat
                label="Paid off in"
                value={fmtMonths(r.savingAppliedMonths)}
                tone="green"
                sub={`vs ${fmtMonths(r.term_m)} at the standard payment`}
              />
            </div>
            <div className="space-y-2">
              <Takeaway tone={r.interestGap > 0 ? "amber" : "green"}>
                {r.interestGap > 0 ? (
                  <>
                    The monthly relief is real, but so is this: paying to term, the refinance costs{" "}
                    <strong>{fmtK(r.refiInterest)}</strong> in interest against{" "}
                    <strong>{fmtK(r.keepInterest)}</strong> for the debts you have now —{" "}
                    <strong>{fmtK(r.interestGap)}</strong> more. Short debts stretched over{" "}
                    {n(term)} years cost more even at a much lower rate, because you carry them far
                    longer.
                  </>
                ) : (
                  <>
                    The refinance is cheaper both ways here: <strong>{fmtK(r.refiInterest)}</strong> of
                    interest against <strong>{fmtK(r.keepInterest)}</strong> keeping what you have, a
                    saving of <strong>{fmtK(Math.abs(r.interestGap))}</strong> on top of the monthly
                    difference.
                  </>
                )}
              </Takeaway>
              {r.monthlySaving > 0 && (
                <Takeaway tone={r.savingAppliedGap > 0 ? "blue" : "green"}>
                  That flips if you keep paying what you pay today. Put the{" "}
                  <strong>{fmt(r.savingAsExtra)}</strong> saving straight back onto the new loan and the
                  interest falls to <strong>{fmtK(r.savingAppliedInterest)}</strong>, clearing it in{" "}
                  <strong>{fmtMonths(r.savingAppliedMonths)}</strong>
                  {r.savingAppliedGap > 0 ? (
                    <> — still {fmtK(r.savingAppliedGap)} more than keeping today&apos;s debts.</>
                  ) : (
                    <>
                      {" "}
                      — <strong>{fmtK(Math.abs(r.savingAppliedGap))}</strong> less than keeping
                      today&apos;s debts, and years sooner.
                    </>
                  )}{" "}
                  The consolidation is only a win if the saving does not get spent.
                </Takeaway>
              )}
              <Takeaway tone="amber">
                This moves unsecured debt onto your home. A credit card issuer can hurt your credit; a
                mortgage lender can foreclose. Debt that was costing you {pct(r.blendedChecked, 2)} with
                no collateral would be secured against the roof over your head.
              </Takeaway>
            </div>
          </div>

          {r.extraPaid > 0 && Number.isFinite(r.refiMonths) && (
            <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
              <Headline label="Effective rate with your extra payment" value={pct(r.effectiveRate, 2)} tone="green" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <Stat label="Nominal rate" value={pct(n(newRate), 2)} sub="what the note says" />
                <Stat label="Paid off in" value={fmtMonths(r.refiMonths)} tone="green" sub={`${fmtMonths(r.monthsSaved)} early`} />
                <Stat label="Interest saved" value={fmtK(r.interestSavedByExtra)} tone="green" sub="against the standard payment" />
                <Stat label="Extra paid in" value={`${fmt(r.extraPaid)}/mo`} sub="on top of the payment" />
              </div>
              <Takeaway tone="green">
                Paying <strong>{fmt(r.extraPaid)}</strong> a month on top costs the same total interest as
                a full-term loan at <strong>{pct(r.effectiveRate, 2)}</strong> would. The note still says{" "}
                {pct(n(newRate), 2)} — the difference is entirely in how long you carry the balance.
              </Takeaway>
            </div>
          )}

          <ChartCard
            title="Interest over the full term"
            footnote="Interest only, with any debts you keep charged to both sides so the comparison is like for like."
          >
            <BarChart
              ariaLabel="Total interest keeping today's debts compared with refinancing"
              height={200}
              bars={[
                {
                  label: "Keep today's debts",
                  segments: [
                    { label: "Interest on debts you would clear", value: r.clearedInterest, color: COLORS.amber },
                    { label: "Interest on debts kept either way", value: r.keptInterest, color: COLORS.gray },
                  ],
                },
                {
                  label: "Refinance",
                  segments: [
                    { label: "Interest on the new loan", value: r.refiLoanInterest, color: COLORS.red },
                    { label: "Interest on debts kept either way", value: r.keptInterest, color: COLORS.gray },
                  ],
                },
                {
                  label: `Refinance + ${fmt(r.savingAsExtra)}/mo`,
                  segments: [
                    { label: "Interest after extra payments", value: r.refiLoanInterestWithSaving, color: COLORS.green },
                    { label: "Interest on debts kept either way", value: r.keptInterest, color: COLORS.gray },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add your debts with a balance, rate and monthly payment, then enter the rate and term of the
            new mortgage.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
