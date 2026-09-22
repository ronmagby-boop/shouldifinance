"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize, growthSeries } from "../../lib/finance";

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [yearsLeft, setYearsLeft] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");
  const [ret, setRet] = useState<Num>("");
  const [gainsTax, setGainsTax] = useState<Num>("");

  const loadExample = () => {
    setBalance(310000);
    setRate(6.25);
    setYearsLeft(26);
    setExtra(500);
    setRet(7);
    setGainsTax(15);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setBalance("");
    setRate("");
    setYearsLeft("");
    setExtra("");
    setRet("");
    setGainsTax("");
  };

  const r = useMemo(() => {
    const B = n(balance);
    const term_m = Math.max(12, Math.round(n(yearsLeft) * 12));
    const E = n(extra);
    if (B <= 0 || n(yearsLeft) <= 0 || E <= 0 || n(rate) < 0) return null;

    const basePI = payment(B, n(rate), term_m);
    // A payment that does not cover the month's interest never clears the loan,
    // and every figure after this would be an infinity wearing a dollar sign.
    const monthlyInterest = (B * n(rate)) / 100 / 12;
    if (basePI <= monthlyInterest * (1 + 1e-9) && n(rate) > 0) {
      return { stalls: true as const, monthlyInterest, basePI };
    }
    const base = amortize(B, n(rate), term_m);

    // --- Path A: prepay the mortgage, then invest the whole payment once it's gone ---
    const prepaid = amortize(B, n(rate), term_m, E, basePI);
    const clearedAt = Number.isFinite(prepaid.payoffMonths) ? prepaid.payoffMonths : term_m;
    const monthsFree = Math.max(0, term_m - clearedAt);
    // After payoff the mortgage payment plus the extra is free to invest.
    const afterPayoff = growthSeries({
      initial: 0,
      contribution: basePI + E,
      annualRate: n(ret),
      years: monthsFree / 12,
    });
    const investedA = afterPayoff.balances[afterPayoff.balances.length - 1] ?? 0;
    const interestSaved = base.totalInterest - prepaid.totalInterest;

    // --- Path B: keep the mortgage to term, invest the extra from day one ---
    const investB = growthSeries({
      initial: 0,
      contribution: E,
      annualRate: n(ret),
      years: term_m / 12,
    });
    const investedB = investB.balances[investB.balances.length - 1] ?? 0;

    /* Tax, on both sides or neither.
     *
     * The page used to compare a pre-tax investment balance against a
     * mortgage rate that is never taxed, which is not a like-for-like return —
     * and it favoured investing, materially. Gains above the money paid in are
     * taxed at the rate entered; set it to zero for a 401(k) or IRA, where the
     * growth is sheltered. Both paths invest, so both are taxed the same way.
     */
    const tGains = Math.min(Math.max(n(gainsTax), 0), 100) / 100;
    const growthA = Math.max(0, investedA - afterPayoff.contributed);
    const growthBamt = Math.max(0, investedB - investB.contributed);
    const taxA = growthA * tGains;
    const taxB = growthBamt * tGains;

    // Net worth at the end of the original term: investments less any debt left.
    // Both paths have the mortgage gone by then, so it is investments alone.
    const netA = investedA - taxA;
    const netB = investedB - taxB;
    const gap = netB - netA;
    const investingWins = gap > 0;

    // Series: investments minus mortgage still owed, month by month.
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    for (let m = 0; m <= term_m; m++) {
      const debtA = prepaid.balances[Math.min(m, prepaid.balances.length - 1)] ?? 0;
      const invA = m > clearedAt ? (afterPayoff.balances[Math.min(m - clearedAt, afterPayoff.balances.length - 1)] ?? 0) : 0;
      seriesA.push(invA - debtA);
      const debtB = base.balances[Math.min(m, base.balances.length - 1)] ?? 0;
      const invB = investB.balances[Math.min(m, investB.balances.length - 1)] ?? 0;
      seriesB.push(invB - debtB);
    }

    const spread = n(ret) - n(rate);

    return {
      stalls: false as const,
      basePI, base, prepaid, clearedAt, monthsFree, interestSaved,
      investedA, investedB, netA, netB, gap: Math.abs(gap), investingWins,
      seriesA, seriesB, spread,
      contributedA: afterPayoff.contributed,
      growthA, taxA,
      contributedB: investB.contributed,
      growthB: investB.growth, taxB,
      tGains,
      freedMonthly: basePI + E,
      term_m,
    };
  }, [balance, rate, yearsLeft, extra, ret, gainsTax]);

  return (
    <CalcShell
      slug="payoff-house-vs-invest"
      intro="An extra payment on the mortgage earns exactly your interest rate, guaranteed. The market has historically paid more, but not reliably and not on a schedule. This puts both on the same timeline."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["extra-payments", "mortgage-payment", "pay-off-debt", "investment-growth"]}
      disclaimer="For educational purposes only. The investing side assumes a steady return that real markets do not deliver — a bad decade early on changes the outcome badly. Prepaying is certain, and it also removes a fixed cost from your life, which is worth something no spreadsheet captures."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your mortgage" badge="CURRENT">
          <div className="space-y-4">
            <NumField label="Balance remaining" value={balance} onChange={setBalance} min={0} placeholder="310000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Interest rate" value={rate} onChange={setRate} min={0} placeholder="6.25" suffix="%" step={0.125} />
              <NumField label="Years left" value={yearsLeft} onChange={setYearsLeft} min={1} placeholder="26" suffix="yrs" />
            </div>
            {r && !r.stalls && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Your payment (P&amp;I)</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.basePI)}/mo</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The spare money" badge="EITHER WAY" badgeTone="green">
          <div className="space-y-4">
            <NumField
              label="Extra each month"
              value={extra}
              onChange={setExtra}
              min={0}
              placeholder="500"
              prefix="$"
              hint="The same amount goes either to the mortgage or into the market — that is what makes this a fair comparison."
            />
            <NumField
              label="Expected investment return"
              value={ret}
              onChange={setRet}
              placeholder="7"
              suffix="%"
              step={0.5}
              hint="Can be negative. Try dropping it a few points to see how quickly the answer flips."
            />
            <NumField
              label="Tax on investment gains"
              value={gainsTax}
              onChange={setGainsTax}
              min={0}
              placeholder="15"
              suffix="%"
              step={1}
              hint="Applied to growth above what you paid in, on both paths. Set it to 0 if you would be investing inside a 401(k) or IRA, where the growth is sheltered — that changes the answer."
            />
            {r && !r.stalls && (
              <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.spread > 0 ? "bg-green-50" : "bg-amber-50"}`}>
                <span className={`text-xs font-medium ${r.spread > 0 ? "text-green-700" : "text-amber-700"}`}>
                  Return above your mortgage rate
                </span>
                <span className={`text-sm font-medium ${r.spread > 0 ? "text-green-800" : "text-amber-800"}`}>
                  {r.spread >= 0 ? "+" : "−"}{Math.abs(r.spread).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r && r.stalls ? (
        <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-red-800 mb-1">This loan never amortises</p>
          <p className="text-xs text-red-800 leading-relaxed">
            A {fmt(r.basePI)} payment does not cover the {fmt(r.monthlyInterest)} of interest{" "}
            {fmt(n(balance))} at {n(rate)}% accrues each month, so the balance never falls and there is
            nothing to compare. Check the balance, the rate and the years remaining.
          </p>
        </div>
      ) : r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Pay the house off</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.netA)}</p>
                <p className="text-xs text-gray-400 mt-0.5">mortgage gone in {fmtMonths(r.clearedAt)}</p>
              </div>
              <div className={`p-4 text-center ${r.investingWins ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">{r.investingWins ? "Investing wins by" : "Paying off wins by"}</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.gap)}</p>
                <p className="text-xs text-white/70">at the end of the original term</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Invest instead</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.netB)}</p>
                <p className="text-xs text-gray-400 mt-0.5">mortgage runs full {fmtMonths(r.term_m)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Net worth after ${fmtMonths(r.term_m)}`}
              value={fmtK(Math.max(r.netA, r.netB))}
              tone={r.investingWins ? "green" : "gray"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {/* Not a balance. It sat beside the invest figure and invited a
                  direct comparison, which is apples to oranges — one is money
                  never charged, the other is money you end up holding. */}
              <Stat
                label="Mortgage interest never charged"
                value={fmtK(r.interestSaved)}
                tone="green"
                sub="money not paid, not a balance"
              />
              <Stat label="Mortgage paid off" value={fmtMonths(r.clearedAt)} sub={`${fmtMonths(r.monthsFree)} early`} tone="green" />
              <Stat
                label="Invested, paying off first"
                value={fmtK(r.netA)}
                sub={`${fmt(r.freedMonthly)}/mo for ${fmtMonths(r.monthsFree)}`}
              />
              <Stat
                label="Invested, keeping the mortgage"
                value={fmtK(r.netB)}
                sub={`${fmtK(r.growthB)} growth on ${fmtK(r.contributedB)} paid in`}
              />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Both paths spend the same <strong>{fmt(r.freedMonthly)}</strong> a month for the whole{" "}
              {fmtMonths(r.term_m)}. Paying off first puts the extra on the mortgage until it clears at{" "}
              {fmtMonths(r.clearedAt)}, then invests the whole{" "}
              <strong>{fmt(r.freedMonthly)}</strong> — payment and extra together — for the remaining{" "}
              {fmtMonths(r.monthsFree)}, paying in {fmtK(r.contributedA)}. Keeping the mortgage invests{" "}
              {fmt(n(extra))} a month from the start, paying in {fmtK(r.contributedB)}. Both figures are
              after {r.tGains > 0 ? `${(r.tGains * 100).toFixed(0)}% tax on the growth` : "tax, which is set to zero here"}, and
              both end with the house owned outright — so neither carries a mortgage to subtract.
            </p>
            <Takeaway tone={r.investingWins ? "green" : "amber"}>
              Prepaying earns a certain <strong>{n(rate)}%</strong>, and no tax is charged on it.
              Investing assumes{" "}
              <strong>{n(ret)}%</strong>, which is {r.spread >= 0 ? "higher" : "lower"} by{" "}
              <strong>{Math.abs(r.spread).toFixed(2)} points</strong>. Over the full term that gap compounds
              into <strong>{fmtK(r.gap)}</strong> in favour of{" "}
              <strong>{r.investingWins ? "investing" : "paying the house off"}</strong>
              {r.tGains > 0 && <> once {(r.tGains * 100).toFixed(0)}% tax on the gains is taken off</>}. The
              catch: one of those returns is a promise and the other is a hope.
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Guaranteed against risky</h2>
            <div className="space-y-2">
              <Takeaway tone="green">
                <strong>Paying the house off</strong> returns exactly {n(rate)}%, cannot lose money, and
                ends with no mortgage — a fixed cost gone from your life for good. That security is worth
                real money to most people, especially close to retirement.
              </Takeaway>
              <Takeaway tone="amber">
                <strong>Investing</strong> has historically beaten mortgage rates over long periods, but
                not every period. The {n(ret)}% above is a straight line; real returns arrive in a jagged
                order, and a poor run in the early years does lasting damage. Money in the market also
                stays liquid, which money in the walls does not.
              </Takeaway>
              <Takeaway tone="blue">
                If you itemise, part of the mortgage interest comes back as a deduction, so the effective
                rate you are beating by prepaying is below {n(rate)}% and the case for it weakens. Around
                nine in ten filers take the standard deduction, so {n(rate)}% is the right figure for most
                people —{" "}
                <a href="/calculators/pay-off-debt" className="text-green-700 underline">
                  Should I pay off a debt or invest?
                </a>{" "}
                works the deduction through properly if you do itemise.
              </Takeaway>
              <Takeaway tone="blue">
                Before either one, make sure you have an emergency fund and are capturing any employer
                retirement match. Both beat this decision outright.
              </Takeaway>
            </div>
          </div>

          <ChartCard
            title="Net position over time"
            footnote="Investments built, less the mortgage still owed — so the early years are a net-worth line, not a balance. Both paths reach the end owing nothing."
          >
            <LineChart
              ariaLabel="Net position over time when prepaying the mortgage compared with investing"
              periodsPerYear={12}
              series={[
                { label: "Pay the house off", color: COLORS.green, data: r.seriesA },
                { label: "Invest instead", color: COLORS.blue, data: r.seriesB, dash: [6, 3] },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Where you land"
            footnote="Investment balance at the end of the original term, after tax on the growth."
          >
            <BarChart
              ariaLabel="Ending investment balance for each strategy"
              height={200}
              bars={[
                {
                  label: "Pay off, then invest",
                  segments: [
                    { label: "Paid in", value: r.contributedA, color: COLORS.gray },
                    { label: "Growth after tax", value: Math.max(0, r.netA - r.contributedA), color: COLORS.green },
                  ],
                },
                {
                  label: "Invest from day one",
                  segments: [
                    { label: "Paid in", value: r.contributedB, color: COLORS.gray },
                    { label: "Growth after tax", value: Math.max(0, r.netB - r.contributedB), color: COLORS.blue },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your mortgage details and the extra you could put in each month.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
