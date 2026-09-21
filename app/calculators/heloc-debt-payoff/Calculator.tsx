"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import DebtList, { BLANK_DEBT, type DebtRow } from "../../components/DebtList";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/** Same guard as debt-payoff and debt-consolidation. */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;

/** The variable-rate scenario the page shows, in percentage points. */
const RATE_SHOCK = 2;

type DrawMode = "interest-only" | "set";

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

export default function Calculator() {
  const [debts, setDebts] = useState<DebtRow[]>([{ ...BLANK_DEBT }]);
  const [homeValue, setHomeValue] = useState<Num>("");
  const [mortgage, setMortgage] = useState<Num>("");
  const [helocRate, setHelocRate] = useState<Num>("");
  const [drawYears, setDrawYears] = useState<Num>("");
  const [repayYears, setRepayYears] = useState<Num>("");
  const [drawMode, setDrawMode] = useState<DrawMode>("interest-only");
  const [drawAmount, setDrawAmount] = useState<Num>("");

  const update = (i: number, patch: Partial<DebtRow>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addDebt = () => setDebts((d) => [...d, { ...BLANK_DEBT }]);
  const removeDebt = (i: number) => setDebts((d) => (d.length > 1 ? d.filter((_, idx) => idx !== i) : d));

  const loadExample = () => {
    // $34,000 across three balances with $850 of minimums between them, so the
    // "what I pay now" figure is derived rather than asserted. The auto loan is
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
    // The minimum a HELOC asks for during the draw, which is the trap.
    setDrawMode("interest-only");
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
    setDrawMode("interest-only");
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
    const monthlyRate = rate / 100 / 12;
    const interestOnlyPayment = draw * monthlyRate;

    /* ---- The draw period. ------------------------------------------------
     * A HELOC's minimum during the draw is the month's interest, so the
     * balance sits exactly where it started. Anything above that is the
     * borrower's own choice and comes straight off the principal.
     */
    const chosenPayment = n(drawAmount);
    const underInterest = drawMode === "set" && chosenPayment > 0 && chosenPayment < interestOnlyPayment;
    const drawPayment = drawMode === "interest-only"
      ? interestOnlyPayment
      : Math.max(chosenPayment, interestOnlyPayment);

    let bal = draw;
    let drawInterest = 0;
    let drawPaid = 0;
    let clearedInDraw = 0;
    for (let m = 1; m <= drawMonths && bal > 0.005; m++) {
      const int = bal * monthlyRate;
      drawInterest += int;
      const applied = Math.min(drawPayment, bal + int);
      drawPaid += applied;
      bal = bal + int - applied;
      if (bal <= 0.005) {
        bal = 0;
        clearedInDraw = m;
      }
    }

    /* ---- The repayment period. The balance left now has to amortise. ---- */
    const balanceAtRepay = Math.max(0, bal);
    const repayPayment = balanceAtRepay > 0.005 ? payment(balanceAtRepay, rate, repayMonths) : 0;
    const repayInterest = balanceAtRepay > 0.005 ? repayPayment * repayMonths - balanceAtRepay : 0;
    // The same balance if the rate drifted up by the time repayment began.
    const repayPaymentShocked = balanceAtRepay > 0.005
      ? payment(balanceAtRepay, rate + RATE_SHOCK, repayMonths)
      : 0;

    const helocInterest = drawInterest + repayInterest;
    const helocMonths = clearedInDraw > 0 ? clearedInDraw : drawMonths + repayMonths;
    const jump = repayPayment - drawPayment;
    const balanceUnmoved = balanceAtRepay >= draw - 0.005 && draw > 0;

    /* ---- Against leaving the debts alone. -------------------------------
     * Baseline: every debt at its own minimum until it clears, nothing rolled
     * over onto anything else. Kept debts appear on both sides and cancel.
     */
    const interestNow = rows.reduce((a, d) => a + d.keepInterest, 0);
    const keptInterest = kept.reduce((a, d) => a + d.keepInterest, 0);
    const interestAfter = helocInterest + keptInterest;
    const saved = Number.isFinite(interestNow) ? interestNow - interestAfter : Infinity;

    const totalBalance = rows.reduce((a, d) => a + d.balance, 0);
    const monthlyNow = rows.reduce((a, d) => a + d.min, 0);
    const keptMin = kept.reduce((a, d) => a + d.min, 0);
    const monthlyAfter = drawPayment + keptMin;
    const weightedRate = totalBalance > 0
      ? rows.reduce((a, d) => a + d.balance * d.rate, 0) / totalBalance
      : 0;

    /* ---- Equity. Information, not a gate. -------------------------------- */
    const value = n(homeValue);
    const equity = Math.max(0, value - n(mortgage));
    const cltvBefore = value > 0 ? (n(mortgage) / value) * 100 : 0;
    const cltvAfter = value > 0 ? ((n(mortgage) + draw) / value) * 100 : 0;

    const better = stuck.length > 0 ? keptStuck.length === 0 : saved > 0;
    const costlyMoves = chosen.filter((d) => d.notCheaper);

    return {
      rows, chosen, kept, stuck, keptStuck,
      draw, totalBalance, weightedRate,
      interestOnlyPayment, drawPayment, underInterest,
      drawInterest, drawPaid, balanceAtRepay, balanceUnmoved, clearedInDraw,
      repayPayment, repayInterest, repayPaymentShocked, jump,
      helocInterest, helocMonths,
      interestNow, interestAfter, saved,
      monthlyNow, monthlyAfter, keptMin,
      equity, cltvBefore, cltvAfter, value,
      better, costlyMoves,
      neverClears: !Number.isFinite(interestNow),
    };
  }, [debts, homeValue, mortgage, rate, drawMonths, repayMonths, drawMode, drawAmount]);

  return (
    <CalcShell
      slug="heloc-debt-payoff"
      intro="A HELOC can cut a 25% credit card rate to single digits. It also turns debt you could walk away from into debt secured against your house — and it does not behave like a fixed loan. Both halves of that trade matter."
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
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Equity today</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.equity)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Combined loan-to-value</span>
                  <span className="text-sm font-medium text-gray-900">
                    {r.cltvBefore.toFixed(1)}% → {r.cltvAfter.toFixed(1)}%
                  </span>
                </div>
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
            <SelectField
              label="What you'd pay during the draw period"
              value={drawMode}
              onChange={(v) => setDrawMode(v as DrawMode)}
              options={[
                { value: "interest-only", label: "The interest-only minimum" },
                { value: "set", label: "A set amount, paying principal down" },
              ]}
              hint={
                r
                  ? `The interest-only minimum on a ${fmt(r.draw)} draw is ${fmt(r.interestOnlyPayment)}/mo. It clears no principal at all.`
                  : "Most HELOCs ask only for the month's interest while the line is open."
              }
            />
            {drawMode === "set" && (
              <NumField
                label="Paying each month during the draw"
                value={drawAmount}
                onChange={setDrawAmount}
                min={0}
                placeholder={r && r.monthlyNow > 0 ? String(Math.round(r.monthlyNow)) : "850"}
                prefix="$"
                hint={
                  r && r.underInterest
                    ? `Below the ${fmt(r.interestOnlyPayment)}/mo interest — the figures below use the interest-only minimum instead, since a HELOC won't let the balance grow.`
                    : r && r.monthlyNow > 0
                      ? `You currently pay ${fmt(r.monthlyNow)}/mo across these debts. Putting the same amount here is the fastest version of this plan.`
                      : "Anything above the interest comes straight off the balance."
                }
              />
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">During the draw</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.drawPayment)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.clearedInDraw > 0 ? `clears in ${fmtMonths(r.clearedInDraw)}` : `for ${fmtMonths(drawMonths)}`}
                </p>
              </div>
              <div className={`p-4 text-center ${r.clearedInDraw > 0 ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">
                  {r.clearedInDraw > 0 ? "Paid off before repayment begins" : "The payment jumps by"}
                </p>
                <p className="text-2xl font-medium text-white">
                  {r.clearedInDraw > 0 ? "No jump" : `+${fmt(r.jump)}`}
                </p>
                <p className="text-xs text-white/70">
                  {r.clearedInDraw > 0
                    ? "nothing left to amortise"
                    : `${((r.repayPayment / Math.max(r.drawPayment, 0.01) - 1) * 100).toFixed(0)}% more, overnight`}
                </p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Once repayment starts</p>
                <p className="text-lg font-medium text-gray-900">
                  {r.clearedInDraw > 0 ? "—" : `${fmt(r.repayPayment)}/mo`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.clearedInDraw > 0 ? "no repayment period" : `for ${fmtMonths(repayMonths)}`}
                </p>
              </div>
            </div>
          </div>

          {r.balanceUnmoved && (
            <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">
                After {fmtMonths(drawMonths)} you would still owe {fmt(r.balanceAtRepay)}
              </p>
              <p className="text-xs text-red-800 leading-relaxed">
                The interest-only minimum is exactly that — it covers the interest and nothing else, so the
                balance ends the draw period where it started. You would have paid{" "}
                <strong>{fmt(r.drawPaid)}</strong> over those years and reduced the debt by nothing, and
                the {fmt(r.repayPayment)}/mo repayment schedule starts from the full{" "}
                {fmt(r.balanceAtRepay)}.
              </p>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={r.better ? "Interest saved against leaving them alone" : "Extra interest against leaving them alone"}
              value={r.neverClears ? "—" : fmtK(Math.abs(r.saved))}
              tone={r.better ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat
                label="Interest if nothing changes"
                value={r.neverClears ? "Never clears" : fmtK(r.interestNow)}
                sub="each debt at its own minimum"
                tone="amber"
              />
              <Stat
                label="Interest on the HELOC"
                value={fmtK(r.helocInterest)}
                sub={r.clearedInDraw > 0 ? "cleared during the draw" : "draw plus repayment"}
                tone={r.better ? "green" : "red"}
              />
              <Stat
                label="Monthly, all in"
                value={`${fmt(r.monthlyAfter)}`}
                sub={`now ${fmt(r.monthlyNow)}`}
              />
              <Stat
                label={`If the rate rose ${RATE_SHOCK} points`}
                value={r.clearedInDraw > 0 ? "—" : `${fmt(r.repayPaymentShocked)}/mo`}
                sub={
                  r.clearedInDraw > 0
                    ? "no repayment period to shock"
                    : `+${fmt(r.repayPaymentShocked - r.repayPayment)} on repayment`
                }
                tone="amber"
              />
            </div>
            {r.neverClears ? (
              <Takeaway tone={r.keptStuck.length > 0 ? "red" : "green"}>
                {r.stuck.map((d) => d.name).join(", ")}{" "}
                {r.stuck.length === 1 ? "has a minimum" : "have minimums"} too small to cover the interest,
                so {r.stuck.length === 1 ? "it never gets" : "they never get"} paid off.{" "}
                {r.keptStuck.length > 0 ? (
                  <>
                    <strong>
                      {r.keptStuck.map((d) => d.name).join(", ")} {r.keptStuck.length === 1 ? "is" : "are"}{" "}
                      still outside the HELOC
                    </strong>{" "}
                    — tick {r.keptStuck.length === 1 ? "it" : "them"} or nothing here changes that.
                  </>
                ) : (
                  <>
                    The HELOC at <strong>{rate}%</strong> does end, which is the argument for it — provided
                    you pay principal rather than the interest-only minimum.
                  </>
                )}
              </Takeaway>
            ) : (
              <Takeaway tone={r.better ? "green" : "red"}>
                Moving {fmtK(r.draw)} from an average of <strong>{r.weightedRate.toFixed(1)}%</strong> to a
                HELOC at <strong>{rate}%</strong>{" "}
                {r.better ? (
                  <>
                    saves <strong>{fmtK(r.saved)}</strong> in interest and clears it in{" "}
                    <strong>{fmtMonths(r.helocMonths)}</strong>.
                  </>
                ) : (
                  <>
                    <strong>costs {fmtK(Math.abs(r.saved))} more</strong> in interest, not less. The rate
                    is lower but the money is borrowed for {fmtMonths(r.helocMonths)} instead of the{" "}
                    {fmtMonths(Math.max(...r.rows.filter((d) => Number.isFinite(d.keepMonths)).map((d) => d.keepMonths)))}{" "}
                    your current payments would take. A lower rate over a much longer term is not a saving.
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
            )}
          </div>

          <ChartCard title="Total cost of clearing the debt" footnote="The balances plus every dollar of interest.">
            <BarChart
              ariaLabel="Total cost of keeping high-interest debt compared with moving it to a HELOC"
              height={200}
              bars={[
                {
                  label: "Keep as is",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: Number.isFinite(r.interestNow) ? r.interestNow : 0, color: COLORS.red },
                  ],
                },
                {
                  label: "HELOC",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: r.interestAfter, color: COLORS.amber },
                  ],
                },
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
                Most HELOC rates are variable. Everything above assumes {rate}% throughout; the tile shows
                what {RATE_SHOCK} points would do to the repayment-period payment, and nothing stops it
                moving further than that.
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
