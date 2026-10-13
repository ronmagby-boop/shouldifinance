"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, RangeField, Headline, Stat, Takeaway, EmptyState,
  fmt, pct, has, n, type Num,
} from "../../components/Inputs";
import {
  FHA_STUDENT_ZERO_PCT, FNMA_STUDENT_DEFERRED_PCT, PROGRAMS, PROGRAM_LABEL, REGIONS, REGION_LABEL, REGION_STATES,
  VA_DTI, VA_MAINTENANCE_PER_SQFT, VA_MILITARY_REDUCTION_PCT, VA_RESIDUAL_BENCHMARK_PCT, VA_RESIDUAL_LOW_BAND_MAX,
  VA_RESIDUAL_MAX_FAMILY, VA_STUDENT_ANNUAL_PCT, VA_STUDENT_DEFERRAL_MONTHS,
  maxHousingPayment, programRow, ratio, studentLoanPayment, vaResidual, vaRoundedRatio,
  type Program, type Region, type StudentLoan, type StudentLoanStatus,
} from "../../lib/dti";

type LoanRow = { balance: Num; payment: Num; status: StudentLoanStatus; deferredPast: boolean; statement: boolean };
const blankLoan = (): LoanRow => ({ balance: "", payment: "", status: "repaying", deferredPast: false, statement: false });
const MAX_LOANS = 4;

const STATUS_OPTIONS: { value: StudentLoanStatus; label: string }[] = [
  { value: "repaying", label: "Repaying" },
  { value: "idr-zero", label: "Income-driven plan, $0 payment" },
  { value: "deferred", label: "Deferred or in forbearance" },
];

/** How each program reaches its student loan figure, for the per-program table. */
const RULE: Record<Program, string> = {
  conventional: `The reported payment; a documented income-driven $0 counts as $0; deferred or in forbearance, ${FNMA_STUDENT_DEFERRED_PCT}% of the balance or a documented fully amortizing payment.`,
  fha: `The reported or documented payment when above zero; otherwise ${FHA_STUDENT_ZERO_PCT}% of the balance, whatever the status.`,
  va: `Nothing if deferred at least ${VA_STUDENT_DEFERRAL_MONTHS} months past closing; otherwise ${VA_STUDENT_ANNUAL_PCT}% of the balance ÷ 12, or the reported payment if higher, or a lower one documented by the servicer.`,
  usda: "USDA's handbook rule is not shown: check with your lender. Its ratio here uses the payment you entered.",
};

const TONE = { within: "text-green-700", stretch: "text-amber-700", above: "text-red-600" } as const;

export default function Calculator() {
  const [borrower, setBorrower] = useState<Num>("");
  const [coBorrower, setCoBorrower] = useState<Num>("");
  const [otherIncome, setOtherIncome] = useState<Num>("");

  const [pi, setPi] = useState<Num>("");
  const [taxes, setTaxes] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [hoa, setHoa] = useState<Num>("");
  const [mi, setMi] = useState<Num>("");

  const [car, setCar] = useState<Num>("");
  const [cards, setCards] = useState<Num>("");
  const [personal, setPersonal] = useState<Num>("");
  const [support, setSupport] = useState<Num>("");
  const [otherDebt, setOtherDebt] = useState<Num>("");

  const [loans, setLoans] = useState<LoanRow[]>([blankLoan()]);
  const [target, setTarget] = useState<Num>(36);

  const [region, setRegion] = useState<Region>("south");
  const [family, setFamily] = useState<Num>("");
  const [loanAmount, setLoanAmount] = useState<Num>("");
  const [sqft, setSqft] = useState<Num>("");
  const [fedTax, setFedTax] = useState<Num>("");
  const [stateTax, setStateTax] = useState<Num>("");
  const [fica, setFica] = useState<Num>("");
  const [retirement, setRetirement] = useState<Num>("");
  const [jobCosts, setJobCosts] = useState<Num>("");
  const [military, setMilitary] = useState(false);

  const setLoan = (i: number, patch: Partial<LoanRow>) =>
    setLoans((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const loadExample = () => {
    setBorrower(6500); setCoBorrower(2500); setOtherIncome("");
    setPi(1900); setTaxes(350); setInsurance(150); setHoa(""); setMi(100);
    setCar(450); setCards(120); setPersonal(""); setSupport(""); setOtherDebt("");
    setLoans([{ balance: 30000, payment: 0, status: "idr-zero", deferredPast: false, statement: false }]);
    setTarget(36);
    setRegion("south"); setFamily(4); setLoanAmount(320000); setSqft(1800);
    setFedTax(750); setStateTax(250); setFica(688.5); setRetirement(450); setJobCosts(400); setMilitary(false);
  };

  const clearExample = () => {
    for (const f of [setBorrower, setCoBorrower, setOtherIncome, setPi, setTaxes, setInsurance, setHoa, setMi,
      setCar, setCards, setPersonal, setSupport, setOtherDebt, setFamily, setLoanAmount, setSqft,
      setFedTax, setStateTax, setFica, setRetirement, setJobCosts]) f("");
    setLoans([blankLoan()]);
    setTarget(36);
    setRegion("south");
    setMilitary(false);
  };

  const r = useMemo(() => {
    const income = n(borrower) + n(coBorrower) + n(otherIncome);
    if (income <= 0) return null;
    const housingBeforeMi = n(pi) + n(taxes) + n(insurance) + n(hoa);
    const housing = housingBeforeMi + n(mi);
    const nonStudent = n(car) + n(cards) + n(personal) + n(support) + n(otherDebt);
    const studentLoans: StudentLoan[] = loans
      .filter((l) => n(l.balance) > 0 || n(l.payment) > 0)
      .map((l) => ({
        balance: n(l.balance), payment: n(l.payment), status: l.status,
        deferredPastTwelveMonths: l.deferredPast, servicerStatement: l.statement,
      }));
    const studentEntered = studentLoans.reduce((s, l) => s + l.payment, 0);
    const debts = nonStudent + studentEntered;
    const rows = PROGRAMS.map((p) => programRow(p, income, housingBeforeMi, n(mi), nonStudent, studentLoans));
    const vaRow = rows.find((x) => x.program === "va")!;
    const vaStudent = vaRow.studentPayment ?? studentEntered;
    const targetPct = n(target) > 0 ? n(target) : 36;

    const vaReady = n(loanAmount) > 0 && n(family) > 0;
    const va = vaReady
      ? vaResidual({
          grossIncome: income,
          federalTax: n(fedTax), stateTax: n(stateTax), socialSecurityMedicare: n(fica), retirement: n(retirement),
          housing: vaRow.housing, squareFeet: n(sqft), debts: nonStudent + vaStudent, jobRelated: n(jobCosts),
          loanAmount: n(loanAmount), region, familySize: n(family), military,
        })
      : null;

    return {
      income, housing, nonStudent, studentEntered, debts, studentLoans, rows, vaRow, targetPct,
      front: ratio(housing, income)!,
      back: ratio(housing + debts, income)!,
      maxHousing: maxHousingPayment(income, debts, targetPct),
      va,
      vaAbove41: vaRoundedRatio(vaRow.back) > VA_DTI,
    };
  }, [borrower, coBorrower, otherIncome, pi, taxes, insurance, hoa, mi, car, cards, personal, support, otherDebt,
    loans, target, region, family, loanAmount, sqft, fedTax, stateTax, fica, retirement, jobCosts, military]);

  return (
    <CalcShell
      slug="debt-to-income"
      intro="Lenders divide your monthly debts by your gross monthly income. The front-end ratio counts only the housing payment; the back-end ratio counts every debt. See both, how conventional, FHA, VA and USDA guidelines read them, and VA's residual income test."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["home-affordability", "student-loan-repayment", "debt-payoff", "debt-consolidation"]}
      disclaimer="For educational purposes only, and not a pre-approval. The program figures are guidelines from Fannie Mae's Selling Guide, HUD Handbook 4000.1, 38 CFR 36.4340 and VA Pamphlet 26-7, and 7 CFR 3555.151; automated underwriting can approve higher ratios, and lenders can apply stricter ones of their own. Your lender's figures, from your credit report and documents, are the ones that count."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Gross monthly income" badge="BEFORE TAX" className="h-full">
          <div className="space-y-4">
            <NumField label="Borrower" value={borrower} onChange={setBorrower} min={0} placeholder="6500" prefix="$" hint="Before tax and deductions." />
            <NumField label="Co-borrower" value={coBorrower} onChange={setCoBorrower} min={0} placeholder="0" prefix="$" />
            <NumField label="Other income" value={otherIncome} onChange={setOtherIncome} min={0} placeholder="0" prefix="$" hint="Income a lender can document and expects to continue: support received, benefits, a pension." />
          </div>
        </Card>
        <Card title="Proposed housing payment" badge="FRONT-END" className="h-full">
          <div className="space-y-4">
            <NumField label="Principal and interest" value={pi} onChange={setPi} min={0} placeholder="1900" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Property taxes/mo" value={taxes} onChange={setTaxes} min={0} placeholder="350" prefix="$" />
              <NumField label="Insurance/mo" value={insurance} onChange={setInsurance} min={0} placeholder="150" prefix="$" />
            </div>
            <NumField label="HOA/mo" value={hoa} onChange={setHoa} min={0} placeholder="0" prefix="$" />
            <NumField
              label="Mortgage insurance/mo"
              value={mi}
              onChange={setMi}
              min={0}
              placeholder="0"
              prefix="$"
              hint="PMI on a conventional loan, FHA's annual premium or USDA's annual fee. Counted in the conventional, FHA and USDA rows; left out of the VA row and residual income, because VA charges no monthly mortgage insurance."
            />
            <p className="text-xs text-gray-400 leading-relaxed">
              The <Link href="/calculators/mortgage-payment" className="underline">mortgage payment calculator</Link>{" "}
              works these out from a price and rate.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Other monthly debts" badge="BACK-END" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Car loans" value={car} onChange={setCar} min={0} placeholder="450" prefix="$" />
              <NumField label="Card minimums" value={cards} onChange={setCards} min={0} placeholder="120" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Personal loans" value={personal} onChange={setPersonal} min={0} placeholder="0" prefix="$" />
              <NumField label="Child support or alimony" value={support} onChange={setSupport} min={0} placeholder="0" prefix="$" />
            </div>
            <NumField label="Other debts" value={otherDebt} onChange={setOtherDebt} min={0} placeholder="0" prefix="$" hint="Leases, other mortgages, any recurring obligation on your credit report. An installment debt with ten or fewer payments left may be left out unless the payment is large." />
          </div>
        </Card>
        <Card title="Student loans" badge="EACH PROGRAM DIFFERS" badgeTone="amber" className="h-full">
          <div className="space-y-5">
            {loans.map((l, i) => (
              <div key={i} className={i > 0 ? "border-t border-gray-100 pt-4 space-y-3" : "space-y-3"}>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label={`Loan ${i + 1} balance`} value={l.balance} onChange={(v) => setLoan(i, { balance: v })} min={0} placeholder="30000" prefix="$" />
                  <NumField label={`Loan ${i + 1} payment`} value={l.payment} onChange={(v) => setLoan(i, { payment: v })} min={0} placeholder="0" prefix="$" />
                </div>
                <SelectField
                  label={`Loan ${i + 1} status`}
                  value={l.status}
                  onChange={(v) => setLoan(i, { status: v as StudentLoanStatus })}
                  options={STATUS_OPTIONS}
                />
                {l.status === "deferred" && (
                  <Toggle checked={l.deferredPast} onChange={(v) => setLoan(i, { deferredPast: v })} label={`Loan ${i + 1} deferred 12+ months`}>
                    I have written evidence the deferment runs at least {VA_STUDENT_DEFERRAL_MONTHS} months past closing (VA)
                  </Toggle>
                )}
                {has(l.payment) && n(l.payment) < (n(l.balance) * VA_STUDENT_ANNUAL_PCT) / 100 / 12 && (
                  <Toggle checked={l.statement} onChange={(v) => setLoan(i, { statement: v })} label={`Loan ${i + 1} servicer statement`}>
                    My servicer&apos;s statement, dated within 60 days of closing, shows this payment (VA)
                  </Toggle>
                )}
                {loans.length > 1 && (
                  <button type="button" onClick={() => setLoans((ls) => ls.filter((_, j) => j !== i))} className="text-xs text-gray-500 underline">
                    Remove loan {i + 1}
                  </button>
                )}
              </div>
            ))}
            {loans.length < MAX_LOANS && (
              <button type="button" onClick={() => setLoans((ls) => [...ls, blankLoan()])} className="text-xs text-green-700 underline">
                Add another student loan
              </button>
            )}
          </div>
        </Card>
      </div>

      <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
        <h2 className="text-sm font-medium text-gray-900 mb-2">What lenders generally don&apos;t count</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Utilities, phone and internet, groceries, and insurance other than the housing payment&apos;s (health, car, life)
          are not debts, so they stay out of the ratio. So do income taxes, retirement contributions, commuting and child
          care. They are real costs, and the ratio leaves them out: it measures debts, not your budget. VA&apos;s residual
          income test, below, is the one that counts several of them.
        </p>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Your back-end (total) ratio" value={pct(r.back, 1)} tone="gray" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Front-end (housing)" value={pct(r.front, 1)} sub={`${fmt(r.housing)} of ${fmt(r.income)}`} />
              <Stat label="Back-end (total)" value={pct(r.back, 1)} sub={`${fmt(r.housing + r.debts)} of ${fmt(r.income)}`} />
              <Stat label="Housing payment" value={fmt(r.housing)} />
              <Stat label="Other debts" value={fmt(r.debts)} sub={r.studentEntered > 0 ? `incl. ${fmt(r.studentEntered)} student loans` : undefined} />
            </div>
            <Takeaway tone="blue">
              Of every {fmt(100)} you earn before tax, {fmt(r.front)} goes to the housing payment and {fmt(r.back)} to all
              debts together. Student loans here are at the payment you entered; the comparison below counts them the way
              each program does, which can differ.
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">The most housing payment a ratio allows</h2>
            <RangeField
              label="Back-end ratio to plan for"
              value={target}
              onChange={setTarget}
              min={20}
              max={60}
              step={1}
              presets={[36, 41, 43, 50]}
            />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Stat label={`Housing payment at ${pct(r.targetPct, 0)}`} value={fmt(r.maxHousing)} sub={`${fmt(r.income)} × ${pct(r.targetPct, 0)} − ${fmt(r.debts)} of other debts`} />
              <Stat
                label="Against your proposed payment"
                value={`${r.maxHousing - r.housing >= 0 ? "+" : "−"}${fmt(Math.abs(r.maxHousing - r.housing))}`}
                tone={r.maxHousing >= r.housing ? "green" : "red"}
                sub={r.maxHousing >= r.housing ? "room left at this ratio" : "over this ratio"}
              />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mt-3">
              Each {fmt(100)} a month of other debt you clear adds {fmt(100)} to this figure. The{" "}
              <Link href="/calculators/home-affordability" className="underline">home affordability calculator</Link>{" "}
              turns a housing payment into a price.
            </p>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">How each program&apos;s guideline reads your ratios</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Guidelines, not limits: automated underwriting can approve higher ratios, and a lender can set stricter ones.
              Each row counts student loans by that program&apos;s rule.
            </p>
            <div className="space-y-3">
              {r.rows.map((row) => (
                <div key={row.program} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                    <p className="text-sm font-medium text-gray-900">{PROGRAM_LABEL[row.program]}</p>
                    <p className="text-sm tabular-nums text-gray-900">
                      {pct(row.front, 1)} housing · {pct(row.back, 1)} total
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-1">Guideline: {row.guideline}</p>
                  <p className={`text-xs leading-relaxed ${TONE[row.standing]}`}>{row.verdict}</p>
                  {r.studentLoans.length > 0 && (
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Student loans counted:{" "}
                      {row.studentPayment === null ? "not shown: check with your lender" : `${fmt(row.studentPayment)}/mo`}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mt-3">
              FHA&apos;s higher tiers need a credit score of 580 or above; below that, or with no score, a manually underwritten
              loan may not exceed 31/43. Energy-efficient homes may have stretch ratios of 33/45. Mortgage insurance is counted
              at the amount you entered, though each program prices it differently; the VA row leaves it out.
            </p>
          </div>

          {r.studentLoans.length > 0 && (
            <div className="border border-gray-200 rounded-2xl p-5 mb-4">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Student loans, as each program counts them</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-xs text-gray-400 text-left">
                      <th className="py-2 pr-3 font-normal">Program</th>
                      {r.studentLoans.map((_, i) => (
                        <th key={i} className="py-2 pr-3 font-normal">Loan {i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  {PROGRAMS.map((p) => (
                    <tbody key={p} className="border-t border-gray-100">
                      <tr>
                        <td className="pt-2 pr-3 whitespace-nowrap">{PROGRAM_LABEL[p]}</td>
                        {r.studentLoans.map((l, i) => {
                          const v = studentLoanPayment(p, l);
                          return <td key={i} className="pt-2 pr-3 whitespace-nowrap">{v === null ? "Not shown" : `${fmt(v)}/mo`}</td>;
                        })}
                      </tr>
                      <tr>
                        <td colSpan={r.studentLoans.length + 1} className="pb-2 pt-1 text-xs text-gray-500 leading-relaxed">{RULE[p]}</td>
                      </tr>
                    </tbody>
                  ))}
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your gross monthly income to see your ratios.</EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-sm font-medium text-gray-900">VA residual income</h2>
          <span className="text-xs rounded-full px-3 py-1 whitespace-nowrap bg-blue-50 text-blue-600">38 CFR 36.4340</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          VA also asks what is left each month after taxes, the housing payment, maintenance and utilities, debts and
          job costs, and compares it with a table by region, family size and loan amount. It uses the income, housing
          payment and debts above, with student loans counted VA&apos;s way.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <SelectField
              label="Region"
              value={region}
              onChange={(v) => setRegion(v as Region)}
              options={REGIONS.map((g) => ({ value: g, label: REGION_LABEL[g] }))}
              hint={REGION_STATES[region]}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Family size" value={family} onChange={setFamily} min={1} placeholder="4" hint={`Everyone in the household; counted up to ${VA_RESIDUAL_MAX_FAMILY}.`} />
              <NumField label="Loan amount" value={loanAmount} onChange={setLoanAmount} min={0} placeholder="320000" prefix="$" hint={`$${VA_RESIDUAL_LOW_BAND_MAX.toLocaleString("en-US")} and below, or $80,000 and above.`} />
            </div>
            <NumField label="Gross living area" value={sqft} onChange={setSqft} min={0} placeholder="1800" suffix="sq ft" hint={`Maintenance and utilities at ${Math.round(VA_MAINTENANCE_PER_SQFT * 100)}¢ a square foot, from the appraisal.`} />
            <Toggle checked={military} onChange={setMilitary} label="Military reduction">
              Active duty or retired, with benefits from a nearby military base: the guideline is reduced {VA_MILITARY_REDUCTION_PCT}%
            </Toggle>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed">Monthly deductions, from the pay stub:</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Federal income tax" value={fedTax} onChange={setFedTax} min={0} placeholder="750" prefix="$" />
              <NumField label="State and local tax" value={stateTax} onChange={setStateTax} min={0} placeholder="250" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Social Security and Medicare" value={fica} onChange={setFica} min={0} placeholder="688" prefix="$" />
              <NumField label="Retirement contributions" value={retirement} onChange={setRetirement} min={0} placeholder="450" prefix="$" />
            </div>
            <NumField label="Job-related costs" value={jobCosts} onChange={setJobCosts} min={0} placeholder="400" prefix="$" hint="Child care, significant commuting costs, and other costs of working." />
          </div>
        </div>

        {r?.va ? (
          <div className="mt-5 bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <Stat label="Residual income" value={fmt(r.va.residual)} tone={r.va.meets ? "green" : "red"} />
              <Stat
                label="VA guideline"
                value={fmt(r.va.required)}
                sub={military ? `after the ${VA_MILITARY_REDUCTION_PCT}% military reduction` : `${REGION_LABEL[region]}, family of ${Math.min(n(family), VA_RESIDUAL_MAX_FAMILY)}`}
              />
              <Stat label="Taxes and retirement" value={fmt(r.va.taxes)} />
              <Stat label="Shelter" value={fmt(r.va.shelter)} sub={`incl. ${fmt(r.va.maintenance)} maintenance and utilities`} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3 tabular-nums">
              {fmt(r.income)} income − {fmt(r.va.taxes)} taxes and retirement − {fmt(r.va.shelter)} shelter −{" "}
              {fmt(r.nonStudent + (r.vaRow.studentPayment ?? r.studentEntered))} debts − {fmt(n(jobCosts))} job costs ={" "}
              <strong>{fmt(r.va.residual)}</strong>
            </p>
            <div className="space-y-2">
              <Takeaway tone={r.va.meets ? "green" : "amber"}>
                {r.va.meets
                  ? <>Residual income is {fmt(r.va.residual - r.va.required)} above VA&apos;s guideline of {fmt(r.va.required)}.</>
                  : <>Residual income is {fmt(r.va.required - r.va.residual)} below VA&apos;s guideline of {fmt(r.va.required)}. VA treats the table as a guide, though its pamphlet says an inadequate residual income alone can be a basis for disapproving a loan.</>}
              </Takeaway>
              {r.vaAbove41 && (
                <Takeaway tone={r.va.meetsBenchmark ? "green" : "amber"}>
                  Your VA ratio rounds to {vaRoundedRatio(r.vaRow.back)}%, above {VA_DTI}%. Residual income at least{" "}
                  {VA_RESIDUAL_BENCHMARK_PCT}% above the guideline, <strong>{fmt(r.va.benchmark)}</strong>, removes the need for a
                  supervisor&apos;s written justification.{" "}
                  {r.va.meetsBenchmark ? "Yours clears it." : `Yours is ${fmt(r.va.benchmark - r.va.residual)} short of it.`}
                </Takeaway>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-4">
            Add your income above, a family size and a loan amount to see residual income against VA&apos;s table.
          </p>
        )}
      </div>
    </CalcShell>
  );
}
