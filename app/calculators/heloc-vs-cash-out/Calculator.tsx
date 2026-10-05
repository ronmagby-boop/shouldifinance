"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, RangeField, Headline, Takeaway, EmptyState,
  fmt, fmtK, pct, has, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import {
  FED_MOVES, FED_MOVE_MAX, FED_MOVE_MIN, FED_MOVE_STEP,
  VA_CASH_OUT_FUNDING_FEE,
  borrowingLimits, breakEvenHelocRate, compare, helocCltv, type Inputs,
} from "../../lib/helocCashOut";

/** "+0.25", "0", "−0.50": the sign always shown on a move. */
const signed = (v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`);

type Plan = "interest-only" | "paydown";

/** The bank prime rate, read on the server at build time (lib/rates.ts PRIME), or null when missing or stale. */
export type PrimeRate = { text: string; dateLabel: string } | null;

export default function Calculator({ prime, fredNotice }: { prime: PrimeRate; fredNotice: string }) {
  const [balance, setBalance] = useState<Num>("");
  const [mortgageRate, setMortgageRate] = useState<Num>("");
  const [yearsLeft, setYearsLeft] = useState<Num>("");
  const [homeValue, setHomeValue] = useState<Num>("");
  const [cash, setCash] = useState<Num>("");
  const [horizon, setHorizon] = useState<Num>("");
  const [cashOutRate, setCashOutRate] = useState<Num>("");
  const [cashOutTerm, setCashOutTerm] = useState<Num>(30);
  const [closing, setClosing] = useState<Num>("");
  const [financeClosing, setFinanceClosing] = useState(false);
  const [helocRate, setHelocRate] = useState<Num>("");
  const [drawYears, setDrawYears] = useState<Num>(10);
  const [repayYears, setRepayYears] = useState<Num>(20);
  const [helocFees, setHelocFees] = useState<Num>("");
  const [plan, setPlan] = useState<Plan>("interest-only");
  const [paydownYears, setPaydownYears] = useState<Num>("");
  const [cap, setCap] = useState<Num>("");
  const [floor, setFloor] = useState<Num>("");
  const [customMove, setCustomMove] = useState<Num>(1.5);

  const loadExample = () => {
    // A low pandemic-era rate worth keeping, and $60,000 of cash: the case the
    // deciding question is about. The HELOC rate is a starting rate the reader
    // replaces with a real quote; the cap is a typical lifetime cap.
    setBalance(280000);
    setMortgageRate(3.25);
    setYearsLeft(24);
    setHomeValue(600000);
    setCash(60000);
    setHorizon(7);
    setCashOutRate(6.5);
    setCashOutTerm(30);
    setClosing(7500);
    setFinanceClosing(false);
    setHelocRate(8.25);
    setDrawYears(10);
    setRepayYears(20);
    setHelocFees(500);
    setPlan("interest-only");
    setPaydownYears("");
    setCap(18);
    setFloor("");
    setCustomMove(1.5);
  };

  /** Back to the page's initial state, defaults included. */
  const clearExample = () => {
    setBalance("");
    setMortgageRate("");
    setYearsLeft("");
    setHomeValue("");
    setCash("");
    setHorizon("");
    setCashOutRate("");
    setCashOutTerm(30);
    setClosing("");
    setFinanceClosing(false);
    setHelocRate("");
    setDrawYears(10);
    setRepayYears(20);
    setHelocFees("");
    setPlan("interest-only");
    setPaydownYears("");
    setCap("");
    setFloor("");
    setCustomMove(1.5);
  };

  const inputs: Inputs | null = useMemo(() => {
    const ready =
      n(homeValue) > 0 && n(cash) > 0 && n(horizon) > 0 &&
      has(cashOutRate) && n(cashOutTerm) > 0 &&
      has(helocRate) && n(drawYears) >= 0 && n(repayYears) > 0 &&
      (n(balance) === 0 || (has(mortgageRate) && n(yearsLeft) > 0)) &&
      (plan === "interest-only" || n(paydownYears) > 0);
    if (!ready) return null;
    return {
      mortgageBalance: n(balance),
      mortgageRate: n(mortgageRate),
      mortgageYearsLeft: n(yearsLeft),
      homeValue: n(homeValue),
      cashNeeded: n(cash),
      cashOutRate: n(cashOutRate),
      cashOutTermYears: n(cashOutTerm),
      closingCosts: n(closing),
      financeClosingCosts: financeClosing,
      helocRate: n(helocRate),
      drawYears: n(drawYears),
      repayYears: n(repayYears),
      helocFees: n(helocFees),
      plan: plan === "interest-only" ? { kind: "interest-only" } : { kind: "paydown", years: n(paydownYears) },
      rateCap: has(cap) ? n(cap) : null,
      rateFloor: has(floor) ? n(floor) : null,
      horizonYears: n(horizon),
    };
  }, [balance, mortgageRate, yearsLeft, homeValue, cash, horizon, cashOutRate, cashOutTerm, closing,
    financeClosing, helocRate, drawYears, repayYears, helocFees, plan, paydownYears, cap, floor]);

  const r = useMemo(() => {
    if (!inputs) return null;
    const now = compare(inputs, 0);
    return {
      now,
      breakEven: breakEvenHelocRate(inputs),
      table: FED_MOVES.map((m) => compare(inputs, m)),
      custom: compare(inputs, n(customMove)),
      limits: borrowingLimits(inputs),
      cltv: helocCltv(inputs),
    };
  }, [inputs, customMove]);

  const years = n(horizon);
  const drawLabel = `after the ${n(drawYears)}-year draw`;
  const cheaperLabel = (c: "heloc" | "cash-out" | "neither") =>
    c === "heloc" ? "HELOC" : c === "cash-out" ? "Cash-out" : "About even";

  const line = (k: string, v: string, tone = "text-gray-900") => (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-gray-400">{k}</span>
      <span className={`text-sm font-medium ${tone}`}>{v}</span>
    </div>
  );

  return (
    <CalcShell
      slug="heloc-vs-cash-out"
      intro="Both raise cash from your home. A cash-out refinance replaces your whole mortgage with one new fixed-rate loan; a HELOC keeps your mortgage and adds a variable-rate line beside it. The deciding question is what happens to the rate you already have."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["heloc-debt-payoff", "refinance-to-pay-off-debt", "should-i-refinance", "blended-interest-rate"]}
      disclaimer="For educational purposes only, and not an offer or a commitment to lend. HELOC rates are usually variable and the scenarios here are illustrations, not forecasts. Your rates, fees and limits depend on your lender, your credit and your property."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your mortgage today" badge="KEEP OR REPLACE" className="h-full">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <NumField label="Balance" value={balance} onChange={setBalance} min={0} placeholder="280000" prefix="$" />
            </div>
            <NumField label="Rate" value={mortgageRate} onChange={setMortgageRate} min={0} placeholder="3.25" suffix="%" step={0.125} />
            <NumField label="Years left" value={yearsLeft} onChange={setYearsLeft} min={0} placeholder="24" suffix="yrs" />
            <div className="col-span-2">
              <NumField label="Home value" value={homeValue} onChange={setHomeValue} min={0} placeholder="600000" prefix="$" />
            </div>
          </div>
        </Card>
        <Card title="The cash" badge="SAME FROM EITHER" className="h-full">
          <div className="space-y-4">
            <NumField label="Cash needed" value={cash} onChange={setCash} min={0} placeholder="60000" prefix="$" />
            <NumField
              label="Years you expect to keep the loans"
              value={horizon}
              onChange={setHorizon}
              min={0}
              placeholder="7"
              suffix="yrs"
              hint="Costs are compared over this horizon: interest and fees, with what is still owed shown beside them."
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Cash-out refinance" badge="FIXED" badgeTone="blue" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="New rate" value={cashOutRate} onChange={setCashOutRate} min={0} placeholder="6.5" suffix="%" step={0.125} />
              <NumField label="Term" value={cashOutTerm} onChange={setCashOutTerm} min={0} placeholder="30" suffix="yrs" />
            </div>
            <NumField label="Closing costs" value={closing} onChange={setClosing} min={0} placeholder="7500" prefix="$" />
            <Toggle checked={financeClosing} onChange={setFinanceClosing} label="Finance closing costs">
              Roll the closing costs into the new loan
            </Toggle>
          </div>
        </Card>
        <Card title="HELOC" badge="VARIABLE" badgeTone="amber" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <NumField label="Starting rate" value={helocRate} onChange={setHelocRate} min={0} placeholder="8.25" suffix="%" step={0.125} />
              </div>
              <NumField label="Draw period" value={drawYears} onChange={setDrawYears} min={0} placeholder="10" suffix="yrs" />
              <NumField label="Repayment" value={repayYears} onChange={setRepayYears} min={0} placeholder="20" suffix="yrs" />
            </div>
            <NumField label="Fees" value={helocFees} onChange={setHelocFees} min={0} placeholder="500" prefix="$" hint="Up-front costs: application, appraisal, closing. Paid once." />
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
              <NumField
                label="Pay it down over"
                value={paydownYears}
                onChange={setPaydownYears}
                min={0}
                placeholder="10"
                suffix="yrs"
                hint="A level payment from month one. Anything left when the draw ends is spread over the repayment period."
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Lifetime cap (optional)" value={cap} onChange={setCap} min={0} placeholder="18" suffix="%" step={0.25} />
              <NumField label="Floor (optional)" value={floor} onChange={setFloor} min={0} placeholder="—" suffix="%" step={0.25} />
            </div>
            {prime && (
              <p className="text-xs text-gray-500 leading-relaxed">
                Bank prime rate: <strong>{prime.text}%</strong> as of {prime.dateLabel} (Federal Reserve H.15, via
                FRED). HELOCs are usually priced at prime plus a margin the lender sets, so use the rate you are
                quoted, not this. {fredNotice}
              </p>
            )}
          </div>
        </Card>
      </div>

      {r && inputs ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Which costs less over ${years} year${years === 1 ? "" : "s"}?`}
              value={r.now.cheaper === "neither" ? "About the same" : r.now.cheaper === "heloc" ? "The HELOC" : "The cash-out refinance"}
              tone={r.now.cheaper === "neither" ? "gray" : "green"}
            />
            <Takeaway tone="blue">
              {inputs.mortgageBalance > 0 ? (
                <>
                  Keeping your {pct(inputs.mortgageRate, 2)} mortgage and adding the HELOC blends to{" "}
                  <strong>{pct(r.now.blended, 2)}</strong> on everything you owe; the cash-out refinance puts all of it at{" "}
                  <strong>{pct(inputs.cashOutRate, 2)}</strong>.{" "}
                </>
              ) : (
                <>With nothing owed today, both are simply a new loan for the cash. </>
              )}
              {r.now.cheaper === "neither" ? (
                <>Over {years} years the two cost about the same at a {pct(r.now.rate.rate, 2)} HELOC rate.</>
              ) : (
                <>
                  Over {years} years the {r.now.cheaper === "heloc" ? "HELOC" : "cash-out refinance"} costs{" "}
                  <strong>{fmtK(Math.abs(r.now.difference))}</strong> less in interest and fees, if the HELOC rate stays at{" "}
                  {pct(r.now.rate.rate, 2)}.
                </>
              )}{" "}
              {r.breakEven.reason === "found" && r.breakEven.rate !== null ? (
                <>
                  The break-even HELOC rate is <strong>{pct(r.breakEven.rate, 2)}</strong>: held above that for the whole{" "}
                  {years} years, the cash-out refinance is the better deal.
                </>
              ) : r.breakEven.reason === "heloc-always" ? (
                <>The HELOC costs less at any rate up to 40%, on these numbers.</>
              ) : (
                <>The cash-out refinance costs less even against a 0% HELOC, on these numbers.</>
              )}
            </Takeaway>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              {
                key: "heloc",
                title: "Keep the mortgage + HELOC",
                tag: `${pct(r.now.rate.rate, 2)} line, variable`,
                rows: [
                  line("Payment, year 1", `${fmt(r.now.heloc.totalPaymentYear1)}/mo`),
                  line("  of which the HELOC", `${fmt(r.now.heloc.helocPaymentYear1)}/mo`, "text-gray-500"),
                  line(`Payment ${drawLabel}`, `${fmt(r.now.heloc.totalPaymentAfterDraw)}/mo`, "text-amber-700"),
                  line(`Interest over ${years} yrs`, fmtK(r.now.heloc.mortgageInterest + r.now.heloc.helocInterest)),
                  line("Fees", fmt(r.now.heloc.fees)),
                  line(`Cost over ${years} yrs`, fmtK(r.now.heloc.cost)),
                  line(`Still owed after ${years} yrs`, fmtK(r.now.heloc.balance)),
                ],
                good: r.now.cheaper === "heloc",
              },
              {
                key: "cash-out",
                title: "Cash-out refinance",
                tag: `${pct(inputs.cashOutRate, 2)} fixed, ${inputs.cashOutTermYears} yrs`,
                rows: [
                  line("Payment, year 1", `${fmt(r.now.cashOut.payment)}/mo`),
                  line("New loan", fmtK(r.now.cashOut.loanAmount), "text-gray-500"),
                  line(`Payment ${drawLabel}`, `${fmt(inputs.drawYears * 12 < r.now.cashOut.termMonths ? r.now.cashOut.payment : 0)}/mo`),
                  line(`Interest over ${years} yrs`, fmtK(r.now.cashOut.interest)),
                  line(inputs.financeClosingCosts ? "Closing costs (financed)" : "Closing costs (at closing)", fmt(r.now.cashOut.fees)),
                  line(`Cost over ${years} yrs`, fmtK(r.now.cashOut.cost)),
                  line(`Still owed after ${years} yrs`, fmtK(r.now.cashOut.balance)),
                ],
                good: r.now.cheaper === "cash-out",
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
            Cost is interest plus fees over the horizon. Principal repaid is not a cost, so a loan that has paid down
            less shows it in &ldquo;still owed&rdquo; instead: a 30-year refinance usually owes more after a few years than
            the shorter mortgage it replaced.
          </p>

          <ChartCard title={`Interest and fees over ${years} years`} footnote="The HELOC side includes the interest on the mortgage you keep.">
            <BarChart
              ariaLabel="Interest and fees over the horizon for each option"
              height={200}
              bars={[
                {
                  label: "Mortgage + HELOC",
                  segments: [
                    { label: "Mortgage interest", value: r.now.heloc.mortgageInterest, color: COLORS.gray },
                    { label: "HELOC interest", value: r.now.heloc.helocInterest, color: COLORS.amber },
                    { label: "Fees", value: r.now.heloc.fees, color: COLORS.red },
                  ],
                },
                {
                  label: "Cash-out",
                  segments: [
                    { label: "Interest", value: r.now.cashOut.interest, color: COLORS.blue },
                    { label: "Fees", value: r.now.cashOut.fees, color: COLORS.red },
                  ],
                },
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">If the Fed moves</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              A HELOC is usually priced at prime plus a margin, and banks conventionally move prime with the Federal
              Reserve&apos;s federal funds target, so each row moves your HELOC rate by the same amount from day one and
              holds it there for the {years} years. The cash-out rate is fixed at closing and does not move.
              {(inputs.rateCap !== null || inputs.rateFloor !== null) &&
                " Rates beyond your cap or floor are held at the limit, marked below."}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-gray-400 text-left">
                    <th className="py-2 pr-3 font-normal">Fed move</th>
                    <th className="py-2 pr-3 font-normal">HELOC rate</th>
                    <th className="py-2 pr-3 font-normal">Payment, draw</th>
                    <th className="py-2 pr-3 font-normal">Payment, after</th>
                    <th className="py-2 pr-3 font-normal">Cost, {years} yrs</th>
                    <th className="py-2 font-normal">Against cash-out</th>
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
                        <td className="py-2 pr-3">{fmt(row.heloc.totalPaymentYear1)}</td>
                        <td className="py-2 pr-3">{fmt(row.heloc.totalPaymentAfterDraw)}</td>
                        <td className="py-2 pr-3">{fmtK(row.heloc.cost)}</td>
                        <td className={`py-2 ${row.cheaper === "heloc" ? "text-green-700" : row.cheaper === "cash-out" ? "text-red-700" : "text-gray-600"}`}>
                          {row.cheaper === "neither"
                            ? "About even"
                            : `${cheaperLabel(row.cheaper)} by ${fmtK(Math.abs(row.difference))}`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Payments are the mortgage plus the HELOC. The cash-out refinance is {fmt(r.now.cashOut.payment)}/mo and{" "}
              {fmtK(r.now.cashOut.cost)} over {years} years in every row.
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
                      ? "about even with the cash-out."
                      : `the ${r.custom.cheaper === "heloc" ? "HELOC" : "cash-out"} costs ${fmtK(Math.abs(r.custom.difference))} less over ${years} years.`}
                  </>
                }
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">Can you borrow this much?</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              A cash-out refinance of a one-unit main home is capped by loan-to-value: the new loan of{" "}
              {fmtK(r.now.cashOut.loanAmount)} over the {fmtK(inputs.homeValue)} value is{" "}
              <strong>{pct(r.limits[0].ltv, 1)}</strong>. These are the program caps only; each program also has seasoning
              and occupancy rules, and a lender can be stricter.
            </p>
            <div className="space-y-2 mb-3">
              {r.limits.map((l) => (
                <details key={l.program} className="bg-gray-50 rounded-xl px-4 py-3">
                  <summary className="cursor-pointer flex justify-between items-baseline gap-2 list-none">
                    <span className="text-sm text-gray-900">
                      {l.label}: up to {l.maxLtv}%{l.program === "va" ? ` (${pct(l.ltv, 1)} with the fee)` : ""}
                    </span>
                    <span className={`text-sm font-medium ${l.within ? "text-green-700" : "text-red-700"}`}>
                      {l.within ? "Within the limit" : `Over: at most ${fmtK(l.maxCash)} cash`}
                    </span>
                  </summary>
                  <p className="text-xs text-gray-600 leading-relaxed mt-2">
                    {l.program === "va" && (
                      <>
                        Measured on the loan with the {l.vaFeePct}% first-use funding fee in it, {fmtK(l.loan)}; an exempt
                        veteran pays no fee and could take more.{" "}
                      </>
                    )}
                    {l.quote ? <>&ldquo;{l.quote}&rdquo; </> : null}
                    <a href={l.url} className="underline" rel="noopener noreferrer" target="_blank">{l.source}</a>
                  </p>
                </details>
              ))}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              A HELOC has no program cap like these. With the line, you would owe{" "}
              <strong>{pct(r.cltv, 1)}</strong> of the home&apos;s value across the mortgage and the HELOC (combined
              loan-to-value); each lender sets its own maximum, so ask yours. For a VA cash-out refinance, the funding fee
              is {VA_CASH_OUT_FUNDING_FEE.firstUse}% of the loan on first use and {VA_CASH_OUT_FUNDING_FEE.subsequentUse}%
              after, unless you are exempt; add it to the closing costs above to compare costs.
            </p>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Before you choose</h2>
            <div className="space-y-2">
              <Takeaway tone="amber">
                A HELOC&apos;s rate can move for its whole life, within any cap in your agreement. A lender can also freeze
                or cut a line in some circumstances, such as a significant fall in the home&apos;s value, so do not count on
                drawing more later.
              </Takeaway>
              <Takeaway tone="blue">
                Interest on either is deductible only if you itemize, and only on money used to buy, build or substantially
                improve the home that secures the loan (IRS Publication 936). Cash taken out for anything else earns no
                deduction.
              </Takeaway>
              <Takeaway tone="blue">
                Comparing at the same horizon matters: a refinance resets the clock to {inputs.cashOutTermYears} years, which
                lowers the payment partly by stretching the debt out.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add your mortgage, the home&apos;s value, the cash you need and how long you expect to keep the loans, then
            the cash-out rate and the HELOC&apos;s starting rate.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
