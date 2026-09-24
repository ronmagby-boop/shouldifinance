"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, DateField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

const VA_LIMIT = 36; // months — the statutory recoupment ceiling for an IRRRL

/** An IRRRL has to clear both of these on the loan being refinanced. */
const SEASONING_DAYS = 210;
const SEASONING_PAYMENTS = 6;

/**
 * VA allows only incidental cash back to the veteran on an IRRRL. Past the
 * first threshold the structure needs explaining; past the second it probably
 * is not an IRRRL at all.
 */
const CASH_BACK_NOTICE = 500;
const CASH_BACK_LIMIT = 2000;

const addDays = (d: Date, days: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
};
const addMonths = (d: Date, months: number) => {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
};
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [currentRate, setCurrentRate] = useState<Num>("");
  const [currentPayment, setCurrentPayment] = useState<Num>("");
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  /** Box D on the Loan Estimate: A + B + C. All recoupable. */
  const [loanCosts, setLoanCosts] = useState<Num>("");
  /** The recording-fee portion of Box E. Recoupable; the taxes in E are not. */
  const [recordingFees, setRecordingFees] = useState<Num>("");
  /** Box J, second line. Reduces what the veteran pays, so it reduces recoupment. */
  const [lenderCredits, setLenderCredits] = useState<Num>("");
  const [fundingFeePct, setFundingFeePct] = useState<Num>("");
  /**
   * Exemption is a property of the borrower, not of the loan, so it overrides
   * the rate rather than zeroing the field — the percentage stays typed and
   * comes back if the box is unticked.
   */
  const [ffExempt, setFfExempt] = useState(false);
  const [escrow, setEscrow] = useState<Num>("");
  const [financeCosts, setFinanceCosts] = useState(true);
  const [firstPayment, setFirstPayment] = useState("");
  /** Optional override; blank means use the derived figure. */
  const [loanOverride, setLoanOverride] = useState<Num>("");

  const loadExample = () => {
    setBalance(340000);
    setCurrentRate(7.25);
    setCurrentPayment(2320);
    setNewRate(6.125);
    setNewTerm(30);
    setLoanCosts(4200);
    setRecordingFees(250);
    setLenderCredits(950);
    setFundingFeePct(0.5);
    setFfExempt(false);
    setEscrow(0);
    setFinanceCosts(true);
    const seasoned = addMonths(new Date(), -18);
    setFirstPayment(seasoned.toISOString().slice(0, 10));
    setLoanOverride("");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setBalance("");
    setCurrentRate("");
    setCurrentPayment("");
    setNewRate("");
    setNewTerm("");
    setLoanCosts("");
    setRecordingFees("");
    setLenderCredits("");
    setFundingFeePct("");
    setFfExempt(false);
    setEscrow("");
    setFinanceCosts(true);
    setFirstPayment("");
    setLoanOverride("");
  };

  const r = useMemo(() => {
    if (n(balance) <= 0 || n(currentPayment) <= 0) return null;

    const fundingFee = ffExempt ? 0 : (n(balance) * n(fundingFeePct)) / 100;
    /**
     * Two different totals, and conflating them was overstating recoupment.
     *
     * RECOUPABLE is what has to pay for itself inside 36 months. 38 U.S.C.
     * 3709(a) counts "fees, closing costs, and expenses" other than taxes,
     * amounts held in escrow, and fees paid under chapter 37. Mapped onto the
     * Loan Estimate that is Box D in full, plus the recording fees inside Box
     * E — but not the taxes that share that box, and not Boxes F or G.
     *
     * Lender credits come off the top. VA Circular 26-19-22, Exhibit B is
     * explicit that "lender credits may be used to offset allowable fees and
     * charges (including discount points)", so a credit-heavy IRRRL genuinely
     * recoups faster. Floored at zero: a credit larger than the costs does not
     * make recoupment negative, it makes it immediate.
     *
     * FINANCED is the wider figure. The funding fee and any escrow do go into
     * the new balance, and therefore into the new payment, even though neither
     * has to recoup.
     */
    const grossCosts = n(loanCosts) + n(recordingFees);
    const recoupableCosts = Math.max(0, grossCosts - n(lenderCredits));
    const financedCosts = Math.max(0, grossCosts + fundingFee + n(escrow) - n(lenderCredits));
    const derivedLoan = financeCosts ? n(balance) + financedCosts : n(balance);

    // An entered figure wins, but the derived one stays on screen beside it so
    // the difference is visible rather than silently swallowed.
    const overridden = n(loanOverride) > 0;
    const newLoan = overridden ? n(loanOverride) : derivedLoan;

    /**
     * The most an IRRRL can be written for: the payoff plus the fees that are
     * allowed to be financed. Anything above this is cash going back to the
     * veteran, which VA permits only incidentally.
     */
    const allowableMax = n(balance) + financedCosts;
    const excess = newLoan - allowableMax;

    const termMonths = Math.max(1, n(newTerm) * 12);
    const newPayment = payment(newLoan, n(newRate), termMonths);

    const monthlySavings = n(currentPayment) - newPayment;
    const recoupMonths = monthlySavings > 0 ? recoupableCosts / monthlySavings : null;
    const passes = recoupMonths !== null && recoupMonths <= VA_LIMIT;

    // Cumulative net position: costs first, then savings accumulate.
    const horizon = 60;
    const net: number[] = [];
    const zero: number[] = [];
    for (let m = 0; m <= horizon; m++) {
      net.push(monthlySavings * m - recoupableCosts);
      zero.push(0);
    }

    const rateDrop = n(currentRate) - n(newRate);

    /**
     * Seasoning. Both tests run off the first payment due date and both have to
     * pass; they can fail separately, and either one blocks the loan however
     * well it recoups.
     */
    let seasoning = null;
    if (firstPayment) {
      const first = new Date(`${firstPayment}T00:00:00`);
      if (!Number.isNaN(first.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayTarget = addDays(first, SEASONING_DAYS);
        const daysElapsed = Math.floor((today.getTime() - first.getTime()) / 86400000);
        const daysMet = today.getTime() >= dayTarget.getTime();

        // Payment 1 falls on the first due date, payment 6 five months later.
        const paymentTarget = addMonths(first, SEASONING_PAYMENTS - 1);
        const monthsElapsed =
          (today.getFullYear() - first.getFullYear()) * 12 +
          (today.getMonth() - first.getMonth()) -
          (today.getDate() < first.getDate() ? 1 : 0);
        const paymentsMade = Math.max(0, monthsElapsed + 1);
        const paymentsMet = today.getTime() >= paymentTarget.getTime();

        const eligibleFrom = new Date(Math.max(dayTarget.getTime(), paymentTarget.getTime()));
        seasoning = {
          first, daysElapsed, daysMet, dayTarget,
          paymentsMade, paymentsMet, paymentTarget,
          eligibleFrom, passes: daysMet && paymentsMet,
        };
      }
    }

    return {
      fundingFee,
      grossCosts,
      recoupableCosts,
      financedCosts,
      derivedLoan,
      overridden,
      allowableMax,
      excess,
      seasoning,
      newLoan,
      newPayment,
      monthlySavings,
      recoupMonths,
      passes,
      net,
      zero,
      rateDrop,
      savings5yr: monthlySavings * 60 - recoupableCosts,
      savings10yr: monthlySavings * 120 - recoupableCosts,
      maxCosts: monthlySavings > 0 ? monthlySavings * VA_LIMIT : 0,
    };
  }, [balance, currentRate, currentPayment, newRate, newTerm, loanCosts, recordingFees, lenderCredits, fundingFeePct, ffExempt, escrow, financeCosts, firstPayment, loanOverride]);

  return (
    <CalcShell
      slug="va-recoup"
      intro="A VA streamline refinance (IRRRL) has a hard rule: the fees have to pay for themselves within 36 months. Enter your numbers to see your recoupment period and whether the loan clears that bar."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["should-i-refinance", "mortgage-payment", "loan-estimate-comparison"]}
      disclaimer="For educational purposes only and not a commitment to lend. VA recoupment rules count fees, closing costs and expenses other than taxes, insurance, and escrow — lender interpretations vary. IRRRLs also require a net tangible benefit. Confirm eligibility and exact figures with a VA-approved lender."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your current VA loan" badge="TODAY">
          <div className="space-y-4">
            <NumField label="Current balance" value={balance} onChange={setBalance} placeholder="340000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current rate" value={currentRate} onChange={setCurrentRate} placeholder="7.25" suffix="%" step={0.125} />
              <NumField label="Payment (P&I)" value={currentPayment} onChange={setCurrentPayment} placeholder="2320" prefix="$" />
            </div>
            <DateField
              label="First payment date on your current loan"
              value={firstPayment}
              onChange={setFirstPayment}
              hint="Used for the seasoning test. VA needs 210 days since this date and six payments made before an IRRRL can close."
            />
          </div>
        </Card>

        <Card title="The IRRRL you're offered" badge="PROPOSED" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="New rate" value={newRate} onChange={setNewRate} placeholder="6.125" suffix="%" step={0.125} />
              <NumField label="New term" value={newTerm} onChange={setNewTerm} placeholder="30" suffix="yrs" />
            </div>
            <NumField
              label="VA funding fee"
              value={fundingFeePct}
              onChange={setFundingFeePct}
              placeholder="0.5"
              suffix="%"
              step={0.05}
              disabled={ffExempt}
              hint={ffExempt ? "Exempt — no fee on this loan." : "0.5% for most IRRRLs. Never recouped."}
            />
            <Toggle checked={ffExempt} onChange={setFfExempt}>
              Exempt from the funding fee — receiving or eligible for VA disability compensation,
              DIC, or a Purple Heart on active duty. A 0% rating is not exempt.
            </Toggle>
            {r && (
              <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-green-700 font-medium">New payment (P&amp;I)</span>
                <span className="text-sm font-medium text-green-800">{fmt(r.newPayment)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Costs get their own full-width row. Four short fields across beats a
          stack of four inside one column — it balanced the two cards above,
          which had drifted badly apart, and it lets one line of context carry
          the "page 2 of your Loan Estimate" framing instead of repeating it in
          every hint. */}
      <Card title="Closing costs" badge="LOAN ESTIMATE, PAGE 2" badgeTone="blue" className="mb-4">
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          Read these straight off page 2 of the Loan Estimate your lender gave you. Only the first
          two count toward the 36-month test — the funding fee, taxes, prepaids and escrow are
          excluded by statute.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <NumField
            label="Total Loan Costs (D)"
            value={loanCosts}
            onChange={setLoanCosts}
            min={0}
            placeholder="4200"
            prefix="$"
            hint="Boxes A + B + C. All of it recoups."
          />
          <NumField
            label="Recording fees (from E)"
            value={recordingFees}
            onChange={setRecordingFees}
            min={0}
            placeholder="250"
            prefix="$"
            hint="Recording only — not transfer taxes."
          />
          <NumField
            label="Lender credits (J)"
            value={lenderCredits}
            onChange={setLenderCredits}
            min={0}
            placeholder="950"
            prefix="$"
            hint="Shown negative on the form; enter it positive."
          />
          <NumField
            label="Prepaids and escrow (F + G)"
            value={escrow}
            onChange={setEscrow}
            min={0}
            placeholder="0"
            prefix="$"
            hint="Financed, never recouped."
          />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:items-start">
          <Toggle checked={financeCosts} onChange={setFinanceCosts}>
            Roll costs into the new loan (IRRRLs are usually structured this way)
          </Toggle>
          <NumField
            label="New loan amount"
            value={loanOverride}
            onChange={setLoanOverride}
            placeholder={r && !r.overridden ? String(Math.round(r.derivedLoan)) : "345200"}
            prefix="$"
            hint={
              r && r.overridden
                ? `Using your figure. Derived from the inputs above: ${fmt(r.derivedLoan)}.`
                : "Optional — leave blank to derive it."
            }
          />
        </div>
      </Card>

      {r ? (
        <>
          <div className={`border rounded-2xl p-5 mb-4 ${r.passes ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="text-xs text-gray-500 mb-1">Recoupment period</p>
            <div className="flex flex-wrap items-baseline gap-3 mb-4">
              <p className={`text-3xl font-medium tracking-tight ${r.passes ? "text-green-700" : "text-amber-700"}`}>
                {r.recoupMonths === null ? "Never" : `${Math.ceil(r.recoupMonths)} months`}
              </p>
              <span className={`text-xs rounded-full px-3 py-1 font-medium ${r.passes ? "bg-green-700 text-white" : "bg-amber-600 text-white"}`}>
                {r.passes ? "✓ PASSES the 36-month rule" : "✗ FAILS the 36-month rule"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Monthly savings" value={r.monthlySavings > 0 ? `${fmt(r.monthlySavings)}/mo` : "None"} tone={r.monthlySavings > 0 ? "green" : "red"} />
              <Stat
                label="Recoupable costs"
                value={fmt(r.recoupableCosts)}
                sub={
                  n(lenderCredits) > 0
                    ? `${fmt(r.grossCosts)} less ${fmt(n(lenderCredits))} in credits`
                    : "funding fee, taxes and prepaids excluded"
                }
              />
              <Stat label="Rate reduction" value={pct(r.rateDrop, 3)} tone={r.rateDrop > 0 ? "green" : "red"} />
              <Stat label="New loan amount" value={fmtK(r.newLoan)} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Net savings after 5 years" value={fmtK(r.savings5yr)} tone={r.savings5yr > 0 ? "green" : "red"} />
            {/* "Break-even" lived here showing Math.ceil(recoupMonths) — the
                recoupment period again, under a second name. One number with two
                labels reads as a discrepancy, so it is gone rather than restated. */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Stat label="Net after 10 years" value={fmtK(r.savings10yr)} tone={r.savings10yr > 0 ? "green" : "red"} />
              <Stat
                label="Max costs that would still pass"
                value={r.maxCosts > 0 ? fmt(r.maxCosts) : "—"}
                sub="at this monthly savings"
              />
            </div>
            <Takeaway tone={r.passes ? "green" : "amber"}>
              {r.recoupMonths === null ? (
                <>
                  <strong>⚠ This loan doesn&apos;t lower your payment</strong>, so there is nothing to
                  recoup. An IRRRL must produce a net tangible benefit — normally a lower rate and payment,
                  or a move from an adjustable rate to a fixed one.
                </>
              ) : r.passes ? (
                <>
                  <strong>✓ Recoups in {Math.ceil(r.recoupMonths)} months</strong>, inside the 36-month
                  limit with {VA_LIMIT - Math.ceil(r.recoupMonths)} months to spare. You could absorb up to{" "}
                  <strong>{fmt(r.maxCosts)}</strong> in costs and still qualify — useful leverage if a
                  lender quotes higher fees.
                </>
              ) : (
                <>
                  <strong>⚠ Recoupment takes {Math.ceil(r.recoupMonths)} months</strong>, past the
                  36-month limit. To qualify, costs need to come down to about{" "}
                  <strong>{fmt(r.maxCosts)}</strong> — ask about a lender credit or a slightly higher rate
                  with fewer fees.
                </>
              )}
            </Takeaway>
          </div>

          {/* Seasoning is a gate, not a footnote: a loan can recoup in twelve
              months and still be ineligible, so it sits with the verdict rather
              than below the charts. */}
          {r.seasoning && (
            <div
              className={`border-2 rounded-2xl p-5 mb-4 ${
                r.seasoning.passes ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <p className={`text-sm font-medium mb-3 ${r.seasoning.passes ? "text-green-800" : "text-red-800"}`}>
                {r.seasoning.passes
                  ? "✓ Seasoning met — this loan is old enough to refinance"
                  : `⚠ Not seasoned yet — eligible from ${fmtDate(r.seasoning.eligibleFrom)}`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-white border border-gray-100 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">210 days since first payment</p>
                  <p className={`text-sm font-medium ${r.seasoning.daysMet ? "text-green-700" : "text-red-600"}`}>
                    {r.seasoning.daysMet ? "Met" : "Not met"} — {r.seasoning.daysElapsed} days
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.seasoning.daysMet ? "cleared " : "clears "}
                    {fmtDate(r.seasoning.dayTarget)}
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Six consecutive payments</p>
                  <p className={`text-sm font-medium ${r.seasoning.paymentsMet ? "text-green-700" : "text-red-600"}`}>
                    {r.seasoning.paymentsMet ? "Met" : "Not met"} — {r.seasoning.paymentsMade} made
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.seasoning.paymentsMet ? "sixth was due " : "sixth due "}
                    {fmtDate(r.seasoning.paymentTarget)}
                  </p>
                </div>
              </div>
              <p className={`text-xs mt-3 leading-relaxed ${r.seasoning.passes ? "text-green-800" : "text-red-800"}`}>
                {r.seasoning.passes ? (
                  <>
                    Both tests are satisfied, so seasoning is not what decides this loan — the
                    recoupment period above is.
                  </>
                ) : (
                  <>
                    Both have to be met, and they clear on different dates. Until{" "}
                    <strong>{fmtDate(r.seasoning.eligibleFrom)}</strong> the loan cannot close as an
                    IRRRL however well it recoups.
                  </>
                )}
              </p>
            </div>
          )}

          {r.excess > CASH_BACK_LIMIT ? (
            <div className="border-2 border-red-300 bg-red-50 rounded-2xl p-5 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">
                ⚠ The new loan is {fmt(r.excess)} above the payoff plus allowable fees
              </p>
              <p className="text-xs text-red-800 leading-relaxed">
                A {fmt(r.newLoan)} loan against a {fmt(r.allowableMax)} payoff and allowable fees is not
                an incidental difference. This structure should be reviewed before you go further — as
                entered, the loan may not be eligible as an IRRRL at all. Ask the lender to itemise
                what the extra {fmt(r.excess)} is paying for.
              </p>
            </div>
          ) : r.excess > CASH_BACK_NOTICE ? (
            <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>The new loan is {fmt(r.excess)} above the payoff plus allowable fees.</strong> VA
                limits cash back to the veteran on an IRRRL to an incidental amount, and this structure
                would exceed it. Check the figure against the Loan Estimate.
              </p>
            </div>
          ) : null}

          <ChartCard title="When the refinance pays for itself">
            <LineChart
              ariaLabel="Cumulative net savings over five years showing the recoupment crossover point"
              periodsPerYear={12}
              baselineZero
              series={[
                { label: "Cumulative net savings", color: COLORS.green, data: r.net },
                { label: "Recoupment line", color: COLORS.gray, data: r.zero, dash: [4, 4] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The line starts below zero by the full {fmt(r.recoupableCosts)} in costs and climbs by{" "}
                {fmt(Math.max(0, r.monthlySavings))} a month. Where it crosses zero is your recoupment
                date — the VA requires that to happen within 36 months.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Payment comparison">
            <BarChart
              ariaLabel="Current monthly payment compared with the proposed IRRRL payment"
              height={200}
              bars={[
                { label: "Current payment", segments: [{ label: "P&I", value: n(currentPayment), color: COLORS.gray }] },
                { label: "IRRRL payment", segments: [{ label: "P&I", value: r.newPayment, color: COLORS.green }] },
              ]}
              valueFormat={(v) => `$${Math.round(v).toLocaleString()}`}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your current balance and payment to check the 36-month rule.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
