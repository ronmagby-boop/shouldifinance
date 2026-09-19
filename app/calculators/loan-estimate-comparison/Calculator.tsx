"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, LineChart, COLORS } from "../../components/Charts";
import { payment, aprFromFees, balanceAfter } from "../../lib/finance";

/**
 * The fields mirror page 2 of the CFPB Loan Estimate rather than the categories
 * a shopper might invent.
 *
 *   A. Origination Charges
 *   B. Services You Cannot Shop For
 *   C. Services You Can Shop For
 *   D. TOTAL LOAN COSTS          (A + B + C)
 *   E. Taxes and Other Government Fees
 *   F. Prepaids
 *   G. Initial Escrow Payment at Closing
 *   H. Other
 *   I. TOTAL OTHER COSTS         (E + F + G + H)
 *   J. TOTAL CLOSING COSTS       (D + I, with Lender Credits subtracted beneath)
 *
 * Discount points used to have their own field here, which was a mistake: box A
 * runs origination, underwriting and discount points into one printed number.
 * Asking for points on top of box D either double-counts them or asks the
 * borrower to take apart a figure the form never breaks out.
 */
type Quote = {
  name: string;
  /** Optional per-lender override; blank falls back to the shared loan amount. */
  loan: Num;
  rate: Num;
  /** Optional per-lender override; blank falls back to the shared term. */
  term: Num;
  /** Box D — Total Loan Costs. */
  loanCosts: Num;
  /** Box I — Total Other Costs. */
  otherCosts: Num;
  credits: Num;
};

const EMPTY: Quote = { name: "", loan: "", rate: "", term: "", loanCosts: "", otherCosts: "", credits: "" };
const TONES = [COLORS.green, COLORS.blue, COLORS.purple];

export default function Calculator() {
  const [loanAmount, setLoanAmount] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [stayYears, setStayYears] = useState<Num>("");
  const [quotes, setQuotes] = useState<Quote[]>([
    { ...EMPTY, name: "Lender A" },
    { ...EMPTY, name: "Lender B" },
    { ...EMPTY, name: "Lender C" },
  ]);

  const update = (i: number, patch: Partial<Quote>) =>
    setQuotes((q) => q.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const loadExample = () => {
    setLoanAmount(400000);
    setTerm(30);
    setStayYears(7);
    // Three quotes on the same $400,000 loan: A bought the rate down (box D
    // carries the discount points), C took a credit for a higher rate, B sits
    // between them.
    //
    // Loan and term are written out rather than left to inherit. Blank fields
    // would still produce these figures, but an example that leaves two boxes
    // per card empty looks half-filled; the override behaviour is unchanged,
    // it just starts from the value it would have inherited.
    setQuotes([
      { name: "Lender A", loan: 400000, rate: 6.375, term: 30, loanCosts: 7200, otherCosts: 4100, credits: 0 },
      { name: "Lender B", loan: 400000, rate: 6.5, term: 30, loanCosts: 3100, otherCosts: 4050, credits: 0 },
      { name: "Lender C", loan: 400000, rate: 6.875, term: 30, loanCosts: 1900, otherCosts: 4000, credits: 1500 },
    ]);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setLoanAmount("");
    setTerm("");
    setStayYears("");
    setQuotes([
    { ...EMPTY, name: "Lender A" },
    { ...EMPTY, name: "Lender B" },
    { ...EMPTY, name: "Lender C" },
  ]);
  };

  const sharedLoan = n(loanAmount);
  const sharedMonths = n(term) > 0 ? Math.max(1, Math.round(n(term) * 12)) : 0;

  const r = useMemo(() => {
    const stayMonths = Math.max(1, Math.round(n(stayYears) * 12));

    const rows = quotes
      .map((q, i) => {
        // Every downstream figure hangs off these two, so they are resolved
        // once, per lender, before anything else is computed.
        const loan = n(q.loan) > 0 ? n(q.loan) : sharedLoan;
        const months = n(q.term) > 0 ? Math.max(1, Math.round(n(q.term) * 12)) : sharedMonths;
        if (loan <= 0 || months <= 0 || n(q.rate) <= 0) return null;

        // Box J: total closing costs, lender credits already netted out.
        const closingCosts = n(q.loanCosts) + n(q.otherCosts) - n(q.credits);
        const monthly = payment(loan, n(q.rate), months);
        const apr = aprFromFees(loan, n(q.rate), months, closingCosts);

        // A quote can be shorter than the holding period now that terms differ
        // per lender; without the clamp the payment keeps being charged past
        // payoff.
        const heldMonths = Math.min(stayMonths, months);
        const paidOverStay = monthly * heldMonths;
        const balanceLeft = balanceAfter(loan, n(q.rate), months, heldMonths);
        const principalPaid = loan - balanceLeft;
        const interestOverStay = paidOverStay - principalPaid;
        const costOverStay = interestOverStay + closingCosts;
        const lifetimeInterest = monthly * months - loan;

        return {
          ...q,
          index: i,
          color: TONES[i],
          loanUsed: loan,
          months,
          closingCosts,
          monthly,
          apr,
          costOverStay,
          interestOverStay,
          lifetimeInterest,
          totalLifetime: lifetimeInterest + closingCosts,
          balanceLeft,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (rows.length === 0) return null;

    const bestOverStay = rows.reduce((a, b) => (b.costOverStay < a.costOverStay ? b : a));
    const bestMonthly = rows.reduce((a, b) => (b.monthly < a.monthly ? b : a));
    const bestUpfront = rows.reduce((a, b) => (b.closingCosts < a.closingCosts ? b : a));
    const worstOverStay = rows.reduce((a, b) => (b.costOverStay > a.costOverStay ? b : a));

    // Cumulative cost curves so you can see where the cheaper rate overtakes
    // the lower closing costs. Each curve runs to its own lender's term.
    const curves = rows.map((row) => {
      const data: number[] = [];
      for (let m = 0; m <= row.months; m += 6) {
        const bal = balanceAfter(row.loanUsed, n(row.rate), row.months, m);
        const paid = row.monthly * m;
        data.push(paid - (row.loanUsed - bal) + row.closingCosts);
      }
      return { label: row.name || `Lender ${row.index + 1}`, color: row.color, data };
    });

    return {
      rows,
      bestOverStay,
      bestMonthly,
      bestUpfront,
      mixedLoans: rows.some((row) => row.loanUsed !== rows[0].loanUsed),
      savings: worstOverStay.costOverStay - bestOverStay.costOverStay,
      curves,
    };
  }, [sharedLoan, sharedMonths, stayYears, quotes]);

  return (
    <CalcShell
      slug="loan-estimate-comparison"
      intro="The lowest rate isn't always the cheapest loan. Closing costs can outweigh what a lower rate saves if you move or refinance first. Put three Loan Estimates side by side — the fields below match page 2 of the form box for box — and compare them over the years you'll actually keep the loan."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["mortgage-payment", "effective-interest-rate", "should-i-refinance"]}
      disclaimer="For educational purposes only. Compare official Loan Estimates, which lenders must issue within three business days of an application, and check that each quote assumes the same property, product and lock period. The APR shown here is built from every closing cost you enter, not from the finance charges alone, so it will not match a lender's disclosed APR — see the note under the comparison table."
    >
      <Card title="The loan you're shopping" badge="SHARED TERMS" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField
            label="Loan amount"
            value={loanAmount}
            onChange={setLoanAmount}
            placeholder="400000"
            prefix="$"
            hint="Used for every quote unless a card overrides it."
          />
          <NumField
            label="Loan term"
            value={term}
            onChange={setTerm}
            placeholder="30"
            suffix="yrs"
            hint="Used for every quote unless a card overrides it."
          />
          <NumField
            label="Years you'll keep it"
            value={stayYears}
            onChange={setStayYears}
            placeholder="7"
            suffix="yrs"
            hint="Most loans end in 7-10 years."
          />
        </div>
      </Card>

      {/* Three across only from lg. At md the content column leaves each card
          about 150px of field width, which clips a five-digit rate and a
          seven-figure loan amount; stacking is better than truncating. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {quotes.map((q, i) => (
          <div key={i} className="border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-5">
              <input
                type="text"
                value={q.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={`Lender ${i + 1}`}
                className="text-sm font-medium text-gray-900 border-b border-gray-200 focus:outline-none focus:border-green-400 pb-1 w-full mr-2 bg-transparent"
              />
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: TONES[i] }} />
            </div>
            <div className="space-y-4">
              <NumField
                label="Loan amount"
                value={q.loan}
                onChange={(v) => update(i, { loan: v })}
                placeholder={sharedLoan > 0 ? String(Math.round(sharedLoan)) : "400000"}
                prefix="$"
                hint={
                  sharedLoan > 0
                    ? `Page 1, Loan Amount. Blank uses ${fmt(sharedLoan)}.`
                    : "Page 1, Loan Amount."
                }
              />
              {/* Side by side everywhere except lg, where three cards share the
                  content column and 91px of field clips a five-character rate. */}
              <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                <NumField
                  label="Rate"
                  value={q.rate}
                  onChange={(v) => update(i, { rate: v })}
                  placeholder="6.375"
                  suffix="%"
                  step={0.125}
                  hint="Page 1, Interest Rate."
                />
                <NumField
                  label="Term"
                  value={q.term}
                  onChange={(v) => update(i, { term: v })}
                  placeholder={sharedMonths > 0 ? String(Math.round(sharedMonths / 12)) : "30"}
                  suffix="yrs"
                  hint={
                    sharedMonths > 0
                      ? `Page 1. Blank uses ${Math.round(sharedMonths / 12)} yrs.`
                      : "Page 1, Loan Terms."
                  }
                />
              </div>
              <NumField
                label="Total Loan Costs (D)"
                value={q.loanCosts}
                onChange={(v) => update(i, { loanCosts: v })}
                placeholder="7200"
                prefix="$"
                hint="Page 2, box D — origination, services you cannot shop for, services you can shop for (A + B + C)."
              />
              <NumField
                label="Total Other Costs (I)"
                value={q.otherCosts}
                onChange={(v) => update(i, { otherCosts: v })}
                placeholder="4100"
                prefix="$"
                hint="Page 2, box I — government fees, prepaids, initial escrow, other (E + F + G + H)."
              />
              <NumField
                label="Lender credits"
                value={q.credits}
                onChange={(v) => update(i, { credits: v })}
                placeholder="0"
                prefix="$"
                hint="Page 2, printed as a negative just under box J. Enter it as a positive number."
              />
              {r?.rows.find((row) => row.index === i) && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                  {(() => {
                    const row = r.rows.find((x) => x.index === i)!;
                    return (
                      <>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-400">Payment</span>
                          <span className="text-sm font-medium text-gray-900">{fmt(row.monthly)}/mo</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-400">Total closing costs (J)</span>
                          <span className="text-sm font-medium text-gray-900">{fmt(row.closingCosts)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-400">APR (all costs)</span>
                          <span className="text-sm font-medium text-gray-900">{pct(row.apr, 3)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Cheapest over ${n(stayYears)} years`}
              value={r.bestOverStay.name || `Lender ${r.bestOverStay.index + 1}`}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Its cost over that period" value={fmtK(r.bestOverStay.costOverStay)} sub="interest + closing costs" tone="green" />
              <Stat label="Savings vs. the priciest quote" value={fmtK(r.savings)} tone="green" />
              <Stat label="Lowest payment" value={`${fmt(r.bestMonthly.monthly)}/mo`} sub={r.bestMonthly.name} />
              <Stat label="Least at closing" value={fmt(r.bestUpfront.closingCosts)} sub={r.bestUpfront.name} />
            </div>
            <Takeaway>
              Over {n(stayYears)} years,{" "}
              <strong>{r.bestOverStay.name || `Lender ${r.bestOverStay.index + 1}`}</strong> costs the
              least at {fmtK(r.bestOverStay.costOverStay)} in interest and closing costs combined.
              {r.bestOverStay.index !== r.bestMonthly.index && (
                <>
                  {" "}
                  Note it does <em>not</em> have the lowest monthly payment — that&apos;s{" "}
                  {r.bestMonthly.name || `Lender ${r.bestMonthly.index + 1}`} at {fmt(r.bestMonthly.monthly)}
                  /mo. A bigger box D usually means the rate was bought down, which only pays off if you
                  keep the loan long enough.
                </>
              )}
              {r.mixedLoans && (
                <>
                  {" "}
                  These quotes are not all for the same loan amount, so compare the rate and APR columns
                  as well as the totals.
                </>
              )}
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Quote</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Loan</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Rate</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">APR</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Payment</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Closing costs (J)</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">{n(stayYears)}-yr cost</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Lifetime cost</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.index} className={`border-b border-gray-50 ${row.index === r.bestOverStay.index ? "bg-green-50" : "hover:bg-gray-50"}`}>
                      <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                        <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ background: row.color }} />
                        {row.name || `Lender ${row.index + 1}`}
                        {row.index === r.bestOverStay.index && <span className="ml-2 text-green-700">✓ best</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900 whitespace-nowrap">
                        {fmtK(row.loanUsed)}
                        <span className="text-gray-400"> / {Math.round(row.months / 12)}yr</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{pct(n(row.rate), 3)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{pct(row.apr, 3)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmt(row.monthly)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600">{fmt(row.closingCosts)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(row.costOverStay)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{fmtK(row.totalLifetime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* The APR here is not the lender's APR and shouldn't pretend to be.
                Reg Z counts only finance charges; box totals don't say which of
                their line items qualify, so no honest split is derivable from
                the two numbers the form prints. */}
            <p className="border-t border-gray-100 bg-gray-50 px-3 py-3 text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-600">About the APR column.</strong> It uses each lender&apos;s own
              loan amount, rate and term, and treats the whole of box J — every closing cost, net of lender
              credits — as a cost of borrowing. A disclosed APR counts only <em>finance charges</em>, which
              leaves out most of box I (government fees, prepaid taxes and insurance, escrow deposits) and
              any box C service you shop for yourself. Boxes D and I don&apos;t reveal which line items those
              are, so this figure runs higher than the APR on the form. It ranks quotes on equal terms; it
              does not reproduce a disclosure.
            </p>
          </div>

          <ChartCard title={`Total cost over ${n(stayYears)} years`}>
            <BarChart
              ariaLabel="Interest and closing costs paid by each lender over the period you keep the loan"
              height={220}
              bars={r.rows.map((row) => ({
                label: row.name || `Lender ${row.index + 1}`,
                segments: [
                  { label: "Interest", value: row.interestOverStay, color: row.color },
                  { label: "Closing costs", value: Math.max(0, row.closingCosts), color: COLORS.gray },
                ],
              }))}
            />
          </ChartCard>

          <ChartCard title="Where the cheaper rate overtakes the lower costs">
            <LineChart
              ariaLabel="Cumulative interest and closing costs for each quote over the life of the loan"
              periodsPerYear={2}
              series={r.curves}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Each line starts at that lender&apos;s total closing costs and climbs with interest. A quote
                that starts higher but rises more slowly wins eventually — the question is whether you keep
                the loan past the crossing point.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter a loan amount, a term, and at least one lender&apos;s rate to compare quotes.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
