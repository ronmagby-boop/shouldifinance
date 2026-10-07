"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, RangeField, Headline, Takeaway, EmptyState,
  fmt, fmtK, pct, has, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import {
  DEFAULT_DRAW_YEARS, DEFAULT_REPAY_YEARS, FED_MOVES, FED_MOVE_MAX, FED_MOVE_MIN, FED_MOVE_STEP,
  breakEvenMove, compare, type Inputs,
} from "../../lib/equityLoanVsHeloc";
import type { PrimeRate } from "../heloc-vs-cash-out/Calculator";

/** "+0.25", "0", "−0.50": the sign always shown on a move. */
const signed = (v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`);

type Plan = "interest-only" | "paydown";
type Draw = "once" | "spread";

export default function Calculator({ prime, fredNotice }: { prime: PrimeRate; fredNotice: string }) {
  const [amount, setAmount] = useState<Num>("");
  const [draw, setDraw] = useState<Draw>("once");
  const [spreadMonths, setSpreadMonths] = useState<Num>("");
  const [horizon, setHorizon] = useState<Num>("");
  const [loanRate, setLoanRate] = useState<Num>("");
  const [loanTerm, setLoanTerm] = useState<Num>("");
  const [closing, setClosing] = useState<Num>("");
  const [helocRate, setHelocRate] = useState<Num>("");
  const [drawYears, setDrawYears] = useState<Num>(DEFAULT_DRAW_YEARS);
  const [repayYears, setRepayYears] = useState<Num>(DEFAULT_REPAY_YEARS);
  const [fees, setFees] = useState<Num>("");
  const [plan, setPlan] = useState<Plan>("interest-only");
  const [paydownYears, setPaydownYears] = useState<Num>("");
  const [cap, setCap] = useState<Num>("");
  const [floor, setFloor] = useState<Num>("");
  const [customMove, setCustomMove] = useState<Num>(1.5);

  const loadExample = () => {
    // A $60,000 project paid for over a year: the case where drawing as you go
    // matters. Rates are starting points the reader replaces with real quotes.
    setAmount(60000);
    setDraw("spread");
    setSpreadMonths(12);
    setHorizon(7);
    setLoanRate(8.25);
    setLoanTerm(15);
    setClosing(1500);
    setHelocRate(8);
    setDrawYears(DEFAULT_DRAW_YEARS);
    setRepayYears(DEFAULT_REPAY_YEARS);
    setFees(500);
    setPlan("paydown");
    setPaydownYears(15);
    setCap(18);
    setFloor("");
    setCustomMove(1.5);
  };

  const clearExample = () => {
    setAmount("");
    setDraw("once");
    setSpreadMonths("");
    setHorizon("");
    setLoanRate("");
    setLoanTerm("");
    setClosing("");
    setHelocRate("");
    setDrawYears(DEFAULT_DRAW_YEARS);
    setRepayYears(DEFAULT_REPAY_YEARS);
    setFees("");
    setPlan("interest-only");
    setPaydownYears("");
    setCap("");
    setFloor("");
    setCustomMove(1.5);
  };

  const inputs: Inputs | null = useMemo(() => {
    const ready =
      n(amount) > 0 && n(horizon) > 0 && has(loanRate) && n(loanTerm) > 0 && has(helocRate) &&
      n(drawYears) > 0 && n(repayYears) > 0 &&
      (draw === "once" || (n(spreadMonths) > 0 && n(spreadMonths) <= n(drawYears) * 12)) &&
      (plan === "interest-only" || n(paydownYears) > 0);
    if (!ready) return null;
    return {
      amount: n(amount),
      drawSpreadMonths: draw === "once" ? 0 : n(spreadMonths),
      loanRate: n(loanRate),
      loanTermYears: n(loanTerm),
      loanClosingCosts: n(closing),
      helocRate: n(helocRate),
      drawYears: n(drawYears),
      repayYears: n(repayYears),
      helocFees: n(fees),
      plan: plan === "interest-only" ? { kind: "interest-only" } : { kind: "paydown", years: n(paydownYears) },
      rateCap: has(cap) ? n(cap) : null,
      rateFloor: has(floor) ? n(floor) : null,
      horizonYears: n(horizon),
    };
  }, [amount, draw, spreadMonths, horizon, loanRate, loanTerm, closing, helocRate, drawYears, repayYears, fees, plan, paydownYears, cap, floor]);

  const r = useMemo(() => {
    if (!inputs) return null;
    return {
      now: compare(inputs, 0),
      breakEven: breakEvenMove(inputs),
      table: FED_MOVES.map((m) => compare(inputs, m)),
      custom: compare(inputs, n(customMove)),
    };
  }, [inputs, customMove]);

  const years = n(horizon);
  const label = (c: "heloc" | "loan" | "neither") => (c === "heloc" ? "HELOC" : c === "loan" ? "Fixed loan" : "About even");
  const line = (k: string, v: string, tone = "text-gray-900") => (
    <div key={k} className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-gray-400">{k}</span>
      <span className={`text-sm font-medium ${tone}`}>{v}</span>
    </div>
  );

  // The months the payment comparison shows: the first, the end of year one, the
  // last month of the draw period and the first month after it.
  const drawEnd = inputs ? Math.round(inputs.drawYears * 12) : 0;
  const points = inputs
    ? [
        { m: 1, k: "Month 1" },
        { m: 12, k: "Month 12" },
        { m: drawEnd, k: `End of draw (month ${drawEnd})` },
        { m: drawEnd + 1, k: "After the draw" },
      ]
    : [];

  return (
    <CalcShell
      slug="home-equity-loan-vs-heloc"
      intro="Both borrow against your home. A home equity loan pays out the whole amount at a fixed rate; a HELOC is a variable-rate line you draw as you need it, paying interest only on what you have drawn. Compare the payments, the cost over your horizon, and how far rates would have to rise for the fixed loan to win."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["heloc-vs-cash-out", "heloc-limit", "heloc-debt-payoff", "blended-interest-rate"]}
      disclaimer="For educational purposes only, and not an offer or a commitment to lend. HELOC rates are usually variable and the scenarios here are illustrations, not forecasts. Your rates, fees and terms depend on your lender, your credit and your property."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="What you need" className="h-full">
          <div className="space-y-4">
            <NumField label="Amount" value={amount} onChange={setAmount} min={0} placeholder="60000" prefix="$" />
            <SelectField
              label="How you'd use it"
              value={draw}
              onChange={(v) => setDraw(v as Draw)}
              options={[
                { value: "once", label: "All at once" },
                { value: "spread", label: "Spread evenly over several months" },
              ]}
              hint="A HELOC charges interest only on what you have drawn; a home equity loan pays out, and charges interest on, the whole amount from the start."
            />
            {draw === "spread" && (
              <NumField label="Spread over" value={spreadMonths} onChange={setSpreadMonths} min={1} placeholder="12" suffix="months" hint="The same amount drawn at the start of each month. Must fit inside the draw period." />
            )}
            <NumField label="Years you expect to keep the loan" value={horizon} onChange={setHorizon} min={0} placeholder="7" suffix="yrs" hint="Costs are compared over this horizon: interest and fees, with what is still owed shown beside them." />
          </div>
        </Card>
        <Card title="Home equity loan" badge="FIXED" badgeTone="blue" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Fixed rate" value={loanRate} onChange={setLoanRate} min={0} placeholder="8.25" suffix="%" step={0.125} />
              <NumField label="Term" value={loanTerm} onChange={setLoanTerm} min={0} placeholder="15" suffix="yrs" />
            </div>
            <NumField label="Closing costs" value={closing} onChange={setClosing} min={0} placeholder="1500" prefix="$" hint="Paid once, at closing." />
          </div>
        </Card>
      </div>

      <Card title="HELOC" badge="VARIABLE" badgeTone="amber" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Starting rate" value={helocRate} onChange={setHelocRate} min={0} placeholder="8" suffix="%" step={0.125} />
              <NumField label="Draw period" value={drawYears} onChange={setDrawYears} min={0} placeholder="10" suffix="yrs" />
              <NumField label="Repayment" value={repayYears} onChange={setRepayYears} min={0} placeholder="20" suffix="yrs" />
            </div>
            <NumField label="Fees" value={fees} onChange={setFees} min={0} placeholder="500" prefix="$" hint="Up-front costs: application, appraisal, closing. Paid once." />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Lifetime cap (optional)" value={cap} onChange={setCap} min={0} placeholder="18" suffix="%" step={0.25} />
              <NumField label="Floor (optional)" value={floor} onChange={setFloor} min={0} placeholder="—" suffix="%" step={0.25} />
            </div>
          </div>
          <div className="space-y-4">
            <SelectField
              label="How you'd pay it during the draw"
              value={plan}
              onChange={(v) => setPlan(v as Plan)}
              options={[
                { value: "interest-only", label: "Interest only" },
                { value: "paydown", label: "Pay it down over a set number of years" },
              ]}
            />
            {plan === "paydown" && (
              <NumField label="Pay it down over" value={paydownYears} onChange={setPaydownYears} min={0} placeholder="15" suffix="yrs" hint="A level payment on what you owe, recalculated as you draw. Set it to the loan's term to compare like with like." />
            )}
            {prime && (
              <p className="text-xs text-gray-500 leading-relaxed">
                Bank prime rate: <strong>{prime.text}%</strong> as of {prime.dateLabel} (Federal Reserve H.15, via FRED).
                HELOCs are usually priced at prime plus a margin the lender sets, so use the rate you are quoted, not
                this. {fredNotice}
              </p>
            )}
          </div>
        </div>
      </Card>

      {r && inputs ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Which costs less over ${years} year${years === 1 ? "" : "s"}?`}
              value={r.now.cheaper === "neither" ? "About the same" : r.now.cheaper === "heloc" ? "The HELOC" : "The fixed loan"}
              tone={r.now.cheaper === "neither" ? "gray" : "green"}
            />
            <Takeaway tone="blue">
              {r.now.cheaper === "neither" ? (
                <>Over {years} years the two cost about the same, if the HELOC rate stays at {pct(r.now.rate.rate, 2)}. </>
              ) : (
                <>
                  Over {years} years the {r.now.cheaper === "heloc" ? "HELOC" : "fixed loan"} costs{" "}
                  <strong>{fmtK(Math.abs(r.now.difference))}</strong> less in interest and fees, if the HELOC rate stays at{" "}
                  {pct(r.now.rate.rate, 2)}.{" "}
                </>
              )}
              {r.breakEven.reason === "found" && r.breakEven.move !== null ? (
                r.breakEven.move >= 0 ? (
                  <>
                    Rates would have to rise <strong>{r.breakEven.move.toFixed(2)} points</strong>, and stay there, for the
                    fixed loan to cost less.
                  </>
                ) : (
                  <>
                    The fixed loan costs less unless rates fall <strong>{Math.abs(r.breakEven.move).toFixed(2)} points</strong>{" "}
                    and stay there.
                  </>
                )
              ) : r.breakEven.reason === "heloc-always" ? (
                <>With your cap, the HELOC costs less however far rates rise.</>
              ) : (
                <>The fixed loan costs less however far rates fall, on these numbers.</>
              )}
            </Takeaway>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              {
                key: "loan",
                title: "Home equity loan",
                tag: `${pct(inputs.loanRate, 2)} fixed, ${inputs.loanTermYears} yrs`,
                good: r.now.cheaper === "loan",
                rows: [
                  ...points.map((p) => line(p.k, `${fmt(r.now.loan.paymentInMonth(p.m))}/mo`)),
                  line(`Interest over ${years} yrs`, fmtK(r.now.loan.interest)),
                  line("Closing costs", fmt(r.now.loan.fees)),
                  line(`Cost over ${years} yrs`, fmtK(r.now.loan.cost)),
                  line(`Still owed after ${years} yrs`, fmtK(r.now.loan.balance)),
                ],
              },
              {
                key: "heloc",
                title: "HELOC",
                tag: `${pct(r.now.rate.rate, 2)} variable`,
                good: r.now.cheaper === "heloc",
                rows: [
                  ...points.map((p) => line(p.k, `${fmt(r.now.heloc.paymentInMonth(p.m))}/mo`, p.m === drawEnd + 1 ? "text-amber-700" : "text-gray-900")),
                  line(`Interest over ${years} yrs`, fmtK(r.now.heloc.interest)),
                  line("Fees", fmt(r.now.heloc.fees)),
                  line(`Cost over ${years} yrs`, fmtK(r.now.heloc.cost)),
                  line(`Still owed after ${years} yrs`, fmtK(r.now.heloc.balance)),
                ],
              },
            ].map((p) => (
              <div key={p.key} className={`border rounded-2xl p-5 ${p.good ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
                <div className="flex items-baseline justify-between gap-2 mb-4">
                  <h3 className="text-sm font-medium text-gray-900">{p.title}</h3>
                  <span className="text-xs text-gray-400 flex-shrink-0">{p.tag}</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-2">{p.rows}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Cost is interest plus fees over the horizon. Principal repaid is not a cost, so a loan that has paid down less
            shows it in &ldquo;still owed&rdquo;.
            {inputs.drawSpreadMonths > 0 &&
              ` The HELOC is drawn over ${inputs.drawSpreadMonths} months; the home equity loan pays out the whole amount at closing, and any interest the unused cash could earn meanwhile is not counted.`}
          </p>

          <ChartCard title={`Interest and fees over ${years} years`}>
            <BarChart
              ariaLabel="Interest and fees over the horizon for each option"
              height={200}
              bars={[
                { label: "Fixed loan", segments: [{ label: "Interest", value: r.now.loan.interest, color: COLORS.blue }, { label: "Fees", value: r.now.loan.fees, color: COLORS.red }] },
                { label: "HELOC", segments: [{ label: "Interest", value: r.now.heloc.interest, color: COLORS.amber }, { label: "Fees", value: r.now.heloc.fees, color: COLORS.red }] },
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">If the Fed moves</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              A HELOC is usually priced at prime plus a margin, and banks conventionally move prime with the Federal
              Reserve&apos;s federal funds target, so each row moves your HELOC rate by the same amount from day one and
              holds it for the {years} years. The fixed loan&apos;s rate does not move.
              {(inputs.rateCap !== null || inputs.rateFloor !== null) && " Rates beyond your cap or floor are held at the limit, marked below."}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-gray-400 text-left">
                    <th className="py-2 pr-3 font-normal">Fed move</th>
                    <th className="py-2 pr-3 font-normal">HELOC rate</th>
                    <th className="py-2 pr-3 font-normal">Payment, month 1</th>
                    <th className="py-2 pr-3 font-normal">Payment, after draw</th>
                    <th className="py-2 pr-3 font-normal">Cost, {years} yrs</th>
                    <th className="py-2 font-normal">Against the fixed loan</th>
                  </tr>
                </thead>
                <tbody>
                  {[...r.table, ...(FED_MOVES.some((m) => m === n(customMove)) ? [] : [r.custom])]
                    .sort((a, b) => a.move - b.move)
                    .map((row) => (
                      <tr key={row.move} className={`border-t border-gray-100 ${row.move === n(customMove) && !FED_MOVES.some((m) => m === n(customMove)) ? "bg-amber-50" : ""}`}>
                        <td className="py-2 pr-3">{signed(row.move)} pts</td>
                        <td className="py-2 pr-3">
                          {pct(row.rate.rate, 2)}
                          {row.rate.clamped === "cap" && <span className="text-xs text-amber-700"> at cap</span>}
                          {row.rate.clamped === "floor" && <span className="text-xs text-amber-700"> at floor</span>}
                          {row.rate.clamped === "zero" && <span className="text-xs text-amber-700"> at 0%</span>}
                        </td>
                        <td className="py-2 pr-3">{fmt(row.heloc.paymentInMonth(1))}</td>
                        <td className="py-2 pr-3">{fmt(row.heloc.paymentInMonth(drawEnd + 1))}</td>
                        <td className="py-2 pr-3">{fmtK(row.heloc.cost)}</td>
                        <td className={`py-2 ${row.cheaper === "heloc" ? "text-green-700" : row.cheaper === "loan" ? "text-red-700" : "text-gray-600"}`}>
                          {row.cheaper === "neither" ? "About even" : `${label(row.cheaper)} by ${fmtK(Math.abs(row.difference))}`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              The fixed loan is {fmt(r.now.loan.payment)}/mo and {fmtK(r.now.loan.cost)} over {years} years in every row.
            </p>
            <div className="mt-4">
              <RangeField
                label="Any other move"
                value={customMove}
                onChange={setCustomMove}
                min={FED_MOVE_MIN}
                max={FED_MOVE_MAX}
                step={FED_MOVE_STEP}
                suffix=" pts"
                hint={
                  <>
                    {signed(n(customMove))} points puts the HELOC at {pct(r.custom.rate.rate, 2)}
                    {r.custom.rate.clamped === "cap" && ` (held at your ${pct(inputs.rateCap ?? 0, 2)} cap; ${pct(r.custom.rate.raw, 2)} without it)`}
                    {r.custom.rate.clamped === "floor" && ` (held at your ${pct(inputs.rateFloor ?? 0, 2)} floor; ${pct(r.custom.rate.raw, 2)} without it)`}
                    {r.custom.rate.clamped === "zero" && " (a rate cannot go below zero)"}:{" "}
                    {r.custom.cheaper === "neither"
                      ? "about even with the fixed loan."
                      : `the ${r.custom.cheaper === "heloc" ? "HELOC" : "fixed loan"} costs ${fmtK(Math.abs(r.custom.difference))} less over ${years} years.`}
                  </>
                }
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Before you choose</h2>
            <div className="space-y-2">
              <Takeaway tone="amber">
                A HELOC&apos;s rate can move for its whole life, within any cap in your agreement, and a lender can freeze or
                cut a line in some circumstances, such as a significant fall in the home&apos;s value.
              </Takeaway>
              <Takeaway tone="blue">
                Ask about prepayment: a home equity loan may carry a penalty for paying it off early, within federal
                limits, and some HELOCs charge an early-termination fee.
              </Takeaway>
              <Takeaway tone="blue">
                Interest on either is deductible only if you itemize, and only on money used to buy, build or
                substantially improve the home that secures the loan (IRS Publication 936).
              </Takeaway>
              <Takeaway tone="green">
                Not sure how much you could borrow? Try the{" "}
                <Link href="/calculators/heloc-limit" className="underline">HELOC limit calculator</Link>. Weighing a
                refinance instead? See the{" "}
                <Link href="/calculators/heloc-vs-cash-out" className="underline">HELOC or cash-out refinance calculator</Link>.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add the amount, how you&apos;d draw it and how long you&apos;d keep it, then the fixed loan&apos;s rate and term and
            the HELOC&apos;s starting rate.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
