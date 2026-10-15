"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, has, months, n, pct, type Num,
} from "../../components/Inputs";
import { analyze } from "../../lib/studentRefi";
import { IBR_NEW_PCT, IBR_PRIOR_PCT, POLICY_AS_OF } from "../../lib/studentLoans";

type RateType = "fixed" | "variable";

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [fedRate, setFedRate] = useState<Num>("");
  const [fedYears, setFedYears] = useState<Num>("");
  const [privRate, setPrivRate] = useState<Num>("");
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [privYears, setPrivYears] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [family, setFamily] = useState<Num>("");
  const [forgiveness, setForgiveness] = useState(false);

  const loadExample = () => {
    setBalance(60000); setFedRate(6.5); setFedYears(10); setPrivRate(4.5); setRateType("fixed"); setPrivYears(10);
    setIncome(60000); setFamily(1); setForgiveness(false);
  };

  const clearExample = () => {
    for (const f of [setBalance, setFedRate, setFedYears, setPrivRate, setPrivYears, setIncome, setFamily]) f("");
    setRateType("fixed");
    setForgiveness(false);
  };

  const r = useMemo(() => {
    if (!(n(balance) > 0) || !has(fedRate) || !(n(fedYears) > 0) || !has(privRate) || !(n(privYears) > 0)) return null;
    return analyze({
      balance: n(balance),
      federalRate: n(fedRate),
      federalMonths: n(fedYears) * 12,
      privateRate: n(privRate),
      privateMonths: n(privYears) * 12,
      agi: n(income) > 0 ? n(income) : null,
      familySize: n(family) > 0 ? n(family) : 1,
      forgiveness,
    });
  }, [balance, fedRate, fedYears, privRate, privYears, income, family, forgiveness]);

  return (
    <CalcShell
      slug="student-loan-refinance"
      intro="Refinancing federal student loans with a private lender can lower the rate. It also moves the debt out of the federal program for good, and with it the income-driven plans, forgiveness, and the deferment, forbearance and discharge protections. See what the rate saves, and what it costs."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["student-loan-repayment", "debt-consolidation", "debt-to-income", "blended-interest-rate"]}
      disclaimer={`For educational purposes only. Federal income-driven payments use the plans calculator's rules as of ${POLICY_AS_OF} and assume a single filer, with dependents equal to your family size less one; your servicer's figure is the one that counts. Private lenders set their own rates, terms and protections. Check every offer's terms before refinancing.`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your federal loans" className="h-full">
          <div className="space-y-4">
            <NumField label="Federal loan balance" value={balance} onChange={setBalance} min={0} placeholder="60000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Federal rate" value={fedRate} onChange={setFedRate} min={0} placeholder="6.5" suffix="%" step={0.125} hint="The weighted average, if you have several loans." />
              <NumField label="Years left" value={fedYears} onChange={setFedYears} min={0} placeholder="10" suffix="yrs" />
            </div>
            <Toggle checked={forgiveness} onChange={setForgiveness} label="Pursuing forgiveness">
              I am pursuing Public Service Loan Forgiveness or another federal forgiveness program
            </Toggle>
          </div>
        </Card>
        <Card title="The private offer" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Refinance rate" value={privRate} onChange={setPrivRate} min={0} placeholder="4.5" suffix="%" step={0.125} />
              <NumField label="Refinance term" value={privYears} onChange={setPrivYears} min={0} placeholder="10" suffix="yrs" />
            </div>
            <SelectField
              label="Rate type"
              value={rateType}
              onChange={(v) => setRateType(v as RateType)}
              options={[{ value: "fixed", label: "Fixed" }, { value: "variable", label: "Variable" }]}
              hint={rateType === "variable" ? "A variable rate can rise above the federal fixed rate; the figures below assume it never moves." : undefined}
            />
          </div>
        </Card>
      </div>
      <Card title="For the income-driven comparison (optional)" className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Adjusted gross income" value={income} onChange={setIncome} min={0} placeholder="60000" prefix="$" />
          <NumField label="Family size" value={family} onChange={setFamily} min={1} placeholder="1" hint="You, plus anyone you support." />
        </div>
      </Card>

      {r ? (
        <>
          {r.forgivenessWarning && (
            <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">Refinancing would end your forgiveness path</p>
              <p className="text-xs text-red-800 leading-relaxed">
                Public Service Loan Forgiveness covers only federal Direct Loans, and a private refinance loan is not one. The
                CFPB: if you refinance into a private loan, you will no longer be eligible for federal loan forgiveness
                programs, and the refinancing cannot be reversed. The refinanced loans leave the program, and with them the
                progress you have made toward forgiveness{r.interestSaved > 0 ? `, whatever the ${fmt(r.interestSaved)} of interest saved below` : ""}.
              </p>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={r.interestSaved >= 0 ? "Interest saved by refinancing" : "Extra interest from refinancing"}
              value={fmt(Math.abs(r.interestSaved))}
              tone={r.interestSaved > 0 && !r.forgivenessWarning ? "green" : "gray"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Federal payment" value={`${fmt(r.federal.monthly)}/mo`} sub={`${fmt(r.federal.totalInterest)} interest over ${months(r.federal.months)}`} />
              <Stat label="Refinanced payment" value={`${fmt(r.refinanced.monthly)}/mo`} sub={`${fmt(r.refinanced.totalInterest)} interest over ${months(r.refinanced.months)}`} />
              <Stat label="Payment change" value={`${r.paymentChange >= 0 ? "+" : "−"}${fmt(Math.abs(r.paymentChange))}/mo`} tone={r.paymentChange <= 0 ? "green" : "amber"} />
              <Stat label="Rates" value={`${pct(n(fedRate), 2)} → ${pct(n(privRate), 2)}`} sub={rateType === "variable" ? "private rate variable" : "both fixed"} />
            </div>
            {r.idr && (
              <Takeaway tone="blue">
                On {fmt(n(income))} of income, the federal income-driven plans would ask about{" "}
                <strong>{fmt(r.idr.rap)}/mo</strong> under RAP, or {fmt(r.idr.ibrNew)} under IBR at {IBR_NEW_PCT}% (
                {fmt(r.idr.ibrPrior)} at {IBR_PRIOR_PCT}% for older borrowers). That payment moves with your income; a
                private loan&apos;s does not. The{" "}
                <Link href="/calculators/student-loan-repayment" className="underline">student loan plans calculator</Link> runs
                each plan in full.
              </Takeaway>
            )}
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your federal balance, rate and years left, and the private offer.</EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">What refinancing gives up</h2>
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <p>
            <strong>Income-driven repayment.</strong> Federal loans can be repaid as a share of income, which falls if your
            income does. A private loan&apos;s payment is fixed by its terms.
          </p>
          <p>
            <strong>Forgiveness, including PSLF.</strong> Public Service Loan Forgiveness forgives Direct Loans after 120
            qualifying payments in public service; it does not apply to private loans, nor do other federal forgiveness
            programs.
          </p>
          <p>
            <strong>Deferment and forbearance.</strong> Federal loans can be paused in hardship on federal terms. Some
            private lenders offer forbearance, on their own terms.
          </p>
          <p>
            <strong>Discharge.</strong> Federal loans are discharged on death or permanent disability. Many, but not all,
            private lenders offer something similar.
          </p>
          <p>
            <strong>It cannot be undone.</strong> Once federal loans are paid off by a private lender, they cannot be moved
            back into the federal program. Private lenders set their own rates and terms, based on your credit, and a
            variable rate can rise.
          </p>
          <p>
            Refinancing is not the same as a federal Direct Consolidation Loan, which combines federal loans and keeps them
            federal.
          </p>
        </div>
      </div>
    </CalcShell>
  );
}
