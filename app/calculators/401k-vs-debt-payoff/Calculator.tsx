"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { TAX_YEAR, federalTax, standardDeduction, type FilingStatus } from "../../lib/tax";

/** Same guard as debt-payoff, debt-consolidation and heloc-debt-payoff. */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;

export default function Calculator() {
  const [extra, setExtra] = useState<Num>("");
  const [debt, setDebt] = useState<Num>("");
  const [debtRate, setDebtRate] = useState<Num>("");
  const [debtPayment, setDebtPayment] = useState<Num>("");
  const [salary, setSalary] = useState<Num>("");
  const [status, setStatus] = useState<FilingStatus>("single");
  const [matchPct, setMatchPct] = useState<Num>("");
  const [matchCap, setMatchCap] = useState<Num>("");
  const [contribPct, setContribPct] = useState<Num>("");
  const [ret, setRet] = useState<Num>("");
  const [years, setYears] = useState<Num>("");

  const loadExample = () => {
    setExtra(600);
    setDebt(18000);
    setDebtRate(21.9);
    setDebtPayment(450);
    setSalary(85000);
    setStatus("single");
    setMatchPct(50);
    setMatchCap(6);
    setContribPct(2);
    setRet(7);
    setYears(10);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setExtra("");
    setDebt("");
    setDebtRate("");
    setDebtPayment("");
    setSalary("");
    setStatus("single");
    setMatchPct("");
    setMatchCap("");
    setContribPct("");
    setRet("");
    setYears("");
  };

  const r = useMemo(() => {
    const E = n(extra);
    const yrs = Math.max(1, n(years));
    if (E <= 0 || n(years) <= 0 || n(debt) < 0) return null;

    const capDollars = (n(salary) * Math.min(n(matchCap), 100)) / 100;
    const contribDollars = (n(salary) * Math.min(n(contribPct), 100)) / 100;
    const unmatchedRoom = Math.max(0, capDollars - contribDollars);
    const monthlyRoom = unmatchedRoom / 12;

    /* A traditional contribution comes out before income tax, so it costs less
     * take-home than it puts in the account. The model used to charge the full
     * contribution against spare cash, which left the match path short of debt
     * money it would really have had.
     *
     * Differenced across the brackets rather than read off a single rate, so a
     * contribution that straddles a band is priced correctly. FICA is not
     * included: traditional 401(k) contributions are still subject to it, so
     * the saving is income tax only. */
    const deduction = standardDeduction(status);
    const baseTaxable = Math.max(0, n(salary) - deduction - contribDollars);
    const roomAnnual = monthlyRoom * 12;
    const taxSavingAnnual = roomAnnual > 0
      ? federalTax(baseTaxable, status) - federalTax(Math.max(0, baseTaxable - roomAnnual), status)
      : 0;
    const savingRate = roomAnnual > 0 ? taxSavingAnnual / roomAnnual : 0;

    // Spare cash limits the take-home cost, not the gross contribution.
    const toMatch = Math.min(monthlyRoom, savingRate < 1 ? E / (1 - savingRate) : E);
    const takeHomeCost = toMatch * (1 - savingRate);
    const matchEarned = toMatch * (n(matchPct) / 100);
    const leftover = Math.max(0, E - takeHomeCost);

    /**
     * One simulation, run twice.
     *
     * `matchWhileInDebt` is the only difference between the paths. Both pick
     * the match up once the debt is gone — the old model never gave the
     * all-to-debt path any employer money at all, for the whole horizon, which
     * made the comparison "take the match" against "never take the match" and
     * overstated the gap roughly fivefold on the shipped example.
     */
    const run = (matchWhileInDebt: boolean) => {
      const mr = n(debtRate) / 100 / 12;
      const gr = n(ret) / 100 / 12;
      const H = Math.round(yrs * 12);
      let bal = n(debt);
      let inv = 0;
      let cleared = Infinity;
      let stalls = false;
      const series: number[] = [];

      for (let m = 0; m <= H; m++) {
        series.push(inv - Math.max(0, bal));
        if (m === H) break;

        const inDebt = bal > 0.005;
        const capturing = inDebt ? matchWhileInDebt : true;
        const cost = capturing ? takeHomeCost : 0;
        const contrib = capturing ? toMatch : 0;
        const employer = capturing ? matchEarned : 0;

        if (inDebt) {
          const interest = bal * mr;
          const pay = n(debtPayment) + (E - cost);
          if (pay <= interest * INTEREST_ONLY_EPSILON && mr > 0) {
            stalls = true;
            series.push(inv - bal);
            return { series, end: series[series.length - 1], inv, bal, cleared: Infinity, stalls };
          }
          bal = Math.max(0, bal + interest - pay);
          if (bal <= 0.005 && cleared === Infinity) cleared = m + 1;
          inv = inv * (1 + gr) + contrib + employer;
        } else {
          // Debt gone: the payment and the spare cash are both free, and the
          // contribution's tax saving comes back too.
          inv = inv * (1 + gr) + (n(debtPayment) + E) + (contrib - cost) + employer;
        }
      }
      return { series, end: series[series.length - 1], inv, bal: Math.max(0, bal), cleared, stalls };
    };

    const A = run(false);
    const B = run(true);
    /* Two different failures. If the all-to-debt path cannot service the debt,
     * nothing on the page means anything. If only the match path cannot, that
     * is the answer to the question: contributing enough to catch the match
     * leaves too little to keep up with the interest. */
    const stalls = A.stalls;
    const matchPathStalls = !A.stalls && B.stalls;

    // Match forgone by never raising the contribution at all, over the horizon.
    const matchIfNeverRaised = matchEarned * 12 * yrs;
    const bWins = !B.stalls && B.end > A.end;

    return {
      capDollars, contribDollars, unmatchedRoom, monthlyRoom,
      toMatch, takeHomeCost, matchEarned, leftover,
      savingRatePct: savingRate * 100, taxSavingMonthly: toMatch - takeHomeCost, deduction, baseTaxable,
      A, B, stalls, matchPathStalls,
      netA: A.end, netB: B.end, endA: A.inv, endB: B.inv,
      debtLeftA: A.bal, debtLeftB: B.bal,
      clearedA: A.cleared, clearedB: B.cleared,
      matchIfNeverRaised, bWins,
      gap: Math.abs(B.end - A.end),
      alreadyMaxed: unmatchedRoom <= 0,
      horizonYears: yrs,
    };
  }, [extra, debt, debtRate, debtPayment, salary, status, matchPct, matchCap, contribPct, ret, years]);

  return (
    <CalcShell
      slug="401k-vs-debt-payoff"
      intro="An employer match is money you only get by contributing. Past that point, paying down debt is a guaranteed return and investing is not. This works out where your spare money does the most good — and both paths take the match once the debt is gone, so the comparison is about timing, not about giving it up."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["pay-off-debt", "debt-payoff", "retirement-savings", "early-withdrawal"]}
      disclaimer={`For educational purposes only. Investment returns are not guaranteed and are shown before tax, while debt payoff is certain. Uses ${TAX_YEAR} federal brackets and the standard deduction to value the contribution's tax saving; state income tax is not modelled.`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your debt" badge="DEBT" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Balance" value={debt} onChange={setDebt} min={0} placeholder="18000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate" value={debtRate} onChange={setDebtRate} min={0} placeholder="21.9" suffix="%" step={0.1} />
              <NumField label="Paying now" value={debtPayment} onChange={setDebtPayment} min={0} placeholder="450" prefix="$" />
            </div>
            <NumField
              label="Spare money each month"
              value={extra}
              onChange={setExtra}
              min={0}
              placeholder="600"
              prefix="$"
              hint="Take-home pay you are deciding what to do with."
            />
          </div>
        </Card>

        <Card title="Your 401k" badge="MATCH" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Salary" value={salary} onChange={setSalary} min={0} placeholder="85000" prefix="$" />
              <NumField label="Time horizon" value={years} onChange={setYears} min={1} placeholder="10" suffix="yrs" />
            </div>
            <SelectField
              label="Filing status"
              value={status}
              onChange={(v) => setStatus(v as FilingStatus)}
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married filing jointly" },
                { value: "head", label: "Head of household" },
              ]}
              hint="Used only to price the tax saving on a pre-tax contribution."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Employer matches" value={matchPct} onChange={setMatchPct} min={0} placeholder="50" suffix="%" hint="of what you put in" />
              <NumField label="Up to" value={matchCap} onChange={setMatchCap} min={0} placeholder="6" suffix="%" hint="of your salary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="You contribute" value={contribPct} onChange={setContribPct} min={0} placeholder="2" suffix="%" />
              <NumField label="Expected return" value={ret} onChange={setRet} placeholder="7" suffix="%" step={0.5} />
            </div>
          </div>
        </Card>
      </div>

      {r && r.stalls ? (
        <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-red-800 mb-1">This payment never clears the debt</p>
          <p className="text-xs text-red-800 leading-relaxed">
            {fmt(n(debtPayment) + n(extra))} a month does not cover the interest on {fmt(n(debt))} at{" "}
            {n(debtRate)}%, so the balance grows however you split the money. Raise the payment or lower
            the rate before comparing the two paths.
          </p>
        </div>
      ) : r ? (
        <>
          {!r.alreadyMaxed && (
            <div className="border border-green-200 rounded-2xl p-5 mb-4 bg-green-50">
              <Headline
                label={`Employer money forgone over ${r.horizonYears} years if you never raise your contribution`}
                value={fmtK(r.matchIfNeverRaised)}
                tone="green"
              />
              <Takeaway tone="green">
                You contribute <strong>{fmt(r.contribDollars)}</strong> a year, and your employer matches
                contributions up to <strong>{fmt(r.capDollars)}</strong> — {n(matchCap)}% of salary.
                Putting in another <strong>{fmt(r.toMatch)}/mo</strong> earns{" "}
                <strong>{fmt(r.matchEarned)}/mo</strong> from your employer, and because the contribution
                is pre-tax it only costs <strong>{fmt(r.takeHomeCost)}</strong> of take-home pay at your{" "}
                {pct(r.savingRatePct, 0)} marginal rate.
              </Takeaway>
              <p className="text-xs text-green-800 leading-relaxed mt-3">
                The match is a one-off <strong>{n(matchPct)}%</strong> on each dollar you put in, not an
                annual return, so it is not directly comparable with a {n(debtRate)}% debt rate. Over the{" "}
                {Number.isFinite(r.clearedB) ? fmtMonths(r.clearedB) : "time"} it takes to clear this debt,
                it still comes out ahead — the figures below work it through.
              </p>
            </div>
          )}

          {r.matchPathStalls && (
            <div className="border-2 border-amber-300 bg-amber-50 rounded-2xl p-5 mb-4">
              <p className="text-sm font-medium text-amber-900 mb-1">
                Catching the match leaves too little for the debt
              </p>
              <p className="text-xs text-amber-900 leading-relaxed">
                Contributing {fmt(r.toMatch)}/mo costs {fmt(r.takeHomeCost)} of take-home pay, which
                leaves {fmt(n(debtPayment) + r.leftover)} for a balance accruing{" "}
                {fmt((n(debt) * n(debtRate)) / 100 / 12)} of interest a month. On these numbers the debt
                never clears on that path. Clear the debt first, or contribute a smaller share of the
                match — some of it is still worth catching.
              </p>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">All to debt, then the match</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.netA)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  debt gone in {Number.isFinite(r.clearedA) ? fmtMonths(r.clearedA) : "never"}
                </p>
              </div>
              <div className={`p-4 text-center ${r.matchPathStalls ? "bg-amber-600" : r.bWins ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">
                  {r.matchPathStalls ? "Only one path works" : r.bWins ? "Match first wins by" : "All to debt wins by"}
                </p>
                <p className="text-2xl font-medium text-white">{r.matchPathStalls ? "—" : fmtK(r.gap)}</p>
                <p className="text-xs text-white/70">after {r.horizonYears} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Match first, rest to debt</p>
                <p className="text-lg font-medium text-gray-900">{r.matchPathStalls ? "—" : fmtK(r.netB)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  debt gone in {Number.isFinite(r.clearedB) ? fmtMonths(r.clearedB) : "never"}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Net worth built over ${r.horizonYears} years, before tax`}
              value={fmtK(r.matchPathStalls ? r.netA : Math.max(r.netA, r.netB))}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Invested — all to debt" value={fmtK(r.endA)} sub="before tax" />
              <Stat
                label="Invested — match first"
                value={r.matchPathStalls ? "—" : fmtK(r.endB)}
                sub={r.matchPathStalls ? "debt never clears" : "before tax"}
                tone={r.matchPathStalls ? "amber" : "green"}
              />
              <Stat
                label="Your contribution costs"
                value={`${fmt(r.takeHomeCost)}/mo`}
                sub={`${fmt(r.toMatch)} in, ${fmt(r.taxSavingMonthly)} back in tax`}
                tone="green"
              />
              <Stat
                label="Debt still owed"
                value={r.debtLeftB > 0 ? fmtK(r.debtLeftB) : "Cleared"}
                tone={r.debtLeftB > 0 ? "amber" : "green"}
              />
            </div>
            <Takeaway tone={r.matchPathStalls ? "amber" : r.bWins ? "green" : "amber"}>
              {r.matchPathStalls ? (
                <>
                  Only the all-to-debt path finishes here. Catching the whole match costs more take-home
                  pay than this balance can spare, so that path never gets on top of the interest. Clear
                  the debt at <strong>{fmt(n(debtPayment) + n(extra))}/mo</strong> and pick the match up
                  from <strong>{Number.isFinite(r.clearedA) ? fmtMonths(r.clearedA) : "payoff"}</strong>,
                  or contribute a smaller share of it in the meantime.
                </>
              ) : r.alreadyMaxed ? (
                <>
                  You are already capturing the full match, so there is no free money left to grab. From
                  here it is a straight race: <strong>{n(debtRate)}%</strong> guaranteed by paying the debt
                  against <strong>{n(ret)}%</strong> hoped for in the market. With a debt rate that high,
                  clearing it first is usually the better risk-adjusted move.
                </>
              ) : r.bWins ? (
                <>
                  Taking the match first and sending the rest to the debt ends up{" "}
                  <strong>{fmtK(r.gap)}</strong> ahead. Both paths capture the match eventually — the
                  all-to-debt path picks it up at{" "}
                  {Number.isFinite(r.clearedA) ? fmtMonths(r.clearedA) : "payoff"} — so this gap is the
                  cost of the {Number.isFinite(r.clearedA) && Number.isFinite(r.clearedB)
                    ? fmtMonths(Math.max(0, r.clearedA))
                    : "months"}{" "}
                  of match missed along the way, less the extra interest the slower payoff costs.
                </>
              ) : (
                <>
                  At <strong>{n(debtRate)}%</strong>, this debt is expensive enough that clearing it fast
                  wins by <strong>{fmtK(r.gap)}</strong>. The match is still worth taking — the
                  all-to-debt path here takes it from{" "}
                  {Number.isFinite(r.clearedA) ? fmtMonths(r.clearedA) : "payoff"} onward — it is the
                  order that goes the other way on these numbers.
                </>
              )}
            </Takeaway>
            <p className="text-xs text-gray-400 leading-relaxed mt-3">
              Both net worth figures are mostly 401(k) balance, which is money before tax — you will owe
              income tax on a traditional account when you draw it in retirement, so it is not the same as
              cash in hand. What that costs depends on your bracket then, which is not modelled here.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed mt-2">
              Employer matches usually vest over several years, and leaving before you are fully vested
              forfeits some or all of the employer money. Check your plan&apos;s vesting schedule before
              counting on it — this page assumes you stay long enough to keep it.
            </p>
          </div>

          <ChartCard
            title="Net position over time"
            footnote="Investments built, less any debt still outstanding. Both paths take the match once their debt clears."
          >
            <LineChart
              ariaLabel="Net position over time, all to debt compared with capturing the match first"
              periodsPerYear={12}
              series={[
                { label: "All to debt, then the match", color: COLORS.amber, data: r.A.series },
                { label: "Match first, rest to debt", color: COLORS.green, data: r.B.series, dash: [6, 3] },
              ]}
            />
          </ChartCard>

          <ChartCard title="Where the money ends up" footnote="Investment balance at the end of the horizon, before tax.">
            <BarChart
              ariaLabel="Investment balance after the horizon under each strategy"
              height={200}
              bars={[
                { label: "All to debt", segments: [{ label: "Invested", value: r.endA, color: COLORS.gray }] },
                { label: "Match first", segments: [{ label: "Invested", value: r.endB, color: COLORS.green }] },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your spare monthly amount, the debt, and a time horizon to compare.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
