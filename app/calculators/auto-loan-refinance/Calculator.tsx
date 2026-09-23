"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

/**
 * A payment can sit a hair under the interest charge through floating-point
 * noise alone, and an exact `<=` would call that a stalemate at random. Same
 * relative epsilon debt-payoff uses.
 */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;
const monthlyInterest = (bal: number, rate: number) => (bal * rate) / 100 / 12;

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [currentPayment, setCurrentPayment] = useState<Num>("");
  const [currentRate, setCurrentRate] = useState<Num>("");
  const [monthsLeft, setMonthsLeft] = useState<Num>("");
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  const [fees, setFees] = useState<Num>("");
  const [carValue, setCarValue] = useState<Num>("");
  const [rollFees, setRollFees] = useState(true);

  const loadExample = () => {
    setBalance(24500);
    setCurrentPayment(612);
    setCurrentRate(9.4);
    setMonthsLeft(44);
    setNewRate(6.25);
    setNewTerm(48);
    setFees(150);
    setCarValue(23000);
    setRollFees(true);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setBalance("");
    setCurrentPayment("");
    setCurrentRate("");
    setMonthsLeft("");
    setNewRate("");
    setNewTerm("");
    setFees("");
    setCarValue("");
    setRollFees(true);
  };

  /* A payment that does not cover the interest never amortises, so there is
   * no current loan to compare against. Named rather than blanked. */
  const stalled = useMemo(() => {
    const bal = n(balance);
    if (bal <= 0 || n(currentPayment) <= 0) return null;
    const interest = monthlyInterest(bal, n(currentRate));
    if (n(currentPayment) <= interest * INTEREST_ONLY_EPSILON) {
      return { which: "current" as const, interest, payment: n(currentPayment) };
    }
    // The offer has to amortise too, or there is no new loan to compare.
    const newLoan = rollFees ? bal + n(fees) : bal;
    const months = Math.max(1, Math.round(n(newTerm)));
    const offerPayment = payment(newLoan, n(newRate), months);
    const offerInterest = monthlyInterest(newLoan, n(newRate));
    return offerPayment > 0 && offerPayment <= offerInterest * INTEREST_ONLY_EPSILON
      ? { which: "offer" as const, interest: offerInterest, payment: offerPayment }
      : null;
  }, [balance, currentPayment, currentRate, newRate, newTerm, fees, rollFees]);

  const r = useMemo(() => {
    const bal = n(balance);
    const left = Math.round(n(monthsLeft));
    if (bal <= 0 || left <= 0 || n(currentPayment) <= 0) return null;
    if (n(currentPayment) <= monthlyInterest(bal, n(currentRate)) * INTEREST_ONLY_EPSILON) return null;

    const current = amortize(bal, n(currentRate), left, 0, n(currentPayment));
    if (!Number.isFinite(current.totalInterest)) return null;

    const newLoan = rollFees ? bal + n(fees) : bal;
    const newMonths = Math.max(1, Math.round(n(newTerm)));
    const newPayment = payment(newLoan, n(newRate), newMonths);
    const refi = amortize(newLoan, n(newRate), newMonths);
    // amortize returns Infinity when a payment cannot cover the interest. The
    // current loan was guarded for that and the offer was not, which printed
    // "Interest on new loan $∞" at extreme rates.
    if (!Number.isFinite(refi.totalInterest)) return null;
    const upfront = rollFees ? 0 : n(fees);

    const monthlySavings = n(currentPayment) - newPayment;
    const totalInterestSaved = current.totalInterest - refi.totalInterest - n(fees);
    /* Break-even is the fees over the monthly saving in both states, the same
     * way should-i-refinance and va-recoup compute theirs: rolling the fee
     * into the loan changes when you pay it, not whether you pay it. This used
     * to report "Immediate" whenever the fee was rolled, which read as though
     * a financed cost were a free one. */
    const breakEven =
      monthlySavings > 0 && n(fees) > 0 ? Math.ceil(n(fees) / monthlySavings) : n(fees) === 0 ? 0 : null;

    // Same-horizon comparison: interest over the months you have left today.
    let sameHorizonInterest = 0;
    let b = newLoan;
    const nr = n(newRate) / 100 / 12;
    for (let i = 0; i < Math.min(left, newMonths); i++) {
      const int = b * nr;
      sameHorizonInterest += int;
      b = Math.max(0, b - (newPayment - int));
    }

    const equity = n(carValue) - bal;
    const ltv = n(carValue) > 0 ? (bal / n(carValue)) * 100 : 0;
    /* The figure a lender actually underwrites: rolling fees into an already
     * underwater loan pushes the ratio up, and it is the new loan they are
     * being asked to write. */
    const ltvAfter = n(carValue) > 0 ? (newLoan / n(carValue)) * 100 : 0;

    return {
      current,
      refi,
      newPayment,
      newLoan,
      monthlySavings,
      totalInterestSaved,
      breakEven,
      upfront,
      sameHorizonInterest,
      equity,
      ltv,
      ltvAfter,
      hasValue: n(carValue) > 0,
      fees: n(fees),
      extendsLoan: newMonths > left,
      /* A shorter term is a legitimate refinance, not a failed one: the
       * payment rises and more interest is saved. The page used to colour it
       * as a loss and quote a break-even that has nothing to recoup. */
      shortensLoan: newMonths < left,
      monthsSaved: left - newMonths,
      extraMonths: newMonths - left,
      totalPaidNow: n(currentPayment) * left,
      totalPaidRefi: newPayment * newMonths + upfront,
    };
  }, [balance, currentPayment, currentRate, monthsLeft, newRate, newTerm, fees, carValue, rollFees]);

  return (
    <CalcShell
      slug="auto-loan-refinance"
      intro="Car loans are short, so a refinance has less time to pay off than a mortgage does. Enter your current loan and the offer to see the monthly savings, the real interest savings, and whether a longer term is quietly undoing both."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["loan-vs-cash", "auto-affordability", "depreciation"]}
      disclaimer="For educational purposes only and not a commitment to lend. Refinancing depends on credit, vehicle age and mileage, and loan-to-value limits. Check your current loan for prepayment penalties and confirm whether it uses simple interest or a precomputed balance."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your current loan" badge="TODAY">
          <div className="space-y-4">
            <NumField label="Current balance" value={balance} onChange={setBalance} min={0} placeholder="24500" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current rate" value={currentRate} onChange={setCurrentRate} min={0} placeholder="9.4" suffix="%" step={0.25} />
              <NumField label="Payment" value={currentPayment} onChange={setCurrentPayment} min={0} placeholder="612" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Months remaining" value={monthsLeft} onChange={setMonthsLeft} min={0} placeholder="44" suffix="mo" />
              <NumField label="Car's value" value={carValue} onChange={setCarValue} min={0} placeholder="23000" prefix="$" />
            </div>
            {r && (
              <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.equity >= 0 ? "bg-gray-50" : "bg-amber-50"}`}>
                <span className={`text-xs ${r.equity >= 0 ? "text-gray-400" : "text-amber-700 font-medium"}`}>
                  {r.equity >= 0 ? "Equity in the car" : "Underwater by"}
                </span>
                <span className={`text-sm font-medium ${r.equity >= 0 ? "text-gray-900" : "text-amber-800"}`}>
                  {fmt(Math.abs(r.equity))} · {pct(r.ltv, 0)} LTV
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The refinance offer" badge="PROPOSED" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="New rate" value={newRate} onChange={setNewRate} min={0} placeholder="6.25" suffix="%" step={0.25} />
              <NumField label="New term" value={newTerm} onChange={setNewTerm} min={1} placeholder="48" suffix="mo" />
            </div>
            <NumField
              label="Fees"
              value={fees}
              onChange={setFees}
              min={0}
              placeholder="150"
              prefix="$"
              hint="Title transfer and registration fees are typical; many auto refinances have no lender fee."
            />
            <Toggle checked={rollFees} onChange={setRollFees}>
              Roll fees into the new loan
            </Toggle>
            {r && (
              <>
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">New payment</span>
                  <span className="text-sm font-medium text-green-800">{fmt(r.newPayment)}/mo</span>
                </div>
                {r.extendsLoan && (
                  <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Extends the loan by</span>
                    <span className="text-sm font-medium text-amber-800">{r.extraMonths} months</span>
                  </div>
                )}
                {r.shortensLoan && (
                  <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-green-700 font-medium">Clears the loan</span>
                    <span className="text-sm font-medium text-green-800">{r.monthsSaved} months sooner</span>
                  </div>
                )}
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
                <p className="text-xs text-gray-400 mb-1">Payment today</p>
                <p className="text-lg font-medium text-gray-900">{fmt(n(currentPayment))}</p>
              </div>
              <div className={`p-4 text-center ${r.monthlySavings > 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.monthlySavings > 0 ? "You'd save" : "Payment increases"}
                </p>
                <p className="text-2xl font-medium text-white">{fmt(Math.abs(r.monthlySavings))}</p>
                <p className="text-xs text-green-300">per month</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">New payment</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.newPayment)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={r.fees > 0 ? `Total interest saved, net of ${fmt(r.fees)} in fees` : "Total interest saved"}
              value={fmtK(r.totalInterestSaved)}
              tone={r.totalInterestSaved > 0 ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Interest on current loan" value={fmt(r.current.totalInterest)} tone="amber" />
              <Stat label="Interest on new loan" value={fmt(r.refi.totalInterest)} tone={r.refi.totalInterest < r.current.totalInterest ? "green" : "red"} />
              <Stat
                label="Break-even on fees"
                value={
                  r.fees === 0
                    ? "No fees"
                    : r.breakEven === null
                      ? r.shortensLoan
                        ? "N/A"
                        : "Never"
                      : `${r.breakEven} mo`
                }
                sub={
                  r.fees === 0
                    ? undefined
                    : r.breakEven === null
                      ? r.shortensLoan
                        ? "the payment rises, so there is no monthly saving to recoup from"
                        : "no monthly saving to recoup from"
                      : rollFees
                        ? "rolled into the loan — financed, not free"
                        : "paid up front"
                }
              />
              <Stat label="Rate reduction" value={pct(n(currentRate) - n(newRate), 2)} tone={n(currentRate) > n(newRate) ? "green" : "red"} />
              {r.hasValue && (
                <Stat
                  label="Loan-to-value after"
                  value={pct(r.ltvAfter, 1)}
                  tone={r.ltvAfter > 100 ? "amber" : "green"}
                  sub={`${pct(r.ltv, 1)} today`}
                />
              )}
            </div>
            <Takeaway tone={r.totalInterestSaved > 0 ? "green" : "amber"}>
              {r.extendsLoan ? (
                <>
                  <strong>⚠ Watch the term.</strong> This offer stretches the loan{" "}
                  {r.extraMonths} months longer than you have left. That is where most of the{" "}
                  {fmt(Math.abs(r.monthlySavings))}/mo saving comes from — you&apos;d pay{" "}
                  <strong>{fmtK(r.totalPaidRefi)}</strong> in total versus {fmtK(r.totalPaidNow)} on your
                  current schedule. Over the same {n(monthsLeft)} months, the lower rate alone saves about{" "}
                  <strong>{fmt(Math.max(0, r.current.totalInterest - r.sameHorizonInterest))}</strong>.
                </>
              ) : r.shortensLoan && r.totalInterestSaved > 0 ? (
                <>
                  <strong>✓ A shorter term, on purpose.</strong> The payment rises{" "}
                  <strong>{fmt(Math.abs(r.monthlySavings))}</strong> to {fmt(r.newPayment)}, and that is
                  the point: clearing the loan {r.monthsSaved} months sooner at {pct(n(newRate), 2)} saves{" "}
                  <strong>{fmtK(r.totalInterestSaved)}</strong> in interest net of fees. This is a
                  refinance that costs more each month and less overall — worth doing if the payment
                  fits.
                </>
              ) : r.totalInterestSaved > 0 ? (
                <>
                  <strong>✓ Worth doing.</strong> Dropping from {pct(n(currentRate), 2)} to{" "}
                  {pct(n(newRate), 2)} saves <strong>{fmtK(r.totalInterestSaved)}</strong> net of fees, and
                  the new term doesn&apos;t extend your payoff date.
                </>
              ) : (
                <>
                  <strong>⚠ This offer costs more than it saves.</strong> After fees, you&apos;d pay{" "}
                  <strong>{fmt(Math.abs(r.totalInterestSaved))}</strong> more in interest than staying put.
                </>
              )}
            </Takeaway>
            {/* The likeliest reason this refinance does not happen, moved to
                where the verdict is read rather than sitting beside the
                inputs. Whether it clears is the lender's call, not ours. */}
            {r.hasValue && r.equity < 0 && (
              <div className="mt-2 border-2 border-amber-200 bg-amber-50 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  You owe {fmt(Math.abs(r.equity))} more than the car is worth
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  The loan is {pct(r.ltv, 1)} of the car&apos;s value today, and the refinance asks a
                  lender to write {fmtK(r.newLoan)} against {fmtK(n(carValue))} — {pct(r.ltvAfter, 1)}.
                  {rollFees && r.fees > 0 && (
                    <> Rolling the {fmt(r.fees)} in fees into it is what moves the figure.</>
                  )}{" "}
                  Lenders commonly cap auto refinance loan-to-value somewhere around 120%, but the
                  threshold is theirs and varies — a rate this far from the collateral is the most
                  likely reason an otherwise sound refinance is declined. Ask before you apply.
                </p>
              </div>
            )}
          </div>

          <ChartCard title="Loan balance over time">
            <LineChart
              ariaLabel="Current loan balance compared with the refinanced balance over time"
              periodsPerYear={12}
              series={[
                { label: "Current loan", color: COLORS.gray, data: r.current.balances },
                { label: "Refinanced", color: COLORS.green, data: r.refi.balances, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                If the green line reaches zero later than the grey one, you traded a lower payment for a
                longer loan — and with a depreciating asset, that also means more months spent owing more
                than the car is worth.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Total you'll pay either way">
            <BarChart
              ariaLabel="Total payments remaining on the current loan compared with the refinance"
              height={210}
              bars={[
                {
                  label: "Stay put",
                  segments: [
                    { label: "Principal", value: n(balance), color: COLORS.gray },
                    { label: "Interest & fees", value: r.current.totalInterest, color: COLORS.amber },
                  ],
                },
                {
                  label: "Refinance",
                  segments: [
                    { label: "Principal", value: n(balance), color: COLORS.gray },
                    { label: "Interest & fees", value: r.refi.totalInterest + n(fees), color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : stalled ? (
        <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-red-800 mb-1">
            {stalled.which === "current"
              ? "That payment never clears the loan"
              : "This offer never clears the loan"}
          </p>
          <p className="text-xs text-red-800 leading-relaxed">
            {stalled.which === "current" ? (
              <>
                A {fmt(stalled.payment)} payment does not cover the {fmt(stalled.interest)} of interest{" "}
                {fmt(n(balance))} at {pct(n(currentRate), 2)} accrues each month, so the balance never
                falls and there is nothing to refinance against. Check the balance, the rate and the
                payment.
              </>
            ) : (
              <>
                At {pct(n(newRate), 2)} over {n(newTerm)} months, the {fmt(stalled.payment)} payment does
                not cover the {fmt(stalled.interest)} of monthly interest, so the new loan would never
                amortise. Check the new rate and term.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your balance, payment, and months remaining to compare offers.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
