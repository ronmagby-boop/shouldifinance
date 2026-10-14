"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, has, months, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import {
  MAX_MONTHS, MIN_RULE_DEFAULTS, STATEMENT_MONTHS,
  payFixed, payMinimum, paymentToClear, statementCheck, type MinRule, type Run,
} from "../../lib/cardPayoff";

/** The chart stops here so a 40-year minimum path does not flatten everything else. */
const CHART_MONTHS = 360;

const RULE_OPTIONS: { value: MinRule["kind"]; label: string }[] = [
  { value: "interestPlusPct", label: "Interest plus a % of the balance" },
  { value: "pctOfBalance", label: "A % of the balance" },
];

/** "12 yrs 3 mo", or the reason it never ends. */
const howLong = (r: Run) => (r.paidOff ? months(r.months) : "Never");

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [apr, setApr] = useState<Num>("");
  const [ruleKind, setRuleKind] = useState<MinRule["kind"]>("interestPlusPct");
  const [pct, setPct] = useState<Num>("");
  const [floor, setFloor] = useState<Num>("");
  const [fixed, setFixed] = useState<Num>("");
  const [target, setTarget] = useState<Num>("");
  const [charges, setCharges] = useState<Num>("");

  const loadExample = () => {
    setBalance(6000);
    setApr(24);
    setRuleKind("interestPlusPct");
    setPct("");
    setFloor("");
    setFixed(250);
    setTarget(24);
    setCharges("");
  };

  const clearExample = () => {
    setBalance("");
    setApr("");
    setRuleKind("interestPlusPct");
    setPct("");
    setFloor("");
    setFixed("");
    setTarget("");
    setCharges("");
  };

  const defaults = MIN_RULE_DEFAULTS[ruleKind];

  const r = useMemo(() => {
    const b = n(balance);
    if (b <= 0 || !has(apr)) return null;
    const rate = Math.max(0, n(apr));
    const extra = Math.max(0, n(charges));
    const rule: MinRule = {
      kind: ruleKind,
      pct: has(pct) ? Math.max(0, n(pct)) : defaults.pct,
      floor: has(floor) ? Math.max(0, n(floor)) : defaults.floor,
    };
    const min = payMinimum(b, rate, rule, extra);
    const fix = n(fixed) > 0 ? payFixed(b, rate, n(fixed), extra) : null;
    const targetMonths = n(target) > 0 ? Math.round(n(target)) : null;
    const targetPayment = targetMonths ? paymentToClear(b, rate, targetMonths, extra) : null;
    const targetRun = targetPayment ? payFixed(b, rate, targetPayment, extra) : null;
    return {
      b, rate, extra, rule, min, fix, targetMonths, targetPayment, targetRun,
      firstInterest: (b * rate) / 100 / 12,
      statement: statementCheck(b, rate, rule),
    };
  }, [balance, apr, ruleKind, pct, floor, fixed, target, charges, defaults]);

  const neverText = (run: Run, what: string) =>
    run.never === "payment-below-interest"
      ? `${what} does not beat the interest${r && r.extra > 0 ? " and new charges" : ""} it has to cover, so the balance stops falling and never reaches zero.`
      : `${what} would still not have cleared it after ${MAX_MONTHS / 12} years.`;

  return (
    <CalcShell
      slug="credit-card-payoff"
      intro="Paying only the minimum is the slowest way off a card, because the minimum shrinks as the balance does. See how long it takes and what it costs, against a fixed payment, and the payment that clears the card by the date you choose."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-payoff", "balance-transfer", "debt-consolidation", "blended-interest-rate"]}
      disclaimer="For educational purposes only. Interest is estimated monthly, at the APR ÷ 12; issuers charge a daily rate on the average daily balance, so your statement will differ a little. The minimum payment formulas are common shapes, not any issuer's: check your cardholder agreement for yours. A rate that changes, fees, or a missed payment change these results."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your card" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Balance" value={balance} onChange={setBalance} min={0} placeholder="6000" prefix="$" />
              <NumField label="APR" value={apr} onChange={setApr} min={0} placeholder="24" suffix="%" step={0.1} />
            </div>
            <NumField
              label="New charges each month (optional)"
              value={charges}
              onChange={setCharges}
              min={0}
              placeholder="0"
              prefix="$"
              hint="Anything you keep putting on the card. Carrying a balance usually means new purchases are charged interest from the day you make them."
            />
          </div>
        </Card>
        <Card title="The minimum payment" badge="ISSUER-SPECIFIC" badgeTone="amber" className="h-full">
          <div className="space-y-4">
            <SelectField
              label="How your issuer sets it"
              value={ruleKind}
              onChange={(v) => setRuleKind(v as MinRule["kind"])}
              options={RULE_OPTIONS}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Percent of balance" value={pct} onChange={setPct} min={0} placeholder={String(defaults.pct)} suffix="%" step={0.5} />
              <NumField label="Dollar floor" value={floor} onChange={setFloor} min={0} placeholder={String(defaults.floor)} prefix="$" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Two common shapes with starting values, not a standard: each issuer sets its own formula in the cardholder
              agreement, and your statement shows this month&apos;s minimum. Edit them to match yours.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Paying more" badge="OPTIONAL" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NumField label="A fixed monthly payment" value={fixed} onChange={setFixed} min={0} placeholder="250" prefix="$" hint="The same amount every month until it is gone." />
          <NumField label="Paid off in (months)" value={target} onChange={setTarget} min={0} placeholder="24" suffix="mo" hint="We work out the payment that does it." />
        </div>
      </Card>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Paying only the minimum, it takes"
              value={howLong(r.min)}
              tone={r.min.paidOff ? "gray" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat
                label="First minimum"
                value={fmt(r.min.firstPayment)}
                sub={r.min.firstPayment > r.firstInterest
                  ? `of which ${fmt(r.firstInterest)} is interest`
                  : `less than the month's ${fmt(r.firstInterest)} of interest`}
              />
              <Stat label="Interest at the minimum" value={r.min.paidOff ? fmt(r.min.totalInterest) : "No end"} tone="red" />
              {r.fix && (
                <Stat
                  label={`At ${fmt(n(fixed))}/mo`}
                  value={howLong(r.fix)}
                  tone={r.fix.paidOff ? "green" : "red"}
                  sub={r.fix.paidOff ? `${fmt(r.fix.totalInterest)} interest` : undefined}
                />
              )}
              {r.fix && r.fix.paidOff && r.min.paidOff && (
                <Stat label="Interest saved" value={fmt(r.min.totalInterest - r.fix.totalInterest)} tone="green" sub={`and ${months(r.min.months - r.fix.months)} sooner`} />
              )}
              {r.targetPayment !== null && r.targetMonths !== null && (
                <Stat
                  label={`To clear it in ${months(r.targetMonths)}`}
                  value={`${fmt(r.targetPayment)}/mo`}
                  tone="green"
                  sub={r.targetRun ? `${fmt(r.targetRun.totalInterest)} interest` : undefined}
                />
              )}
            </div>
            <div className="space-y-2">
              {r.min.paidOff ? (
                <Takeaway tone="amber">
                  The minimum starts at {fmt(r.min.firstPayment)} and falls as the balance does, so most of each payment keeps
                  going to interest: paying only the minimum costs <strong>{fmt(r.min.totalInterest)}</strong> in interest
                  over {months(r.min.months)}. A payment that stays fixed is what ends it sooner.
                </Takeaway>
              ) : (
                <Takeaway tone="red">
                  <strong>The minimum never pays this off.</strong> {neverText(r.min, `A minimum of ${fmt(r.min.firstPayment)}`)}
                </Takeaway>
              )}
              {r.fix && !r.fix.paidOff && (
                <Takeaway tone="red">{neverText(r.fix, `A payment of ${fmt(n(fixed))}`)}</Takeaway>
              )}
            </div>
          </div>

          <ChartCard title="The balance, month by month">
            <LineChart
              ariaLabel="Credit card balance over time paying the minimum and paying a fixed amount"
              periodsPerYear={12}
              series={[
                { label: "Minimum payments", color: COLORS.amber, data: r.min.balances.slice(0, CHART_MONTHS + 1) },
                ...(r.fix ? [{ label: `${fmt(n(fixed))} a month`, color: COLORS.green, data: r.fix.balances.slice(0, CHART_MONTHS + 1) }] : []),
                ...(r.targetRun && r.targetMonths ? [{ label: `Clear in ${months(r.targetMonths)}`, color: COLORS.blue, dash: [5, 4], data: r.targetRun.balances }] : []),
              ]}
              xUnit="Yr"
            />
            {((r.min.paidOff && r.min.months > CHART_MONTHS) || !r.min.paidOff) && (
              <p className="text-xs text-gray-400 mt-3">
                {r.min.paidOff
                  ? `The chart shows the first ${CHART_MONTHS / 12} years; the minimum path runs to ${months(r.min.months)}.`
                  : "The minimum path stops where the balance stops falling."}
              </p>
            )}
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-sm font-medium text-gray-900">What your statement&apos;s payoff box compares</h2>
              <span className="text-xs rounded-full px-3 py-1 whitespace-nowrap bg-blue-50 text-blue-600">12 CFR 1026.7(b)(12)</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Federal rules make your card statement show this comparison for the balance on it, assuming no new charges.
              Here is what it would show on these numbers. Your issuer uses its own formula and may estimate a daily rate,
              so its figures can differ a little.
            </p>
            {r.statement.neverPaysOff ? (
              <div className="space-y-2">
                <Takeaway tone="red">
                  Instead of a payoff time, the statement must warn that, paying only the minimum, the issuer estimates you
                  will never pay off the balance, because the payment is less than the interest charged each month.
                </Takeaway>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label={`Payment to repay in ${STATEMENT_MONTHS} months`} value={`${fmt(r.statement.payment36)}/mo`} />
                  <Stat label="Total over 3 years" value={fmt(r.statement.total36)} />
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-xs text-gray-400 text-left">
                      <th className="py-2 pr-3 font-normal">If you pay each month</th>
                      <th className="py-2 pr-3 font-normal">You will pay it off in about</th>
                      <th className="py-2 font-normal">And end up paying an estimated total of</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-100">
                      <td className="py-2 pr-3">Only the minimum</td>
                      <td className="py-2 pr-3">{r.statement.disclosed.value} {r.statement.disclosed.unit === "years" ? (r.statement.disclosed.value === 1 ? "year" : "years") : (r.statement.disclosed.value === 1 ? "month" : "months")}</td>
                      <td className="py-2">{fmt(r.statement.minTotalCost)}</td>
                    </tr>
                    {r.statement.show36 && (
                      <tr className="border-t border-gray-100">
                        <td className="py-2 pr-3">{fmt(r.statement.payment36)}</td>
                        <td className="py-2 pr-3">3 years</td>
                        <td className="py-2">
                          {fmt(r.statement.total36)}{" "}
                          <span className="text-green-700">(saves {fmt(r.statement.savings36)})</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {!r.statement.show36 && (
                  <p className="text-xs text-gray-400 mt-2">
                    No 3-year row: the rule leaves it off when the minimum alone takes three years or less, or when the
                    3-year payment would be smaller than the minimum.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Ways to get there faster</h2>
            <div className="space-y-2">
              <Takeaway tone="green">
                <strong>More than one card?</strong> The{" "}
                <Link href="/calculators/debt-payoff" className="underline">snowball or avalanche calculator</Link> orders the
                extra across all of them.
              </Takeaway>
              <Takeaway tone="green">
                <strong>A lower rate for a while.</strong> See whether a{" "}
                <Link href="/calculators/balance-transfer" className="underline">balance transfer</Link> pays for its fee, or
                whether a{" "}
                <Link href="/calculators/debt-consolidation" className="underline">consolidation loan</Link> saves money once
                its term is counted.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the balance and APR to see how long the minimum takes.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
