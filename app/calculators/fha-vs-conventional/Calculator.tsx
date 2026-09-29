"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import {
  payment,
  pmiRateForLtv,
  PMI_TERMINATION_LTV,
  FHA_UFMIP_RATE,
  FHA_MIN_DOWN_PCT,
  FHA_MIP_DURATION_CLIFF_LTV,
  fhaAnnualMipBps,
  fhaMipDurationMonths,
} from "../../lib/finance";

/**
 * FHA against conventional, decided by the insurance rather than the rate.
 *
 * Property tax, homeowners insurance and HOA dues are deliberately absent. They
 * are identical on both sides of this comparison, so including them adds the
 * same number to both totals and makes the difference — which is the answer —
 * harder to read. lease-vs-buy leaves shared costs out for the same reason.
 * The mortgage payment calculator carries them when the question is "what will
 * I actually pay each month".
 */

type Side = {
  loan: number;
  ltv: number;
  pi: number;
  insMonthly: number;
  insMonths: number;
  totalIns: number;
  cashAtClosing: number;
  paidOverHold: number;
  balanceAtEnd: number;
};

function amortiseWithInsurance(
  loan: number,
  rate: number,
  termMonths: number,
  holdMonths: number,
  /** Annual insurance as a percent of the figure the insurer charges on. */
  insAnnualPct: number,
  insMonths: number,
  /** FHA charges on the balance; conventional PMI here charges on the original loan. */
  chargeOnBalance: boolean,
  originalLoan: number,
): { pi: number; totalIns: number; paidOverHold: number; balanceAtEnd: number; firstInsMonthly: number } {
  const pi = payment(loan, rate, termMonths);
  const r = rate / 100 / 12;
  let bal = loan;
  let totalIns = 0;
  let paid = 0;
  let firstInsMonthly = 0;

  for (let m = 1; m <= holdMonths; m++) {
    const interest = bal * r;
    bal = Math.max(0, bal + interest - pi);
    const base = chargeOnBalance ? bal : originalLoan;
    const ins = m <= insMonths ? (base * insAnnualPct) / 100 / 12 : 0;
    if (m === 1) firstInsMonthly = ins;
    totalIns += ins;
    paid += pi + ins;
  }
  return { pi, totalIns, paidOverHold: paid, balanceAtEnd: bal, firstInsMonthly };
}

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [downPct, setDownPct] = useState<Num>("");
  const [fhaRate, setFhaRate] = useState<Num>("");
  const [convRate, setConvRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [hold, setHold] = useState<Num>("");
  const [financeUfmip, setFinanceUfmip] = useState("financed");

  const loadExample = () => {
    setPrice(400000);
    setDown(36000);
    setDownPct(9);
    setFhaRate(6.25);
    setConvRate(6.6);
    setTerm(30);
    setHold(10);
    setFinanceUfmip("financed");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setPrice("");
    setDown("");
    setDownPct("");
    setFhaRate("");
    setConvRate("");
    setTerm("");
    setHold("");
    setFinanceUfmip("financed");
  };

  /* The linked pair: either side rewrites the other, the same way
     mortgage-payment handles down payment and property tax. */
  const onDown = (v: Num) => {
    setDown(v);
    const P = n(price);
    setDownPct(P > 0 && v !== "" ? Number(((n(v) / P) * 100).toFixed(2)) : "");
  };
  const onDownPct = (v: Num) => {
    setDownPct(v);
    const P = n(price);
    setDown(P > 0 && v !== "" ? Math.round((P * n(v)) / 100) : "");
  };
  const onPrice = (v: Num) => {
    setPrice(v);
    const P = n(v);
    if (P > 0 && downPct !== "") setDown(Math.round((P * n(downPct)) / 100));
  };

  const r = useMemo(() => {
    const P = n(price);
    const D = n(down);
    const termMonths = n(term) * 12;
    const holdMonths = n(hold) * 12;
    if (P <= 0 || termMonths <= 0 || holdMonths <= 0 || D < 0 || D >= P) return null;

    const baseLoan = P - D;
    /* LTV excluding financed UFMIP — ML 2013-04 defines it that way, which is
       why financing the upfront premium cannot push anyone over the cliff. */
    const ltv = (baseLoan / P) * 100;
    const termYears = n(term);

    // ---- FHA
    const ufmip = (baseLoan * FHA_UFMIP_RATE) / 100;
    const fhaLoan = financeUfmip === "financed" ? baseLoan + ufmip : baseLoan;
    const mipBps = fhaAnnualMipBps(baseLoan, ltv, termYears);
    const mipMonths = fhaMipDurationMonths(ltv, termMonths);
    const fha = amortiseWithInsurance(
      fhaLoan, n(fhaRate), termMonths, holdMonths, mipBps / 100, mipMonths, true, fhaLoan,
    );
    const fhaCash = D + (financeUfmip === "financed" ? 0 : ufmip);

    // ---- Conventional
    const pmiPct = pmiRateForLtv(ltv);
    /* PMI stops when the scheduled balance reaches 78% of the original value.
       Solved by walking the schedule rather than approximated. */
    let pmiMonths = 0;
    if (pmiPct > 0) {
      const target = P * PMI_TERMINATION_LTV;
      const cr = n(convRate) / 100 / 12;
      const cpi = payment(baseLoan, n(convRate), termMonths);
      let b = baseLoan;
      for (let m = 1; m <= termMonths; m++) {
        b = Math.max(0, b + b * cr - cpi);
        pmiMonths = m;
        if (b <= target) break;
      }
    }
    const conv = amortiseWithInsurance(
      baseLoan, n(convRate), termMonths, holdMonths, pmiPct, pmiMonths, false, baseLoan,
    );

    const fhaSide: Side = {
      loan: fhaLoan, ltv, pi: fha.pi, insMonthly: fha.firstInsMonthly, insMonths: mipMonths,
      totalIns: fha.totalIns, cashAtClosing: fhaCash, paidOverHold: fha.paidOverHold,
      balanceAtEnd: fha.balanceAtEnd,
    };
    const convSide: Side = {
      loan: baseLoan, ltv, pi: conv.pi, insMonthly: conv.firstInsMonthly, insMonths: pmiMonths,
      totalIns: conv.totalIns, cashAtClosing: D, paidOverHold: conv.paidOverHold,
      balanceAtEnd: conv.balanceAtEnd,
    };

    /* Cost of the hold, net of what is still owed — a bigger loan that bought
       the same house is a cost, not a saving. */
    const fhaNet = fhaSide.paidOverHold + fhaSide.cashAtClosing + fhaSide.balanceAtEnd;
    const convNet = convSide.paidOverHold + convSide.cashAtClosing + convSide.balanceAtEnd;
    const diff = fhaNet - convNet;

    /* The cliff. What would enough down payment to reach 90% do?
     *
     * Measured over the FULL TERM as well as over the hold, because over a
     * short hold the two are nearly identical and the gap looks trivial: both
     * sides pay the premium every month of a ten-year hold, and the whole
     * difference lands in years 12 to 30, when one loan has stopped paying and
     * the other has not. Reporting only the hold-period figure would bury the
     * thing this callout exists to show. */
    const overCliff = ltv > FHA_MIP_DURATION_CLIFF_LTV;
    let cliff:
      | { downNeeded: number; savedOverHold: number; savedOverTerm: number; newMipMonths: number }
      | null = null;
    if (overCliff) {
      const downFor90 = P * (1 - FHA_MIP_DURATION_CLIFF_LTV / 100);
      const extraDown = downFor90 - D;
      const baseLoan90 = P - downFor90;
      const ufmip90 = (baseLoan90 * FHA_UFMIP_RATE) / 100;
      const loan90 = financeUfmip === "financed" ? baseLoan90 + ufmip90 : baseLoan90;
      const bps90 = fhaAnnualMipBps(baseLoan90, FHA_MIP_DURATION_CLIFF_LTV, termYears);
      const months90 = fhaMipDurationMonths(FHA_MIP_DURATION_CLIFF_LTV, termMonths);
      const at90Hold = amortiseWithInsurance(
        loan90, n(fhaRate), termMonths, holdMonths, bps90 / 100, months90, true, loan90,
      );
      const at90Term = amortiseWithInsurance(
        loan90, n(fhaRate), termMonths, termMonths, bps90 / 100, months90, true, loan90,
      );
      const nowTerm = amortiseWithInsurance(
        fhaLoan, n(fhaRate), termMonths, termMonths, mipBps / 100, mipMonths, true, fhaLoan,
      );
      cliff = {
        downNeeded: extraDown,
        savedOverHold: fha.totalIns - at90Hold.totalIns,
        savedOverTerm: nowTerm.totalIns - at90Term.totalIns,
        newMipMonths: months90,
      };
    }

    const belowMinDown = (D / P) * 100 < FHA_MIN_DOWN_PCT;

    return {
      P, D, ltv, baseLoan, ufmip, mipBps, fha: fhaSide, conv: convSide,
      fhaNet, convNet, diff, cliff, overCliff, belowMinDown, pmiPct, holdMonths,
    };
  }, [price, down, term, hold, fhaRate, convRate, financeUfmip]);

  const cheaper = r ? (r.diff < 0 ? "FHA" : "Conventional") : "";

  return (
    <CalcShell
      slug="fha-vs-conventional"
      intro="FHA usually wins on the rate and loses on the insurance. Which way it nets out depends almost entirely on one threshold — 90% loan-to-value — and on how long you keep the loan."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["va-vs-conventional", "mortgage-payment", "buy-now-or-save", "home-affordability"]}
      disclaimer="For educational purposes only and not a commitment to lend. FHA premiums follow HUD's published schedule; the conventional PMI figures are representative bands, not a quote, and a real premium also depends on your credit score and the insurer. Property tax, homeowners insurance and HOA dues are left out because they are the same on both sides. Assumes a fixed rate, a purchase, and scheduled payments only."
    >
      <Card title="The house" badge="BOTH LOANS" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="Home price" value={price} onChange={onPrice} min={0} placeholder="400000" prefix="$" />
          <NumField label="Down payment" value={down} onChange={onDown} min={0} placeholder="36000" prefix="$" />
          <NumField label="Down payment %" value={downPct} onChange={onDownPct} min={0} placeholder="9" suffix="%" step={0.1} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <NumField label="Loan term" value={term} onChange={setTerm} min={0} placeholder="30" suffix="yrs" />
          <NumField label="Years you'll keep it" value={hold} onChange={setHold} min={0} placeholder="10" suffix="yrs" />
          <div className="flex flex-col justify-end">
            <span className="block text-xs font-medium text-gray-500 mb-1">Loan-to-value</span>
            <div className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-900 min-h-11 flex items-center">
              {r ? `${r.ltv.toFixed(2)}%` : "—"}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="FHA" badge="HUD SCHEDULE">
          <NumField label="FHA rate" value={fhaRate} onChange={setFhaRate} min={0} placeholder="6.25" suffix="%" step={0.05} />
          <div className="mt-3">
            <SelectField
              label={`Upfront MIP (${FHA_UFMIP_RATE}%)`}
              value={financeUfmip}
              onChange={setFinanceUfmip}
              options={[
                { value: "financed", label: "Financed into the loan" },
                { value: "closing", label: "Paid at closing" },
              ]}
            />
          </div>
        </Card>

        <Card title="Conventional" badge="PMI">
          <NumField label="Conventional rate" value={convRate} onChange={setConvRate} min={0} placeholder="6.6" suffix="%" step={0.05} />
          <p className="text-xs text-gray-500 leading-relaxed mt-3">
            PMI is priced from your loan-to-value and stops automatically at{" "}
            {Math.round(PMI_TERMINATION_LTV * 100)}% of the original price. You can ask for it at
            80%, which arrives earlier.
          </p>
        </Card>
      </div>

      {!r ? (
        <EmptyState>
          Enter a price, a down payment, both rates, the loan term and how long you expect to keep
          it.
        </EmptyState>
      ) : (
        <>
          {r.cliff && (
            <div className="border-2 border-amber-300 bg-amber-50 rounded-2xl p-4 md:p-5 mb-4">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1.5">
                You are above 90% loan-to-value
              </p>
              <p className="text-lg md:text-xl font-extrabold text-amber-900 leading-snug mb-2">
                {fmt(r.cliff.downNeeded)} more down would end the FHA premium after{" "}
                {Math.round(r.cliff.newMipMonths / 12)} years instead of never, saving{" "}
                {fmt(r.cliff.savedOverTerm)} over the life of the loan.
              </p>
              <p className="text-sm text-amber-900/90 leading-relaxed">
                At {r.ltv.toFixed(2)}% the annual premium runs for the whole term — there is no
                balance at which it stops, because the 78% rule is a conventional one. At 90% or
                below it runs {Math.round(r.cliff.newMipMonths / 12)} years and ends. The rate is
                identical on both sides of the line; only the duration changes.
              </p>
              <p className="text-sm text-amber-900/90 leading-relaxed mt-2">
                Over your {n(hold)}-year hold the difference is only{" "}
                {fmt(r.cliff.savedOverHold)}, because both loans are still paying the premium every
                month of it. The gap opens in year{" "}
                {Math.round(r.cliff.newMipMonths / 12) + 1} and runs to the end of the term — so
                this matters in proportion to how long you actually keep the loan.
              </p>
            </div>
          )}

          <Headline
            label={`Over ${n(hold)} years, ${cheaper} costs less by`}
            value={fmt(Math.abs(r.diff))}
            tone="green"
          />
          <p className="text-sm text-gray-500 leading-relaxed mt-2 mb-4">
            Counting the cash at closing, every payment made, and the balance still owed at the
            end — so a bigger loan that bought the same house shows up as a cost rather than a
            saving.
          </p>

          {r.belowMinDown && (
            <Takeaway tone="amber">
              That down payment is under FHA&rsquo;s {FHA_MIN_DOWN_PCT}% minimum, which needs a
              decision credit score of 580 or above. Between 500 and 579 the cap is 10% down — which
              lands on the better side of the 90% line, so the lowest-scoring FHA borrowers get the
              11-year premium rather than the lifetime one.
            </Takeaway>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Card title="FHA" badge={`${r.mipBps} BPS`}>
              <div className="space-y-2">
                <Stat label="Principal & interest" value={fmt(r.fha.pi)} sub="per month" />
                <Stat label="Mortgage insurance" value={fmt(r.fha.insMonthly)} sub="first month, then falls with the balance" />
                <Stat label="Insurance runs for"
                  value={r.fha.insMonths >= 360 ? "The full term" : `${Math.round(r.fha.insMonths / 12)} years`}
                  tone={r.overCliff ? "amber" : "green"} />
                <Stat label={`Insurance paid over ${n(hold)} yrs`} value={fmt(r.fha.totalIns)} tone="amber" />
                <Stat label="Cash at closing" value={fmt(r.fha.cashAtClosing)} />
                <Stat label="Loan amount" value={fmt(r.fha.loan)} sub={financeUfmip === "financed" ? `includes ${fmt(r.ufmip)} upfront MIP` : "upfront MIP paid separately"} />
              </div>
            </Card>

            <Card title="Conventional" badge={r.pmiPct > 0 ? `${r.pmiPct}% PMI` : "NO PMI"}>
              <div className="space-y-2">
                <Stat label="Principal & interest" value={fmt(r.conv.pi)} sub="per month" />
                <Stat label="Mortgage insurance" value={fmt(r.conv.insMonthly)} sub={r.pmiPct > 0 ? "per month until it stops" : "none at 80% or below"} />
                <Stat label="Insurance runs for"
                  value={r.conv.insMonths === 0 ? "None" : `${Math.round(r.conv.insMonths / 12)} years`}
                  tone="green" />
                <Stat label={`Insurance paid over ${n(hold)} yrs`} value={fmt(r.conv.totalIns)} tone="amber" />
                <Stat label="Cash at closing" value={fmt(r.conv.cashAtClosing)} />
                <Stat label="Loan amount" value={fmt(r.conv.loan)} sub="no upfront premium" />
              </div>
            </Card>
          </div>

          <div className="mt-4">
          <ChartCard
            title="Mortgage insurance paid over the hold"
            footnote="The FHA bar includes the upfront premium, which is charged once whether it is financed or paid at closing."
          >
            <BarChart
              ariaLabel="Mortgage insurance paid on an FHA loan compared with a conventional loan"
              valueFormat={fmtK}
              bars={[
                {
                  label: "FHA",
                  segments: [
                    { label: "Upfront MIP", value: r.ufmip, color: COLORS.purple },
                    { label: "Annual MIP", value: r.fha.totalIns, color: COLORS.amber },
                  ],
                },
                {
                  label: "Conventional",
                  segments: [{ label: "PMI", value: r.conv.totalIns, color: COLORS.green }],
                },
              ]}
            />
          </ChartCard>
          </div>

          <Takeaway tone={r.diff < 0 ? "green" : "blue"}>
            Over {n(hold)} years the insurance alone costs {fmt(r.fha.totalIns)} on the FHA loan and{" "}
            {fmt(r.conv.totalIns)} on the conventional one — a gap of{" "}
            {fmt(Math.abs(r.fha.totalIns - r.conv.totalIns))}.{" "}
            {r.overCliff
              ? "Above 90% loan-to-value the FHA premium never comes off, so the longer you hold the loan the further behind it falls. Refinancing out is the only exit, and that is a rate bet rather than a plan."
              : "At or below 90% the FHA premium ends after 11 years, which is what makes this a real comparison rather than a foregone conclusion."}
          </Takeaway>
        </>
      )}
    </CalcShell>
  );
}
