"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";
import {
  POLICY_AS_OF, NEW_LOAN_CUTOFF, LEGACY_PLAN_SUNSET,
  RAP_MIN_PAYMENT, RAP_PRINCIPAL_MATCH, RAP_FORGIVE_MONTHS,
  RAP_DEPENDENT_DEDUCTION, rapMonthlyPayment, rapBandLabel,
  standardTermYears, standardTierLabel,
  IBR_NEW_PCT, IBR_NEW_FORGIVE_MONTHS, IBR_PRIOR_PCT, IBR_PRIOR_FORGIVE_MONTHS,
  IBR_NEW_BORROWER_FROM, IBR_POVERTY_MULTIPLE,
  FPL_YEAR, povertyLine,
  FILING_OPTIONS, householdAgi, type FilingStatus,
  SPOUSAL_DEBT_NOTE, RAP_DEPENDENTS_SEPARATE_NOTE, FILING_SEPARATELY_TAX_WARNING,
  IDR_FORGIVENESS_TAXABLE, IDR_FORGIVENESS_TAX_NOTE,
} from "../../lib/studentLoans";

type Disbursed = "before" | "after";

type Plan = {
  name: string;
  monthly: number;
  months: number;
  interest: number;
  total: number;
  forgiven: number;
  balances: number[];
  color: string;
  dash?: number[];
};

export default function Calculator() {
  /** Which plans the borrower may choose comes first — it decides the rest. */
  const [disbursed, setDisbursed] = useState<Disbursed>("before");
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [filing, setFiling] = useState<FilingStatus>("single");
  const [spouseIncome, setSpouseIncome] = useState<Num>("");
  const [incomeGrowth, setIncomeGrowth] = useState<Num>("");
  const [familySize, setFamilySize] = useState<Num>("");
  const [dependents, setDependents] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");

  const loadExample = () => {
    setDisbursed("before");
    setBalance(52000);
    setRate(6.2);
    setIncome(68000);
    setIncomeGrowth(3);
    setFamilySize(1);
    setDependents(0);
    setExtra(150);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setDisbursed("before");
    setBalance("");
    setRate("");
    setIncome("");
    setIncomeGrowth("");
    setFamilySize("");
    setDependents("");
    setExtra("");
  };

  const newBorrower = disbursed === "after";

  /* Whose income counts. Joint adds the spouse's; separate excludes it, under
     20 U.S.C. 1087e for RAP and 1098e(d) for IBR. Single has no spouse to add.
     Computed here rather than inside the memo so the RAP band shown beside the
     inputs is read off the same figure the payment is. */
  const agi = householdAgi(filing, n(income), n(spouseIncome));

  const r = useMemo(() => {
    const bal = n(balance);
    if (bal <= 0 || n(rate) < 0) return null;
    const monthlyRate = n(rate) / 100 / 12;

    /* ---- Standard. Ten years on old loans; balance-tiered on new ones. ---- */
    const stdYears = newBorrower ? standardTermYears(bal) : 10;
    const stdMonths = stdYears * 12;
    const standardPayment = payment(bal, n(rate), stdMonths);
    const standard = amortize(bal, n(rate), stdMonths);
    const withExtra = amortize(bal, n(rate), stdMonths, n(extra), standardPayment);

    /* ---- Extended, legacy borrowers only. ---- */
    const extendedPayment = payment(bal, n(rate), 300);
    const extended = amortize(bal, n(rate), 300);

    /* ---- IBR: a percentage of income above 150% of the guideline. ---- */
    const poverty = povertyLine(n(familySize));
    const discretionary = Math.max(0, agi - poverty * IBR_POVERTY_MULTIPLE);

    const runIbr = (pctOfDiscretionary: number, forgiveAt: number) => {
      const balances: number[] = [bal];
      let b = bal;
      let interestTotal = 0;
      let paid = 0;
      let inc = agi;
      let pmt = ((Math.max(0, inc - poverty * IBR_POVERTY_MULTIPLE) * pctOfDiscretionary) / 100) / 12;
      const startPayment = pmt;
      let monthsTaken = 0;
      for (let m = 1; m <= forgiveAt; m++) {
        if (m > 1 && (m - 1) % 12 === 0) {
          inc *= 1 + n(incomeGrowth) / 100;
          pmt = ((Math.max(0, inc - poverty * IBR_POVERTY_MULTIPLE) * pctOfDiscretionary) / 100) / 12;
        }
        const interest = b * monthlyRate;
        interestTotal += interest;
        const applied = Math.min(pmt, b + interest);
        paid += applied;
        b = b + interest - applied;
        balances.push(Math.max(0, b));
        monthsTaken = m;
        if (b <= 0.01) {
          b = 0;
          break;
        }
      }
      return {
        startPayment, months: monthsTaken, interest: interestTotal,
        paid, forgiven: b > 0.01 ? b : 0, balances,
      };
    };

    const ibr = runIbr(IBR_NEW_PCT, IBR_NEW_FORGIVE_MONTHS);
    const ibrPrior = runIbr(IBR_PRIOR_PCT, IBR_PRIOR_FORGIVE_MONTHS);

    /* ---- RAP. ----------------------------------------------------------
     * Two subsidies sit inside the loop rather than being bolted onto the
     * monthly payment, because both change the balance path and therefore the
     * total cost: unpaid interest is waived instead of accruing, and a month
     * that retires less than $50 of principal is topped up to $50.
     */
    const rapBalances: number[] = [bal];
    let rb = bal;
    let rapPaid = 0;
    let rapInterestPaid = 0;
    let rapWaived = 0;
    let rapMatched = 0;
    let rapIncome = agi;
    let rapPmt = rapMonthlyPayment(rapIncome, n(dependents));
    const rapStartPayment = rapPmt;
    let rapMonths = 0;
    for (let m = 1; m <= RAP_FORGIVE_MONTHS; m++) {
      if (m > 1 && (m - 1) % 12 === 0) {
        rapIncome *= 1 + n(incomeGrowth) / 100;
        rapPmt = rapMonthlyPayment(rapIncome, n(dependents));
      }
      const interest = rb * monthlyRate;
      const due = Math.min(rapPmt, rb + interest);
      const interestPaid = Math.min(due, interest);
      rapWaived += interest - interestPaid;
      rapInterestPaid += interestPaid;
      rapPaid += due;
      const principalPart = due - interestPaid;
      // Top-up only as far as the balance actually goes.
      const match = principalPart < RAP_PRINCIPAL_MATCH
        ? Math.max(0, Math.min(RAP_PRINCIPAL_MATCH - principalPart, rb - principalPart))
        : 0;
      rapMatched += match;
      rb = rb - principalPart - match;
      if (rb <= 0.01) rb = 0;
      rapBalances.push(rb);
      rapMonths = m;
      if (rb === 0) break;
    }
    const rapForgiven = rb > 0.01 ? rb : 0;

    /* ---- Assemble whichever plan set the borrower is allowed. ---------- */
    const standardName = newBorrower ? `Standard ${stdYears}-year` : "Standard 10-year";
    const plans: Plan[] = [
      {
        name: standardName,
        monthly: standardPayment,
        months: standard.payoffMonths,
        interest: standard.totalInterest,
        total: standard.totalPaid,
        forgiven: 0,
        balances: standard.balances,
        color: COLORS.green,
      },
    ];

    if (!newBorrower) {
      plans.push({
        name: "Extended 25-year",
        monthly: extendedPayment,
        months: extended.payoffMonths,
        interest: extended.totalInterest,
        total: extended.totalPaid,
        forgiven: 0,
        balances: extended.balances,
        color: COLORS.amber,
        dash: [6, 3],
      });
      plans.push({
        name: `IBR (${IBR_NEW_PCT}%)`,
        monthly: ibr.startPayment,
        months: ibr.months,
        interest: ibr.interest,
        total: ibr.paid,
        forgiven: ibr.forgiven,
        balances: ibr.balances,
        color: COLORS.blue,
        dash: [2, 3],
      });
    }

    plans.push({
      name: "RAP",
      monthly: rapStartPayment,
      months: rapMonths,
      interest: rapInterestPaid,
      total: rapPaid,
      forgiven: rapForgiven,
      balances: rapBalances,
      color: COLORS.purple,
      dash: [4, 2],
    });

    const cheapest = plans.reduce((a, b) => (b.total < a.total ? b : a));
    const lowestPayment = plans.reduce((a, b) => (b.monthly < a.monthly ? b : a));
    // Not a sum: these are alternatives, and adding their forgiveness together
    // produced a number no borrower could ever receive.
    const mostForgiven = plans.reduce((a, b) => (b.forgiven > a.forgiven ? b : a));

    return {
      plans,
      cheapest,
      lowestPayment,
      mostForgiven,
      stdYears,
      standard,
      standardName,
      standardPayment,
      withExtra,
      extraSaves: standard.totalInterest - withExtra.totalInterest,
      extraMonthsSaved: standard.payoffMonths - withExtra.payoffMonths,
      poverty,
      discretionary,
      ibr,
      ibrPrior,
      rap: {
        startPayment: rapStartPayment,
        months: rapMonths,
        paid: rapPaid,
        waived: rapWaived,
        matched: rapMatched,
        forgiven: rapForgiven,
      },
      paymentToIncome: agi > 0 ? (standardPayment / (agi / 12)) * 100 : 0,
      // Only IBR can negatively amortise. RAP cannot: the waiver takes the
      // unpaid interest off rather than adding it to the balance.
      ibrNegativeAmortization: !newBorrower && ibr.startPayment < bal * monthlyRate,
      monthlyInterest: bal * monthlyRate,
    };
  }, [balance, rate, agi, incomeGrowth, familySize, dependents, extra, newBorrower]);

  return (
    <CalcShell
      slug="student-loan-repayment"
      intro="The lowest payment and the lowest cost are almost never the same plan. Compare the plans you are actually eligible for — which now depends on when your loans were disbursed — including what gets forgiven and what that costs in interest."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-payoff", "pay-off-debt", "emergency-fund"]}
      disclaimer="For educational purposes only. Federal repayment plans, their formulas, and forgiveness timelines change with legislation and regulation — verify current terms at studentaid.gov. Income-driven plans require annual recertification. Private loans do not qualify for federal plans or forgiveness. This is not advice about your specific loans."
    >
      <Card title="When were your loans disbursed?" badge="DECIDES YOUR OPTIONS" badgeTone="blue" className="mb-4">
        <SelectField
          label={`Were any of your federal loans first disbursed on or after ${NEW_LOAN_CUTOFF}?`}
          value={disbursed}
          onChange={(v) => setDisbursed(v as Disbursed)}
          options={[
            { value: "before", label: `No — all of my loans came before ${NEW_LOAN_CUTOFF}` },
            { value: "after", label: `Yes — at least one on or after ${NEW_LOAN_CUTOFF}` },
          ]}
          hint={
            newBorrower
              ? "Only two plans are open to you: the standard plan, whose term is set by your balance, or RAP. Extended, ICR and the old income-driven plans are not available on these loans."
              : `You keep the older plan set — standard, graduated, extended and IBR — and may switch to RAP. The income-contingent plans are being wound up by ${LEGACY_PLAN_SUNSET}. SAVE no longer exists.`
          }
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your loans" badge="BALANCE">
          <div className="space-y-4">
            <NumField label="Total balance" value={balance} onChange={setBalance} min={0} placeholder="52000" prefix="$" />
            <NumField
              label="Weighted average rate"
              value={rate}
              onChange={setRate}
              min={0}
              placeholder="6.2"
              suffix="%"
              step={0.1}
              hint="If you have several loans, use the balance-weighted average."
            />
            <NumField
              label="Extra you could pay each month"
              value={extra}
              onChange={setExtra}
              min={0}
              placeholder="150"
              prefix="$"
              hint="Applied on top of the standard payment."
            />
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">{r.standardName} payment</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.standardPayment)}/mo</span>
                </div>
                {newBorrower && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-gray-400">Standard term tier</span>
                    <span className="text-sm font-medium text-gray-900">
                      {standardTierLabel(n(balance))} → {r.stdYears} yrs
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title="Your income" badge="FOR RAP AND IBR" badgeTone="blue">
          <div className="space-y-4">
            <NumField
              label="Your annual gross income"
              value={income}
              onChange={setIncome}
              min={0}
              placeholder="68000"
              prefix="$"
            />

            <SelectField
              label="Tax filing status"
              value={filing}
              onChange={(v) => setFiling(v as FilingStatus)}
              options={FILING_OPTIONS}
              hint="Both plans read your income off your tax return, so how you file decides whose income counts."
            />

            {filing === "joint" && (
              <NumField
                label="Spouse's annual gross income"
                value={spouseIncome}
                onChange={setSpouseIncome}
                min={0}
                placeholder="52000"
                prefix="$"
                hint="Filing jointly, both incomes count toward RAP and IBR."
              />
            )}

            {filing === "separate" && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-xs text-amber-900 leading-relaxed space-y-2">
                <p>
                  <strong>Your spouse&apos;s income is excluded</strong> from both plans, by statute
                  — 20 U.S.C. 1087e for RAP and 1098e(d) for IBR. {RAP_DEPENDENTS_SEPARATE_NOTE}
                </p>
                <p>{FILING_SEPARATELY_TAX_WARNING}</p>
              </div>
            )}
            <NumField
              label="Income growth/yr"
              value={incomeGrowth}
              onChange={setIncomeGrowth}
              placeholder="3"
              suffix="%"
              step={0.5}
              hint="Left unbounded — a pay cut is a real thing to model."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Dependents"
                value={dependents}
                onChange={setDependents}
                min={0}
                placeholder="0"
                hint={`RAP only. Takes ${fmt(RAP_DEPENDENT_DEDUCTION)}/mo off the payment each. Counts dependents on your return — not you.${filing === "separate" ? " Filing separately, only the ones you claim." : ""}`}
              />
              <NumField
                label="Family size"
                value={familySize}
                onChange={setFamilySize}
                min={0}
                placeholder="1"
                hint={`IBR only. Sets the poverty line your discretionary income is measured from — it includes you${filing === "joint" ? " and your spouse" : ""}.`}
              />
            </div>
            {r && (
              <>
                <div className="bg-blue-50 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-blue-700 font-medium">RAP band</span>
                    <span className="text-sm font-medium text-blue-800">{rapBandLabel(agi)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-blue-700 font-medium">Discretionary income (IBR)</span>
                    <span className="text-sm font-medium text-blue-800">{fmtK(r.discretionary)}/yr</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Standard payment as % of income</span>
                  <span className="text-sm font-medium text-gray-900">{pct(r.paymentToIncome, 1)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Plan</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Monthly</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Payoff time</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Interest</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Total paid</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Forgiven</th>
                  </tr>
                </thead>
                <tbody>
                  {r.plans.map((p) => (
                    <tr key={p.name} className={`border-b border-gray-50 ${p.name === r.cheapest.name ? "bg-green-50" : "hover:bg-gray-50"}`}>
                      <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                        <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ background: p.color }} />
                        {p.name}
                        {p.name === r.cheapest.name && <span className="ml-2 text-green-700">✓ cheapest</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmt(p.monthly)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{fmtMonths(p.months)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600">{fmtK(p.interest)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(p.total)}</td>
                      <td className="px-3 py-2.5 text-right text-green-700">{p.forgiven > 0 ? fmtK(p.forgiven) : "—"}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ background: COLORS.gray }} />
                      Standard + {fmt(n(extra))}/mo
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-900">{fmt(r.standardPayment + n(extra))}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmtMonths(r.withExtra.payoffMonths)}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600">{fmtK(r.withExtra.totalInterest)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(r.withExtra.totalPaid)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {!newBorrower && (
              /* The 10%/20-year terms belong to a "new borrower" under
                 20 U.S.C. 1098e. Nothing this page asks reveals which side of
                 that line someone is on, so both are named. */
              <p className="border-t border-gray-100 bg-gray-50 px-3 py-3 text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-600">Which IBR applies to you.</strong> The row above uses{" "}
                {IBR_NEW_PCT}% of discretionary income forgiven at{" "}
                {IBR_NEW_FORGIVE_MONTHS / 12} years, which is the formula for borrowers who first
                borrowed on or after {IBR_NEW_BORROWER_FROM}. If you had a federal loan balance before
                that date, your IBR is {IBR_PRIOR_PCT}% forgiven at {IBR_PRIOR_FORGIVE_MONTHS / 12} years
                — that works out to {fmt(r.ibrPrior.startPayment)}/mo starting out, clearing in{" "}
                {fmtMonths(r.ibrPrior.months)}
                {r.ibrPrior.forgiven > 0 ? ` with ${fmtK(r.ibrPrior.forgiven)} forgiven` : ""}. Your loan
                dates decide it, and this page does not ask for them.
              </p>
            )}
            {filing !== "single" && (
              /* Stated rather than computed. The debt half of 1098e(d) bears on
                 IBR eligibility and the standard-payment cap, neither of which
                 this page models — so it must not look like it is in the
                 figures above. See SPOUSAL_DEBT_NOTE. */
              <p className="border-t border-gray-100 bg-gray-50 px-3 py-3 text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-600">Spouses, debt and the two plans.</strong>{" "}
                {SPOUSAL_DEBT_NOTE}
              </p>
            )}
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            {/* "Cheapest overall" was not true: the Standard + extra row can beat
                every plan in the table, and it is not one of them. This ranks
                the plans, which is what the table does. */}
            <Headline label="Cheapest plan" value={r.cheapest.name} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat
                label="Total it costs"
                value={fmtK(r.cheapest.total)}
                sub={
                  r.cheapest.forgiven > 0
                    ? `out of pocket, plus ${fmtK(r.cheapest.forgiven)} forgiven and taxable`
                    : "out of pocket"
                }
                tone="green"
              />
              <Stat label="Lowest monthly payment" value={fmt(r.lowestPayment.monthly)} sub={r.lowestPayment.name} />
              <Stat
                label="Most forgiven, any plan"
                value={r.mostForgiven.forgiven > 0 ? fmtK(r.mostForgiven.forgiven) : "None"}
                sub={r.mostForgiven.forgiven > 0 ? r.mostForgiven.name : "every plan pays off first"}
                tone={r.mostForgiven.forgiven > 0 ? "green" : "default"}
              />
              <Stat
                label={`Extra ${fmt(n(extra))}/mo saves`}
                value={fmtK(r.extraSaves)}
                sub={`${fmtMonths(r.extraMonthsSaved)} sooner`}
                tone="green"
              />
            </div>
            <Takeaway tone={r.ibrNegativeAmortization ? "amber" : "green"}>
              {r.ibrNegativeAmortization ? (
                <>
                  <strong>⚠ On IBR your balance would grow.</strong> The {fmt(r.ibr.startPayment)}/mo
                  payment doesn&apos;t cover the {fmt(r.monthlyInterest)}/mo in interest, so the shortfall
                  is added to what you owe. RAP is the one plan where that cannot happen — it waives
                  unpaid interest instead of charging it, and starts at {fmt(r.rap.startPayment)}/mo here.
                </>
              ) : r.mostForgiven.forgiven > 0 ? (
                <>
                  <strong>{r.cheapest.name}</strong> costs the least of the plans at{" "}
                  {fmtK(r.cheapest.total)} out of pocket. The largest forgiveness on offer is{" "}
                  <strong>{fmtK(r.mostForgiven.forgiven)}</strong> under {r.mostForgiven.name}, which
                  lowers what leaves your pocket — but you pay for decades instead of years, and the
                  forgiven amount is taxable income in the year it lands.
                </>
              ) : (
                <>
                  Your income is high enough relative to the balance that the income-driven plans pay the
                  loan off before any forgiveness. <strong>{r.cheapest.name}</strong> costs least at{" "}
                  {fmtK(r.cheapest.total)}, and adding {fmt(n(extra))}/mo to the standard plan saves a
                  further <strong>{fmtK(r.extraSaves)}</strong>.
                </>
              )}
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <p className="text-sm font-medium text-gray-900 mb-1">What RAP does to the balance</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Two subsidies sit underneath the payment, and both change the total, not just the monthly
              figure. Unpaid interest is waived rather than added to the balance, so it never grows. And
              any month whose payment retires less than {fmt(RAP_PRINCIPAL_MATCH)} of principal is topped
              up to {fmt(RAP_PRINCIPAL_MATCH)}.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Starting payment" value={`${fmt(r.rap.startPayment)}/mo`} sub={rapBandLabel(agi)} />
              <Stat
                label="Interest waived"
                value={r.rap.waived > 0 ? fmtK(r.rap.waived) : "None"}
                sub={r.rap.waived > 0 ? "never charged to you" : "payment covers the interest"}
                tone={r.rap.waived > 0 ? "green" : "default"}
              />
              <Stat
                label="Principal matched"
                value={r.rap.matched > 0 ? fmtK(r.rap.matched) : "None"}
                sub={r.rap.matched > 0 ? "paid by the government" : `you clear over ${fmt(RAP_PRINCIPAL_MATCH)}/mo`}
                tone={r.rap.matched > 0 ? "green" : "default"}
              />
              <Stat
                label={`Forgiven at ${RAP_FORGIVE_MONTHS / 12} yrs`}
                value={r.rap.forgiven > 0 ? fmtK(r.rap.forgiven) : "Paid off first"}
                sub={r.rap.forgiven > 0 ? `after ${fmtMonths(r.rap.months)}` : fmtMonths(r.rap.months)}
                tone={r.rap.forgiven > 0 ? "green" : "default"}
              />
            </div>
            {r.rap.startPayment <= RAP_MIN_PAYMENT && (
              <p className="text-xs text-gray-500 leading-relaxed mt-3">
                That is the {fmt(RAP_MIN_PAYMENT)} floor — no RAP payment goes below it, whatever the
                income and however many dependents.
              </p>
            )}
          </div>

          {IDR_FORGIVENESS_TAXABLE && (
            <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Forgiveness is taxable again.</strong> {IDR_FORGIVENESS_TAX_NOTE} The figures above
                do not model that tax.
              </p>
            </div>
          )}

          <ChartCard title="Balance over time by plan">
            <LineChart
              ariaLabel="Loan balance over time under each repayment plan"
              periodsPerYear={12}
              series={r.plans.map((p) => ({
                label: p.name,
                color: p.color,
                data: p.balances,
                dash: p.dash,
              }))}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                A flat or rising line means the payment isn&apos;t covering the interest. The RAP line
                cannot rise — unpaid interest is waived rather than added — which is what separates it
                from the older income-driven plans.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="What each plan costs in total">
            <BarChart
              ariaLabel="Total amount paid under each repayment plan"
              height={220}
              bars={r.plans.map((p) => ({
                label: p.name,
                segments: [
                  { label: "Principal", value: Math.max(0, p.total - p.interest), color: COLORS.gray },
                  { label: "Interest", value: p.interest, color: p.color },
                ],
              }))}
            />
          </ChartCard>

          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Plan rules reflect federal law as of {POLICY_AS_OF}, following P.L. 119-21. Poverty guideline
            is the {FPL_YEAR} HHS figure for the 48 contiguous states. Repayment rules move; check
            studentaid.gov before you choose.
          </p>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your loan balance and interest rate to compare plans.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
