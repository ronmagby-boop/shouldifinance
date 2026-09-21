"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import DebtList, { BLANK_DEBT, type DebtRow } from "../../components/DebtList";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";


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
  const [debts, setDebts] = useState<DebtRow[]>([{ ...BLANK_DEBT }, { ...BLANK_DEBT }, { ...BLANK_DEBT }]);
  const [cashOut, setCashOut] = useState<Num>("");
  const [closing, setClosing] = useState<Num>("");
  const [newRate, setNewRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  /** Optional: FHA MIP or conventional MI, as a flat monthly figure. */
  const [mi, setMi] = useState<Num>("");
  const [extraPayment, setExtraPayment] = useState<Num>("");
  /** Until the field is edited by hand it tracks the monthly saving. */
  const [extraDirty, setExtraDirty] = useState(false);

  const update = (i: number, patch: Partial<DebtRow>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addDebt = () => setDebts((d) => [...d, { ...BLANK_DEBT }]);
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
    setNewRate(6.75);
    setTerm(30);
    setMi(0);
    setExtraPayment("");
    setExtraDirty(false);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setDebts([{ ...BLANK_DEBT }, { ...BLANK_DEBT }, { ...BLANK_DEBT }]);
    setCashOut("");
    setClosing("");
    setNewRate("");
    setTerm("");
    setMi("");
    setExtraPayment("");
    setExtraDirty(false);
  };

  /**
   * Everything that does not depend on the extra payment. Split out so the
   * suggested extra can be derived from the monthly saving without the saving
   * depending on it in turn.
   */
  const base = useMemo(() => {
    const live = debts.filter((d) => n(d.balance) > 0);
    const term_m = Math.round(n(term) * 12);
    if (live.length === 0 || term_m <= 0 || n(newRate) <= 0) return null;

    /**
     * A payment at or below the monthly interest never touches principal. The
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
    const blendedAll = live.reduce((a, d) => a + n(d.balance) * n(d.rate), 0) / totalBalance;

    const checked = live.filter((d) => d.payoff);
    const payoffTotal = checked.reduce((a, d) => a + n(d.balance), 0);
    if (payoffTotal <= 0) return null;
    const checkedPayments = checked.reduce((a, d) => a + n(d.pmt), 0);
    const blendedChecked =
      checked.reduce((a, d) => a + n(d.balance) * n(d.rate), 0) / payoffTotal;
    const keptPayments = totalPayments - checkedPayments;

    const newLoan = payoffTotal + n(cashOut) + n(closing);
    const newPI = payment(newLoan, n(newRate), term_m);
    // Mortgage insurance is part of what you hand over each month, so it has to
    // sit in the outlay rather than beside it — otherwise the saving, the
    // suggested extra and the break-even all overstate the case.
    const miMonthly = Math.max(0, n(mi));
    const newOutlay = newPI + keptPayments + miMonthly;
    const monthlySaving = totalPayments - newOutlay;
    const breakEvenMonths =
      monthlySaving > 0 && n(closing) > 0 ? Math.ceil(n(closing) / monthlySaving) : null;

    return {
      blocked: false as const,
      totalBalance, totalPayments, blendedAll,
      payoffTotal, blendedChecked, keptPayments, checkedCount: checked.length,
      newLoan, newPI, miMonthly, newOutlay, monthlySaving, breakEvenMonths, term_m,
      rateDrop: blendedAll - n(newRate),
    };
  }, [debts, cashOut, closing, newRate, term, mi]);

  const suggestedExtra =
    base && !base.blocked && base.monthlySaving > 0 ? Math.round(base.monthlySaving) : 0;
  const extraValue: Num = extraDirty ? extraPayment : suggestedExtra > 0 ? suggestedExtra : "";
  const onExtraChange = (v: Num) => {
    setExtraDirty(true);
    setExtraPayment(v);
  };
  const useSuggestedExtra = () => {
    setExtraDirty(false);
    setExtraPayment("");
  };

  const r = useMemo(() => {
    if (!base || base.blocked) return null;
    const extra = Math.max(0, n(extraValue));
    const withExtra = amortizeWithExtra(base.newLoan, n(newRate), base.term_m, extra);
    const plain = amortizeWithExtra(base.newLoan, n(newRate), base.term_m, 0);

    /**
     * The rate a plain full-term loan would need to charge to cost the same
     * interest as this accelerated schedule. Bisection, because payment() has
     * no closed-form inverse in the rate.
     */
    const rateCosting = (targetInterest: number) => {
      if (!Number.isFinite(targetInterest)) return n(newRate);
      let lo = 0;
      let hi = n(newRate);
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const midInterest = payment(base.newLoan, mid, base.term_m) * base.term_m - base.newLoan;
        if (midInterest > targetInterest) hi = mid;
        else lo = mid;
      }
      return (lo + hi) / 2;
    };
    const effectiveRate = extra > 0 ? rateCosting(withExtra.interest) : n(newRate);
    // Computed even when the field is empty, so the tile can say what applying
    // the saving would achieve instead of showing nothing.
    const suggested = base.monthlySaving > 0 ? Math.round(base.monthlySaving) : 0;
    const effectiveAtSuggested =
      suggested > 0
        ? rateCosting(amortizeWithExtra(base.newLoan, n(newRate), base.term_m, suggested).interest)
        : n(newRate);

    return {
      extra,
      effectiveRate,
      effectiveAtSuggested,
      payoffMonths: withExtra.months,
      monthsSaved: base.term_m - withExtra.months,
      interestWithExtra: withExtra.interest,
      interestPlain: plain.interest,
      // Two schedules on the same loan, so this one is a real comparison.
      interestSaved: plain.interest - withExtra.interest,
    };
  }, [base, extraValue, newRate]);


  return (
    <CalcShell
      slug="refinance-to-pay-off-debt"
      intro="Every debt you carry has a rate, and together they average out to one number. A new mortgage replaces that blend with a single lower rate — and if you keep paying what you pay today, the difference goes straight onto the principal and the house is gone years early."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-consolidation", "should-i-refinance", "extra-payments", "pay-off-debt"]}
      disclaimer="For educational purposes only. Rates, closing costs and what a lender will approve depend on your credit, equity and income — these are estimates for discussion, not a commitment to lend."
    >
      {/* 5/3 rather than even halves: the debts panel puts five controls across
          a row, the new loan panel stacks single fields. At equal widths the
          row had 353px for four fields and needed 378, so it truncated.
          The pair only sits side by side from xl, because below that the debts
          panel needs the full width for the stacked card layout instead. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card title="Today's debts" badge="CURRENT" className="xl:col-span-2">
          <div className="space-y-2">
            <DebtList
              debts={debts}
              onUpdate={update}
              onAdd={addDebt}
              onRemove={removeDebt}
              paymentLabel="Payment"
              checkboxAction="Pay off"
            />

            {base && !base.blocked && (
              <div className="space-y-2 pt-1">
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Total balance</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(base.totalBalance)}</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Combined payments</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(base.totalPayments)}/mo</span>
                </div>
                <div className="bg-amber-50 rounded-xl px-4 py-3 space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Blended rate, all debts</span>
                    <span className="text-sm font-medium text-amber-800">{pct(base.blendedAll, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Blended rate, the ones you&apos;d clear</span>
                    <span className="text-sm font-medium text-amber-800">{pct(base.blendedChecked, 2)}</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed pt-0.5">
                    Each balance weighted by its size. The debts you have ticked average{" "}
                    {base.blendedChecked >= base.blendedAll ? "above" : "below"} the overall rate.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="The new loan" badge="PROPOSED" badgeTone="blue" className="xl:col-span-1">
          <div className="space-y-4">
            {base && !base.blocked && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Payoff of ticked debts</span>
                <span className="text-sm font-medium text-gray-900">{fmt(base.payoffTotal)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Cash out" value={cashOut} onChange={setCashOut} placeholder="0" prefix="$" />
              <NumField label="Closing costs" value={closing} onChange={setClosing} placeholder="6500" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="New rate" value={newRate} onChange={setNewRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            </div>
            {base && !base.blocked && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">New loan amount</span>
                  <span className="text-sm font-medium text-blue-800">{fmt(base.newLoan)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">New mortgage payment</span>
                  <span className="text-sm font-medium text-blue-800">{fmt(base.newPI)}/mo</span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Payoff {fmt(base.payoffTotal)} plus cash out {fmt(n(cashOut))} plus costs{" "}
                  {fmt(n(closing))}, at {pct(n(newRate), 2)} over {n(term)} years. Principal and
                  interest only — any mortgage insurance is below.
                </p>
              </div>
            )}
            <NumField
              label="Mortgage insurance (monthly)"
              value={mi}
              onChange={setMi}
              placeholder="0"
              prefix="$"
              suffix="/mo"
              hint="Optional. FHA loans carry annual mortgage insurance whatever the loan-to-value, so it applies even where a conventional loan at the same LTV would have none. Your loan officer or Loan Estimate has the figure."
            />
            <NumField
              label="Additional principal payment"
              value={extraValue}
              onChange={onExtraChange}
              placeholder={suggestedExtra > 0 ? String(suggestedExtra) : "0"}
              prefix="$"
              suffix="/mo"
              action={
                suggestedExtra > 0 ? (
                  <button onClick={useSuggestedExtra} className="ml-2 text-green-700 underline text-xs">
                    Apply savings ({fmt(suggestedExtra)}/mo)
                  </button>
                ) : undefined
              }
              hint="Tracks your monthly saving until you type your own figure. This is what turns a smaller payment into a shorter loan."
            />
          </div>
        </Card>
      </div>

      {base && base.blocked ? (
        <div className="border border-red-100 bg-red-50 rounded-2xl px-5 py-4 mb-4 text-sm text-red-700 leading-relaxed">
          <strong>
            {base.stuck.length === 1
              ? "One debt never gets paid off."
              : `${base.stuck.length} debts never get paid off.`}
          </strong>{" "}
          {base.stuck.map((d) => (
            <span key={d.name}>
              {d.name} costs{" "}
              {d.needed.toLocaleString("en-US", { style: "currency", currency: "USD" })} a month in
              interest alone at {pct(d.rate, 2)} on {fmt(d.balance)}, and you have entered{" "}
              {d.pmt.toLocaleString("en-US", { style: "currency", currency: "USD" })}.{" "}
            </span>
          ))}
          The balance grows instead of shrinking, so there is no payoff date to work from. Check the
          payment before reading anything else.
        </div>
      ) : base && r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-gray-100">
              <div className="p-4 text-center bg-white">
                <p className="text-xs text-gray-400 mb-1">You pay today</p>
                <p className="text-lg font-medium text-gray-900">{pct(base.blendedAll, 2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">blended across {fmt(base.totalBalance)}</p>
              </div>
              <div className={`p-4 text-center ${base.monthlySaving > 0 ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">
                  {base.monthlySaving > 0 ? "Monthly saving" : "Costs more each month"}
                </p>
                <p className="text-2xl font-medium text-white">{fmt(Math.abs(base.monthlySaving))}</p>
                <p className="text-xs text-white/70">
                  {fmt(base.totalPayments)} → {fmt(base.newOutlay)}
                </p>
              </div>
              <div className="p-4 text-center bg-white">
                <p className="text-xs text-gray-400 mb-1">New mortgage rate</p>
                <p className="text-lg font-medium text-gray-900">{pct(n(newRate), 2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">on {fmt(base.newLoan)}</p>
              </div>
              {/* The rate the accelerated schedule works out to. It only takes
                  the green fill once an extra payment is actually entered, since
                  the fill is what marks a figure as earned; with the field empty
                  it stays neutral and shows the note rate with what applying the
                  saving would reach. */}
              <div className={`p-4 text-center ${r.extra > 0 ? "bg-green-800" : "bg-white"}`}>
                <p className={`text-xs mb-0.5 ${r.extra > 0 ? "text-white/70" : "text-gray-400"}`}>
                  Effective rate
                </p>
                <p
                  className={`font-medium ${
                    r.extra > 0 ? "text-2xl text-white" : "text-lg text-gray-400"
                  }`}
                >
                  {pct(r.extra > 0 ? r.effectiveRate : n(newRate), 2)}
                </p>
                <p className={`text-xs ${r.extra > 0 ? "text-white/70" : "text-gray-400 mt-0.5"}`}>
                  {r.extra > 0 ? (
                    <>with {fmt(r.extra)}/mo extra on the principal</>
                  ) : suggestedExtra > 0 && r.effectiveAtSuggested < n(newRate) ? (
                    <>
                      {pct(r.effectiveAtSuggested, 2)} if you apply the {fmt(suggestedExtra)} saving
                    </>
                  ) : (
                    <>no extra principal entered</>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="New total monthly outlay"
              value={fmt(base.newOutlay)}
              tone={base.monthlySaving > 0 ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              <Stat label="New mortgage payment" value={`${fmt(base.newPI)}/mo`} sub="principal and interest" />
              <Stat
                label="Mortgage insurance"
                value={base.miMonthly > 0 ? `${fmt(base.miMonthly)}/mo` : "None"}
                tone={base.miMonthly > 0 ? "amber" : "green"}
                sub={base.miMonthly > 0 ? "included in the outlay" : "none entered"}
              />
              <Stat
                label="Debts kept"
                value={base.keptPayments > 0 ? `${fmt(base.keptPayments)}/mo` : "None"}
                tone={base.keptPayments > 0 ? "amber" : "green"}
                sub={base.keptPayments > 0 ? "not part of the refinance" : "everything is cleared"}
              />
              <Stat
                label="Blended rate cleared"
                value={pct(base.blendedChecked, 2)}
                tone="amber"
                sub={`${base.checkedCount} debts, ${fmt(base.payoffTotal)}`}
              />
              <Stat
                label="Break-even on costs"
                value={base.breakEvenMonths !== null ? fmtMonths(base.breakEvenMonths) : "—"}
                tone="green"
                sub={
                  base.breakEvenMonths !== null
                    ? `${fmt(n(closing))} ÷ ${fmt(base.monthlySaving)}/mo`
                    : "no monthly saving"
                }
              />
            </div>
            <Takeaway tone={base.monthlySaving > 0 ? "green" : "amber"}>
              {base.monthlySaving > 0 ? (
                <>
                  Clearing <strong>{fmt(base.payoffTotal)}</strong> of debt averaging{" "}
                  <strong>{pct(base.blendedChecked, 2)}</strong> and replacing it at{" "}
                  <strong>{pct(n(newRate), 2)}</strong> drops what you pay each month from{" "}
                  <strong>{fmt(base.totalPayments)}</strong> to <strong>{fmt(base.newOutlay)}</strong>.
                  The question is what you do with the <strong>{fmt(base.monthlySaving)}</strong>.
                </>
              ) : (
                <>
                  On these numbers the new payment is{" "}
                  <strong>{fmt(Math.abs(base.monthlySaving))}</strong> higher each month, not lower.
                  Check the rate and term against the debts you are clearing — consolidating only
                  reduces the monthly cost when the new loan is longer, cheaper, or both.
                </>
              )}
            </Takeaway>
          </div>

          {r.extra > 0 && Number.isFinite(r.payoffMonths) ? (
            <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
              <Headline label="Your effective rate" value={pct(r.effectiveRate, 2)} tone="green" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <Stat label="Rate on the note" value={pct(n(newRate), 2)} sub="what you actually sign" />
                <Stat label="Paid off in" value={fmtMonths(r.payoffMonths)} tone="green" sub={`${fmtMonths(r.monthsSaved)} early`} />
                <Stat label="Interest saved" value={fmtK(r.interestSaved)} tone="green" sub="against the standard payment" />
                <Stat label="Extra each month" value={`${fmt(r.extra)}/mo`} sub="on top of the payment" />
              </div>
              <div className="space-y-2">
                <Takeaway tone="green">
                  You are carrying <strong>{pct(base.blendedAll, 2)}</strong> today. Refinancing at{" "}
                  <strong>{pct(n(newRate), 2)}</strong> and putting the{" "}
                  <strong>{fmt(r.extra)}</strong> saving straight back onto the principal costs the same
                  total interest as a full-term loan at <strong>{pct(r.effectiveRate, 2)}</strong> — and
                  the house is paid off in <strong>{fmtMonths(r.payoffMonths)}</strong> instead of{" "}
                  {fmtMonths(base.term_m)}. Both figures compare the same loan on two schedules, so the{" "}
                  <strong>{fmtK(r.interestSaved)}</strong> saved is money you genuinely do not pay.
                </Takeaway>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
              <Takeaway tone={suggestedExtra > 0 ? "blue" : "amber"}>
                {suggestedExtra > 0 ? (
                  <>
                    Put the <strong>{fmt(suggestedExtra)}</strong> saving back onto the loan as extra
                    principal and this page will show what it does to the payoff date. Spent instead,
                    the refinance is only a smaller payment on a longer loan.
                  </>
                ) : (
                  <>
                    There is no monthly saving to redirect here — the new outlay of{" "}
                    <strong>{fmt(base.newOutlay)}</strong> is at or above the{" "}
                    <strong>{fmt(base.totalPayments)}</strong> you pay now. Any extra principal would
                    have to come from somewhere else, so enter it by hand if you have it.
                  </>
                )}
              </Takeaway>
            </div>
          )}

          <ChartCard
            title="Interest on the new loan"
            footnote="The same loan on two schedules — the standard payment against the standard payment plus your extra principal."
          >
            <BarChart
              ariaLabel="Interest on the new loan at the standard payment compared with adding extra principal"
              height={200}
              bars={[
                {
                  label: "Standard payment",
                  segments: [{ label: "Interest paid", value: r.interestPlain, color: COLORS.amber }],
                },
                {
                  label: r.extra > 0 ? `Plus ${fmt(r.extra)}/mo` : "Plus extra principal",
                  segments: [
                    { label: "Interest paid", value: r.interestWithExtra, color: COLORS.green },
                    { label: "Interest never charged", value: r.interestSaved, color: COLORS.gray },
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
