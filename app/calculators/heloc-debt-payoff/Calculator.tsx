"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import DebtList, { BLANK_DEBT, type DebtRow } from "../../components/DebtList";
import {
  Card, NumField, Headline, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/** Same guard as debt-payoff and debt-consolidation. */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;

/** The variable-rate scenario each panel shows, in percentage points. */
const RATE_SHOCK = 2;

/** One debt run at its own minimum until it clears. No rollover. */
function atMinimum(balance: number, rate: number, min: number) {
  const r = rate / 100 / 12;
  let bal = balance;
  let interest = 0;
  let months = 0;
  for (let i = 0; i < 1200 && bal > 0.005; i++) {
    const int = bal * r;
    if (min <= int * INTEREST_ONLY_EPSILON) return { interest: Infinity, months: Infinity };
    interest += int;
    bal -= Math.min(min - int, bal);
    months = i + 1;
  }
  return { interest, months };
}

type Scenario = ReturnType<typeof buildScenario>;

/**
 * One way of paying the line, start to finish.
 *
 * The draw period charges interest and accepts whatever the borrower sends;
 * anything above the month's interest comes off the principal. Whatever is
 * left when the draw ends then has to amortise over the repayment period,
 * which is where the payment jumps.
 */
function buildScenario(
  label: string,
  draw: number,
  monthlyPayment: number,
  rate: number,
  drawMonths: number,
  repayMonths: number,
  keptInterest: number,
  keptMin: number,
  interestNow: number,
) {
  const monthlyRate = rate / 100 / 12;
  let bal = draw;
  let drawInterest = 0;
  let drawPaid = 0;
  let clearedInDraw = 0;
  for (let m = 1; m <= drawMonths && bal > 0.005; m++) {
    const int = bal * monthlyRate;
    drawInterest += int;
    const applied = Math.min(monthlyPayment, bal + int);
    drawPaid += applied;
    bal = bal + int - applied;
    if (bal <= 0.005) {
      bal = 0;
      clearedInDraw = m;
    }
  }

  const balanceAtRepay = Math.max(0, bal);
  const amortising = balanceAtRepay > 0.005;
  const repayPayment = amortising ? payment(balanceAtRepay, rate, repayMonths) : 0;
  const repayInterest = amortising ? repayPayment * repayMonths - balanceAtRepay : 0;
  const repayPaymentShocked = amortising ? payment(balanceAtRepay, rate + RATE_SHOCK, repayMonths) : 0;

  const helocInterest = drawInterest + repayInterest;
  return {
    label,
    drawPayment: monthlyPayment,
    monthlyAfter: monthlyPayment + keptMin,
    drawPaid,
    balanceAtRepay,
    balanceUnmoved: draw > 0 && balanceAtRepay >= draw - 0.005,
    clearedInDraw,
    amortising,
    repayPayment,
    repayPaymentShocked,
    jump: repayPayment - monthlyPayment,
    jumpPct: monthlyPayment > 0 ? (repayPayment / monthlyPayment - 1) * 100 : 0,
    helocInterest,
    months: clearedInDraw > 0 ? clearedInDraw : drawMonths + repayMonths,
    // Kept debts sit on both sides of this and cancel out.
    saved: Number.isFinite(interestNow) ? interestNow - (helocInterest + keptInterest) : Infinity,
  };
}

export default function Calculator() {
  const [debts, setDebts] = useState<DebtRow[]>([{ ...BLANK_DEBT }]);
  const [homeValue, setHomeValue] = useState<Num>("");
  const [mortgage, setMortgage] = useState<Num>("");
  const [helocRate, setHelocRate] = useState<Num>("");
  const [drawYears, setDrawYears] = useState<Num>("");
  const [repayYears, setRepayYears] = useState<Num>("");
  /** Optional third scenario. Blank shows just the two anchors. */
  const [drawAmount, setDrawAmount] = useState<Num>("");

  const update = (i: number, patch: Partial<DebtRow>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addDebt = () => setDebts((d) => [...d, { ...BLANK_DEBT }]);
  const removeDebt = (i: number) => setDebts((d) => (d.length > 1 ? d.filter((_, idx) => idx !== i) : d));

  const loadExample = () => {
    // $34,000 across three balances with $850 of minimums between them, so the
    // "what I pay now" anchor is derived rather than asserted. The auto loan is
    // below the HELOC rate and starts ticked, because rolling in the cheap debt
    // alongside the expensive is exactly the move worth flagging.
    setDebts([
      { name: "Credit card", balance: 18500, rate: 24.99, pmt: 460, payoff: true },
      { name: "Store card", balance: 5500, rate: 27.99, pmt: 165, payoff: true },
      { name: "Auto loan", balance: 10000, rate: 6.9, pmt: 225, payoff: true },
    ]);
    setHomeValue(520000);
    setMortgage(310000);
    setHelocRate(8.75);
    setDrawYears(10);
    setRepayYears(20);
    setDrawAmount("");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setDebts([{ ...BLANK_DEBT }]);
    setHomeValue("");
    setMortgage("");
    setHelocRate("");
    setDrawYears("");
    setRepayYears("");
    setDrawAmount("");
  };

  const rate = n(helocRate);
  const drawMonths = Math.round(n(drawYears) * 12);
  const repayMonths = Math.round(n(repayYears) * 12);

  const r = useMemo(() => {
    const rows = debts
      .map((d, i) => ({
        index: i,
        name: d.name.trim() || `Debt ${i + 1}`,
        balance: n(d.balance),
        rate: n(d.rate),
        min: n(d.pmt),
        payoff: d.payoff,
      }))
      .filter((d) => d.balance > 0 && d.min > 0)
      .map((d) => {
        const keep = atMinimum(d.balance, d.rate, d.min);
        // Isolates the rate: the same balance, over the same number of months
        // it would have taken at its own minimum, priced at the HELOC's rate.
        // Mixing in the HELOC's much longer term would blame the rate for a
        // cost the term caused.
        const atHelocRate = Number.isFinite(keep.months)
          ? payment(d.balance, rate, keep.months) * keep.months - d.balance
          : Infinity;
        return {
          ...d,
          keepInterest: keep.interest,
          keepMonths: keep.months,
          rateOnlyPenalty: Number.isFinite(keep.interest) ? atHelocRate - keep.interest : -Infinity,
          stuck: !Number.isFinite(keep.interest),
          notCheaper: d.rate <= rate,
        };
      });

    if (rows.length === 0 || rate < 0 || drawMonths <= 0 || repayMonths <= 0) return null;

    const chosen = rows.filter((d) => d.payoff);
    const kept = rows.filter((d) => !d.payoff);
    const stuck = rows.filter((d) => d.stuck);
    const keptStuck = kept.filter((d) => d.stuck);

    const draw = chosen.reduce((a, d) => a + d.balance, 0);
    const interestOnlyPayment = (draw * rate) / 100 / 12;
    /** What the ticked debts cost today — the second anchor. */
    const payNowAmount = chosen.reduce((a, d) => a + d.min, 0);

    // Baseline: every debt at its own minimum until it clears, no rollover.
    const interestNow = rows.reduce((a, d) => a + d.keepInterest, 0);
    const keptInterest = kept.reduce((a, d) => a + d.keepInterest, 0);
    const keptMin = kept.reduce((a, d) => a + d.min, 0);

    const run = (label: string, pmt: number) =>
      buildScenario(label, draw, pmt, rate, drawMonths, repayMonths, keptInterest, keptMin, interestNow);

    /* ---- The two anchors, always both on screen. ------------------------
     * The same line, the same rate, the same debts. Only the monthly payment
     * differs, and it decides the entire verdict — which is the one thing a
     * reader has to leave this page with.
     */
    const minimumScenario = run("Paying the interest-only minimum", interestOnlyPayment);
    const payNowScenario = run(
      "Keep paying what you pay now",
      Math.max(payNowAmount, interestOnlyPayment),
    );

    /* ---- Anything the reader wants in between. --------------------------- */
    const customAmount = n(drawAmount);
    const distinct = (a: number, b: number) => Math.abs(a - b) > 0.5;
    // Test the figure that would actually be paid, not the one typed: an
    // amount under the interest-only minimum is clamped up to it, and would
    // otherwise render a third panel identical to the first under a label
    // saying something else.
    const effectiveCustom = Math.max(customAmount, interestOnlyPayment);
    const custom = customAmount > 0
      && distinct(effectiveCustom, interestOnlyPayment)
      && distinct(effectiveCustom, payNowScenario.drawPayment)
      ? run(`Paying ${fmt(effectiveCustom)}/mo`, effectiveCustom)
      : null;
    const customUnderInterest = customAmount > 0 && customAmount < interestOnlyPayment;

    const totalBalance = rows.reduce((a, d) => a + d.balance, 0);
    const monthlyNow = rows.reduce((a, d) => a + d.min, 0);
    const weightedRate = totalBalance > 0
      ? rows.reduce((a, d) => a + d.balance * d.rate, 0) / totalBalance
      : 0;

    /* ---- Equity. Information, not a gate. -------------------------------- */
    const value = n(homeValue);
    const equity = Math.max(0, value - n(mortgage));
    const cltvBefore = value > 0 ? (n(mortgage) / value) * 100 : 0;
    const cltvAfter = value > 0 ? ((n(mortgage) + draw) / value) * 100 : 0;

    /* ---- The headline and the takeaway read off these two and nothing else,
     * so the copy cannot drift from the panels again. */
    const swing = payNowScenario.saved - minimumScenario.saved;
    const bothSave = minimumScenario.saved > 0 && payNowScenario.saved > 0;
    const bothCost = minimumScenario.saved <= 0 && payNowScenario.saved <= 0;

    return {
      rows, chosen, kept, stuck, keptStuck,
      draw, totalBalance, weightedRate, monthlyNow, payNowAmount,
      interestOnlyPayment, interestNow, keptMin,
      minimumScenario, payNowScenario, custom, customUnderInterest,
      swing, bothSave, bothCost,
      longestKeepMonths: rows
        .filter((d) => Number.isFinite(d.keepMonths))
        .reduce((a, d) => Math.max(a, d.keepMonths), 0),
      equity, cltvBefore, cltvAfter, value,
      costlyMoves: chosen.filter((d) => d.notCheaper),
      neverClears: !Number.isFinite(interestNow),
    };
  }, [debts, homeValue, mortgage, rate, drawMonths, repayMonths, drawAmount]);

  const panels: Scenario[] = r ? [r.minimumScenario, r.payNowScenario, ...(r.custom ? [r.custom] : [])] : [];
  // Both class strings written out in full so Tailwind sees them.
  const panelGrid = r?.custom
    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4"
    : "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4";

  const line = (k: string, v: string, tone = "text-gray-900") => (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-gray-400">{k}</span>
      <span className={`text-sm font-medium ${tone}`}>{v}</span>
    </div>
  );

  return (
    <CalcShell
      slug="heloc-debt-payoff"
      intro="A HELOC can cut a 25% credit card rate to single digits. It also turns debt you could walk away from into debt secured against your house — and what it ends up costing depends far more on how you pay it than on the rate. Both halves of that trade matter."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-consolidation", "refinance-to-pay-off-debt", "debt-payoff", "balance-transfer"]}
      disclaimer="For educational purposes only, and not advice to borrow against your home. HELOC rates are usually variable, so the payments shown can rise. Missing payments on a HELOC can cost you the house — unsecured debt carries no such risk."
    >
      <Card title="The debts you'd pay off" badge="TICK WHAT THE HELOC COVERS" className="mb-4">
        <DebtList
          debts={debts}
          onUpdate={update}
          onAdd={addDebt}
          onRemove={removeDebt}
          paymentLabel="Minimum"
          balancePlaceholder="18500"
          ratePlaceholder="24.99"
          paymentPlaceholder="460"
          checkboxAction="Pay off with the HELOC"
          rowNote={(d, i) => {
            const row = r?.rows.find((x) => x.index === i);
            if (!row) return null;
            if (row.stuck) {
              return (
                <p className="text-xs text-red-700 leading-relaxed mt-1 xl:pl-10">
                  This minimum doesn&apos;t cover the month&apos;s interest, so the balance grows and it
                  never clears on its own.
                </p>
              );
            }
            if (!d.payoff || !row.notCheaper) return null;
            return (
              <p className="text-xs text-amber-700 leading-relaxed mt-1 xl:pl-10">
                <strong>
                  {row.rate}% is {row.rate === rate ? "the same as" : "below"} the {rate}% HELOC rate.
                </strong>{" "}
                Rolling this one in costs about {fmt(row.rateOnlyPenalty)} more in interest over the same{" "}
                {fmtMonths(row.keepMonths)} it would take on its own — and puts the house behind a debt
                that never touched it. Untick it unless you want the simplicity.
              </p>
            );
          }}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The home" badge="EQUITY" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Home value" value={homeValue} onChange={setHomeValue} min={0} placeholder="520000" prefix="$" />
              <NumField label="Mortgage owed" value={mortgage} onChange={setMortgage} min={0} placeholder="310000" prefix="$" />
            </div>
            {r && r.value > 0 && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                {line("Equity today", fmt(r.equity))}
                {line("Combined loan-to-value", `${r.cltvBefore.toFixed(1)}% → ${r.cltvAfter.toFixed(1)}%`)}
                <p className="text-xs text-gray-400 leading-relaxed">
                  Mortgage plus the {fmt(r.draw)} draw, over the home&apos;s value. Lenders commonly cap
                  combined loan-to-value, and where that cap sits depends on the lender and on you — this
                  page doesn&apos;t guess at it.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title="The HELOC" badge="OFFER" badgeTone="blue" className="h-full">
          <div className="space-y-4">
            {/* Three across only from sm: at 390px the card is 335px wide, and
                a year field with a "yrs" suffix needs more than the 88px that
                leaves — "20" was clipping. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <NumField label="Rate" value={helocRate} onChange={setHelocRate} min={0} placeholder="8.75" suffix="%" step={0.125} />
              </div>
              <NumField label="Draw period" value={drawYears} onChange={setDrawYears} min={0} placeholder="10" suffix="yrs" />
              <NumField label="Repayment" value={repayYears} onChange={setRepayYears} min={0} placeholder="20" suffix="yrs" />
            </div>
            <NumField
              label="Try a different draw payment"
              value={drawAmount}
              onChange={setDrawAmount}
              min={0}
              placeholder={r ? String(Math.round((r.interestOnlyPayment + r.payNowAmount) / 2)) : "500"}
              prefix="$"
              hint={
                r && r.customUnderInterest
                  ? `Below the ${fmt(r.interestOnlyPayment)}/mo interest, so in practice it would be the interest-only minimum — a HELOC won't let the balance grow.`
                  : r
                    ? `Optional. The panels below already show ${fmt(r.interestOnlyPayment)}/mo and ${fmt(r.payNowScenario.drawPayment)}/mo; anything you enter appears beside them as a third.`
                    : "Optional — a third scenario between the interest-only minimum and what you pay today."
              }
            />
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Same line, same rate, same debts — the gap between paying the minimum and paying what you pay now"
              value={r.neverClears ? "—" : fmtK(Math.abs(r.swing))}
              tone={r.bothCost ? "red" : "green"}
            />
            <Takeaway tone={r.bothSave ? "green" : r.bothCost ? "red" : "amber"}>
              {r.neverClears ? (
                <>
                  {r.stuck.map((d) => d.name).join(", ")}{" "}
                  {r.stuck.length === 1 ? "has a minimum" : "have minimums"} too small to cover the
                  interest, so {r.stuck.length === 1 ? "it never clears" : "they never clear"} and there is
                  nothing to measure against.{" "}
                  {r.keptStuck.length > 0 ? (
                    <>
                      <strong>
                        {r.keptStuck.map((d) => d.name).join(", ")} {r.keptStuck.length === 1 ? "is" : "are"}{" "}
                        still outside the HELOC
                      </strong>{" "}
                      — tick {r.keptStuck.length === 1 ? "it" : "them"} or nothing here changes that.
                    </>
                  ) : (
                    <>The HELOC does end either way, but only the second panel below ends it quickly.</>
                  )}
                </>
              ) : r.bothCost ? (
                <>
                  Both ways of paying this line cost more than leaving the debts alone —{" "}
                  <strong>{fmtK(Math.abs(r.minimumScenario.saved))}</strong> more on the interest-only
                  minimum and <strong>{fmtK(Math.abs(r.payNowScenario.saved))}</strong> more even at{" "}
                  {fmt(r.payNowScenario.drawPayment)}/mo. At {rate}% against an average of{" "}
                  {r.weightedRate.toFixed(1)}%, the rate isn&apos;t low enough to pay for the extra years.
                </>
              ) : r.bothSave ? (
                <>
                  Either way this saves money, but not by the same margin:{" "}
                  <strong>{fmtK(r.minimumScenario.saved)}</strong> on the interest-only minimum against{" "}
                  <strong>{fmtK(r.payNowScenario.saved)}</strong> if you keep sending{" "}
                  {fmt(r.payNowScenario.drawPayment)}/mo — <strong>{fmtK(Math.abs(r.swing))}</strong>{" "}
                  apart. The rate gets you in the door; the payment does the work.
                </>
              ) : (
                <>
                  <strong>The rate is not what decides this — the payment is.</strong> On the
                  interest-only minimum of {fmt(r.minimumScenario.drawPayment)}/mo the line costs{" "}
                  <strong>{fmtK(Math.abs(r.minimumScenario.saved))} more</strong> than leaving the debts
                  alone, because it runs for {fmtMonths(r.minimumScenario.months)} instead of{" "}
                  {fmtMonths(r.longestKeepMonths)}. Keep sending the{" "}
                  {fmt(r.payNowScenario.drawPayment)}/mo these debts already cost and the same line at the
                  same rate <strong>saves {fmtK(r.payNowScenario.saved)}</strong> and is gone in{" "}
                  {fmtMonths(r.payNowScenario.months)}. That is{" "}
                  <strong>{fmtK(Math.abs(r.swing))}</strong> of difference from the monthly payment alone.
                </>
              )}
              {r.costlyMoves.length > 0 && (
                <>
                  {" "}
                  <strong>
                    {r.costlyMoves.map((d) => d.name).join(" and ")}{" "}
                    {r.costlyMoves.length === 1 ? "is" : "are"} already at or below {rate}%
                  </strong>{" "}
                  — untick {r.costlyMoves.length === 1 ? "it" : "them"} and the rest of this still works.
                </>
              )}
            </Takeaway>
            <p className="text-xs text-gray-400 leading-relaxed mt-3">
              Both are measured against the same baseline: every debt left where it is, paid at its own
              minimum until it clears, with nothing rolled over —{" "}
              {r.neverClears ? "which these minimums never do" : `${fmtK(r.interestNow)} of interest`}.
            </p>
          </div>

          <div className={panelGrid}>
            {panels.map((s, i) => {
              const good = s.saved > 0;
              return (
                <div
                  key={s.label}
                  className={`border rounded-2xl p-5 ${good ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-4">
                    <h3 className="text-sm font-medium text-gray-900">{s.label}</h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {i === 0 ? "the minimum" : i === 1 ? "what you pay today" : "your figure"}
                    </span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-2 mb-3">
                    {line("During the draw", `${fmt(s.drawPayment)}/mo`)}
                    {s.amortising
                      ? line("Once repayment starts", `${fmt(s.repayPayment)}/mo`, "text-amber-700")
                      : line("Once repayment starts", "Already paid off", "text-green-700")}
                    {s.amortising && line("The jump", `+${fmt(s.jump)} (${s.jumpPct.toFixed(0)}%)`, "text-amber-700")}
                    {s.amortising &&
                      line(`If the rate rose ${RATE_SHOCK} points`, `${fmt(s.repayPaymentShocked)}/mo`, "text-amber-700")}
                    {line("Time to clear", fmtMonths(s.months))}
                    {line("Total interest", fmtK(s.helocInterest))}
                  </div>
                  {s.balanceUnmoved && (
                    <p className="text-xs text-red-800 leading-relaxed mb-3">
                      After {fmtMonths(drawMonths)} you would still owe{" "}
                      <strong>{fmt(s.balanceAtRepay)}</strong>. You would have paid {fmt(s.drawPaid)} and
                      reduced the debt by nothing.
                    </p>
                  )}
                  <p className={`text-sm font-medium ${good ? "text-green-800" : "text-red-800"}`}>
                    {good ? "Saves" : "Costs"} {fmtK(Math.abs(s.saved))}{" "}
                    {good ? "against keeping the debts" : "more than keeping the debts"}
                  </p>
                  {r.keptMin > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {fmt(s.monthlyAfter)}/mo all in, counting the debts you left out.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <ChartCard title="Total cost of clearing the debt" footnote="The balances plus every dollar of interest.">
            <BarChart
              ariaLabel="Total cost of keeping the debts compared with each way of paying the HELOC"
              height={220}
              bars={[
                {
                  label: "Keep as is",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: Number.isFinite(r.interestNow) ? r.interestNow : 0, color: COLORS.red },
                  ],
                },
                ...panels.map((s, i) => ({
                  label: i === 0 ? "HELOC, minimum" : i === 1 ? "HELOC, paying now" : "HELOC, your figure",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: s.helocInterest, color: COLORS.amber },
                  ],
                })),
              ]}
            />
          </ChartCard>

          <div className="border border-red-200 rounded-2xl p-5 mb-4 bg-red-50">
            <h2 className="text-sm font-medium text-red-800 mb-3">Read this before you sign</h2>
            <div className="space-y-2">
              <Takeaway tone="red">
                <strong>You are converting unsecured debt into secured debt.</strong> Credit card debt is
                painful but your home is not on the line. A HELOC is a lien against the house — fall behind
                and foreclosure is on the table. The interest figures above are real, and so is that risk.
              </Takeaway>
              <Takeaway tone="amber">
                Most HELOC rates are variable. Every panel assumes {rate}% throughout and shows what{" "}
                {RATE_SHOCK} points would do to the repayment-period payment. Nothing stops it moving
                further than that.
              </Takeaway>
              <Takeaway tone="blue">
                Interest on a HELOC is only deductible when the money buys, builds or substantially
                improves the home securing it — paying off cards or a car does not qualify, and that rule
                is now permanent. Assume no tax break here.
              </Takeaway>
              <Takeaway tone="blue">
                This goes wrong the same way every time: the cards get cleared, then used again, and you
                end up owing both the HELOC and the cards with your house behind the larger half.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add at least one debt with a balance and minimum payment, then the HELOC&apos;s rate, draw
            period and repayment period.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
