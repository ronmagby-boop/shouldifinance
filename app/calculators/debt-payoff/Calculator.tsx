"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";

type Debt = { name: string; balance: Num; rate: Num; minimum: Num };

const BLANK: Debt = { name: "", balance: "", rate: "", minimum: "" };

/**
 * A minimum payment has to beat the month's interest or the balance grows.
 * The comparison is relative rather than exact because a minimum quoted as a
 * percentage of the balance lands a fraction of a cent either side of the
 * interest, and an exact `<=` would call that a stalemate at random.
 */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;
const monthlyInterest = (balance: number, rate: number) => (balance * rate) / 100 / 12;

type Sim = {
  months: number;
  totalInterest: number;
  totalPaid: number;
  balances: number[];
  order: { name: string; paidOffMonth: number; interest: number }[];
};

/** Run a payoff simulation with a given ordering rule. */
function simulate(debts: { name: string; balance: number; rate: number; minimum: number }[], extra: number, method: "snowball" | "avalanche"): Sim | null {
  const active = debts.map((d) => ({ ...d, interest: 0, paidOffMonth: 0 }));
  if (active.length === 0) return null;

  const totalBalance = active.reduce((a, d) => a + d.balance, 0);
  const balances: number[] = [totalBalance];
  let totalInterest = 0;
  let totalPaid = 0;
  const order: { name: string; paidOffMonth: number; interest: number }[] = [];

  for (let month = 1; month <= 720; month++) {
    let pool = extra;
    // Accrue interest and pay minimums.
    for (const d of active) {
      // A debt already cleared frees its whole minimum for the next target.
      if (d.balance <= 0.01) {
        pool += d.minimum;
        continue;
      }
      const interest = (d.balance * d.rate) / 100 / 12;
      d.balance += interest;
      d.interest += interest;
      totalInterest += interest;
      const pay = Math.min(d.minimum, d.balance);
      d.balance -= pay;
      totalPaid += pay;
      // A cleared debt frees its minimum for the next target.
      if (d.balance <= 0.01) pool += d.minimum - pay;
    }

    // Target the next debt with everything left over.
    const remaining = active.filter((d) => d.balance > 0.01);
    remaining.sort((a, b) =>
      method === "snowball" ? a.balance - b.balance : b.rate - a.rate || a.balance - b.balance,
    );
    for (const target of remaining) {
      if (pool <= 0) break;
      const pay = Math.min(pool, target.balance);
      target.balance -= pay;
      pool -= pay;
      totalPaid += pay;
    }

    for (const d of active) {
      if (d.balance <= 0.01 && d.paidOffMonth === 0) {
        d.paidOffMonth = month;
        order.push({ name: d.name, paidOffMonth: month, interest: d.interest });
      }
    }

    const left = active.reduce((a, d) => a + Math.max(0, d.balance), 0);
    balances.push(left);
    if (left <= 0.01) {
      return { months: month, totalInterest, totalPaid, balances, order };
    }
  }
  return null; // never pays off — minimums don't cover interest
}

export default function Calculator() {
  const [debts, setDebts] = useState<Debt[]>([
    { ...BLANK }, { ...BLANK }, { ...BLANK }, { ...BLANK },
  ]);
  const [extra, setExtra] = useState<Num>("");

  const update = (i: number, patch: Partial<Debt>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const addDebt = () => setDebts((d) => [...d, { ...BLANK }]);

  const loadExample = () => {
    // The previous example sorted identically under both rules — the smallest
    // balance also carried the highest rate, so the two panels printed the same
    // numbers and the page demonstrated nothing.
    //
    // The divergence comes from the medical bill: smallest balance and the
    // lowest rate at once. Snowball clears it in month 4; avalanche leaves it
    // to finish on its own minimum and goes after the card instead.
    setDebts([
      { name: "Credit card", balance: 12400, rate: 24.99, minimum: 310 },
      { name: "Medical bill", balance: 1900, rate: 0, minimum: 75 },
      { name: "Car loan", balance: 9800, rate: 6.9, minimum: 265 },
      { name: "Student loan", balance: 18200, rate: 5.5, minimum: 205 },
    ]);
    setExtra(400);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setDebts([
    { ...BLANK }, { ...BLANK }, { ...BLANK }, { ...BLANK },
  ]);
    setExtra("");
  };

  const r = useMemo(() => {
    const clean = debts
      .filter((d) => n(d.balance) > 0 && n(d.minimum) > 0)
      .map((d, i) => ({
        name: d.name || `Debt ${i + 1}`,
        balance: n(d.balance),
        rate: n(d.rate),
        minimum: n(d.minimum),
      }));
    if (clean.length === 0) return null;

    // Debts whose minimum does not cover their own interest. They still clear
    // once the plan reaches them, but they grow until it does.
    const stuck = clean.filter(
      (d) => d.minimum <= monthlyInterest(d.balance, d.rate) * INTEREST_ONLY_EPSILON,
    );

    const snowball = simulate(clean, n(extra), "snowball");
    const avalanche = simulate(clean, n(extra), "avalanche");
    // Neither ordering gets there inside 60 years: the payment simply is not
    // enough. Say so, rather than falling through to "add at least one debt".
    if (!snowball || !avalanche) return { neverClears: true as const, stuck };

    const minimumOnly = simulate(clean, 0, "avalanche");

    const totalBalance = clean.reduce((a, d) => a + d.balance, 0);
    const totalMinimums = clean.reduce((a, d) => a + d.minimum, 0);
    const weightedRate = clean.reduce((a, d) => a + d.rate * d.balance, 0) / totalBalance;

    const freeDate = new Date();
    freeDate.setMonth(freeDate.getMonth() + avalanche.months);

    return {
      neverClears: false as const,
      stuck,
      clean,
      snowball,
      avalanche,
      minimumOnly,
      totalBalance,
      totalMinimums,
      weightedRate,
      avalancheSaves: snowball.totalInterest - avalanche.totalInterest,
      // The snowball badge claims a quicker first win, so it has to be checked
      // rather than asserted — on some debt mixes the two orders coincide.
      snowFirstSooner: snowball.order[0].paidOffMonth < avalanche.order[0].paidOffMonth,
      extraSaves: minimumOnly ? minimumOnly.totalInterest - avalanche.totalInterest : 0,
      monthsSaved: minimumOnly ? minimumOnly.months - avalanche.months : 0,
      freeDate: freeDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      totalPayment: totalMinimums + n(extra),
    };
  }, [debts, extra]);

  const headCell = "text-xs font-medium text-gray-400";

  return (
    <CalcShell
      slug="debt-payoff"
      intro="List everything you owe, then add whatever you can put toward it beyond the minimums. We'll run both payoff methods — smallest balance first, or highest rate first — and show what each one costs."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["refinance-to-pay-off-debt", "pay-off-debt", "emergency-fund"]}
      disclaimer="For educational purposes only. Assumes fixed rates and that you stop adding new debt. Credit card minimum payments usually shrink as the balance falls, which makes payoff slower than shown here if you only ever pay the minimum. Not credit counselling advice."
    >
      <Card title="What you owe" badge="YOUR DEBTS" className="mb-4">
        <div className="space-y-4">
          <div className="space-y-2">
            {/* One heading row from md up. Each field keeps its own label in the
                DOM for screen readers but hides it visually at that width, so a
                row is a single line instead of a stack of captions. Below md the
                heading row goes and the per-field labels come back. */}
            <div className="hidden md:grid md:grid-cols-[1.4fr_1fr_0.8fr_1fr] gap-3 px-1">
              <span className={headCell}>Debt</span>
              <span className={headCell}>Balance</span>
              <span className={headCell}>Rate</span>
              <span className={headCell}>Minimum payment</span>
            </div>
            {debts.map((d, i) => (
              <div
                key={i}
                className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_0.8fr_1fr] gap-3 items-end md:items-center border-b border-gray-100 md:border-0 pb-3 md:pb-0"
              >
                <div className="col-span-2 md:col-span-1">
                  <label htmlFor={`debt-name-${i}`} className="block text-xs font-medium text-gray-500 mb-1.5 md:sr-only">
                    Debt name
                  </label>
                  <input
                    id={`debt-name-${i}`}
                    type="text"
                    value={d.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder={`Debt ${i + 1}`}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400 bg-white"
                  />
                </div>
                <NumField label="Balance" labelClass="md:sr-only" min={0} value={d.balance} onChange={(v) => update(i, { balance: v })} placeholder="12400" prefix="$" />
                <NumField label="Rate" labelClass="md:sr-only" min={0} value={d.rate} onChange={(v) => update(i, { rate: v })} placeholder="24.99" suffix="%" step={0.1} />
                {/* Full width below md: with Balance and Rate paired above it,
                    a half-width Minimum left a hole in the right-hand column. */}
                <div className="col-span-2 md:col-span-1">
                  <NumField label="Minimum" labelClass="md:sr-only" min={0} value={d.minimum} onChange={(v) => update(i, { minimum: v })} placeholder="310" prefix="$" />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addDebt}
            className="inline-flex items-center text-sm font-medium text-green-700 min-h-11 px-1 -mx-1"
          >
            + Add another debt
          </button>
          <div className="pt-2 border-t border-gray-100">
            <NumField
              label="Extra you can pay each month"
              value={extra}
              min={0}
              onChange={setExtra}
              placeholder="400"
              prefix="$"
              hint="On top of all the minimums. This is the number that does the work."
            />
          </div>
        </div>
      </Card>

      {r && r.neverClears ? (
        <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-red-800 mb-2">These debts never clear</p>
          <p className="text-xs text-red-800 leading-relaxed">
            {r.stuck.length > 0 ? (
              <>
                {r.stuck.map((d) => d.name).join(", ")}{" "}
                {r.stuck.length === 1 ? "has a minimum payment" : "have minimum payments"} below{" "}
                {r.stuck.length === 1 ? "its" : "their"} own monthly interest, and the extra you have
                entered is not enough to make up the difference. The balance grows every month. Either
                the payment has to rise or the rate has to come down.
              </>
            ) : (
              <>
                The payments entered do not retire these balances within sixty years. Check the minimums
                and rates — a minimum below a debt&apos;s monthly interest never reduces it.
              </>
            )}
          </p>
        </div>
      ) : r ? (
        <>
          {r.stuck.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>
                  {r.stuck.map((d) => d.name).join(", ")}{" "}
                  {r.stuck.length === 1 ? "has a minimum below its" : "have minimums below their"} monthly
                  interest.
                </strong>{" "}
                {r.stuck.length === 1 ? "That balance grows" : "Those balances grow"} until the plan below
                reaches {r.stuck.length === 1 ? "it" : "them"}. The figures account for that, but it is
                worth knowing where the money is going in the meantime.
              </p>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Total owed</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.totalBalance)}</p>
              </div>
              <div className="p-4 text-center bg-green-800">
                <p className="text-xs text-green-300 mb-0.5">Debt-free in</p>
                <p className="text-2xl font-medium text-white">{fmtMonths(r.avalanche.months)}</p>
                <p className="text-xs text-green-300">{r.freeDate}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Monthly payment</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.totalPayment)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card
              title="Avalanche — highest rate first"
              badge={r.avalancheSaves > 0 ? "LOWEST COST" : "SAME COST HERE"}
              badgeTone="green"
              className="bg-gray-50"
            >
              <Headline label="Total interest paid" value={fmtK(r.avalanche.totalInterest)} />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Debt-free in" value={fmtMonths(r.avalanche.months)} tone="green" />
                <Stat label="Total paid" value={fmtK(r.avalanche.totalPaid)} />
              </div>
              <div className="space-y-2">
                {r.avalanche.order.map((o, idx) => (
                  <div key={o.name} className="flex justify-between items-center gap-2 text-xs bg-white border border-gray-100 rounded-lg px-3 py-2">
                    <span className="text-gray-500">
                      <span className="text-gray-400 mr-2">{idx + 1}.</span>
                      {o.name}
                    </span>
                    <span className="text-gray-900 font-medium">{fmtMonths(o.paidOffMonth)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* "FASTEST WINS" read as fastest to debt-free, which snowball
                usually is not. It means the first debt gone, so it says that —
                and only when the order actually delivers it. */}
            <Card
              title="Snowball — smallest balance first"
              badge={r.snowFirstSooner ? "QUICKEST FIRST WIN" : "SAME FIRST WIN"}
              badgeTone="blue"
              className="bg-gray-50"
            >
              <Headline label="Total interest paid" value={fmtK(r.snowball.totalInterest)} tone="gray" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Debt-free in" value={fmtMonths(r.snowball.months)} />
                <Stat
                  label="Extra cost vs. avalanche"
                  value={r.avalancheSaves > 0 ? fmt(r.avalancheSaves) : "None"}
                  tone={r.avalancheSaves > 0 ? "amber" : "green"}
                />
              </div>
              <div className="space-y-2">
                {r.snowball.order.map((o, idx) => (
                  <div key={o.name} className="flex justify-between items-center gap-2 text-xs bg-white border border-gray-100 rounded-lg px-3 py-2">
                    <span className="text-gray-500">
                      <span className="text-gray-400 mr-2">{idx + 1}.</span>
                      {o.name}
                    </span>
                    <span className="text-gray-900 font-medium">{fmtMonths(o.paidOffMonth)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Takeaway>
              {r.avalancheSaves > 0 ? (
                <>
                  <strong>Avalanche saves {fmt(r.avalancheSaves)}</strong> in interest by attacking your{" "}
                  {pct(Math.max(...r.clean.map((d) => d.rate)), 2)} debt first. Snowball clears your first
                  balance sooner, which some people need to stay motivated — if that is you, the extra{" "}
                  {fmt(r.avalancheSaves)} may be worth paying. Either beats standing still.
                </>
              ) : (
                <>
                  Both methods cost the same here, so pick whichever keeps you going. Your weighted average
                  rate is <strong>{pct(r.weightedRate, 2)}</strong>.
                </>
              )}
              {r.extraSaves > 0 && (
                <>
                  {" "}
                  {/* The baseline is not "minimums only" in the way most people
                      read that phrase. simulate(clean, 0) still rolls each
                      cleared debt\'s minimum onto the next one, which is why it
                      finishes years before paying each minimum in isolation
                      would. The model is the right comparison; the label was
                      the thing that was wrong. */}
                  Compared with paying the minimums and rolling each freed-up payment onto the next debt,
                  your extra {fmt(n(extra))}/mo saves <strong>{fmtK(r.extraSaves)}</strong> and clears the
                  debt <strong>{fmtMonths(r.monthsSaved)}</strong> sooner.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Total balance falling">
            <LineChart
              ariaLabel="Total debt balance over time under the avalanche and snowball methods"
              periodsPerYear={12}
              series={[
                { label: "Avalanche", color: COLORS.green, data: r.avalanche.balances },
                { label: "Snowball", color: COLORS.blue, data: r.snowball.balances, dash: [6, 3] },
                ...(r.minimumOnly
                  ? [{ label: "Minimums + rollover", color: COLORS.gray, data: r.minimumOnly.balances, dash: [2, 3] }]
                  : []),
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Both curves steepen as they go — every debt you clear frees its minimum payment to attack
                the next one. That accelerating effect is why the last debts fall far faster than the
                first.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Interest paid under each approach">
            <BarChart
              ariaLabel="Total interest paid by method"
              height={210}
              bars={[
                { label: "Avalanche", segments: [{ label: "Interest", value: r.avalanche.totalInterest, color: COLORS.green }] },
                { label: "Snowball", segments: [{ label: "Interest", value: r.snowball.totalInterest, color: COLORS.blue }] },
                ...(r.minimumOnly
                  ? [{ label: "Minimums + rollover", segments: [{ label: "Interest", value: r.minimumOnly.totalInterest, color: COLORS.red }] }]
                  : []),
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add at least one debt with a balance and a minimum payment to compare payoff strategies.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
