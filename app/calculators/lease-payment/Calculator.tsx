"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, DonutChart, BarChart, COLORS } from "../../components/Charts";

type TaxMethod = "monthly" | "upfront";
type RateMode = "factor" | "apr";

/** A money factor times this is the equivalent annual percentage rate. */
const MF_TO_APR = 2400;

export default function Calculator() {
  const [msrp, setMsrp] = useState<Num>("");
  const [negotiated, setNegotiated] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [residualPct, setResidualPct] = useState<Num>("");
  const [moneyFactor, setMoneyFactor] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [tradeIn, setTradeIn] = useState<Num>("");
  const [tradeOwed, setTradeOwed] = useState<Num>("");
  const [rebates, setRebates] = useState<Num>("");
  const [fees, setFees] = useState<Num>("");
  const [acquisition, setAcquisition] = useState<Num>("");
  const [disposition, setDisposition] = useState<Num>("");
  const [taxRate, setTaxRate] = useState<Num>("");
  const [taxMethod, setTaxMethod] = useState<TaxMethod>("monthly");
  const [rateMode, setRateMode] = useState<RateMode>("factor");

  const loadExample = () => {
    setMsrp(45000);
    setNegotiated(42000);
    setTerm(36);
    setResidualPct(58);
    setMoneyFactor(0.00225);
    setDown(2500);
    setTradeIn(0);
    setTradeOwed(0);
    setRebates(1000);
    setFees(695);
    setAcquisition(895);
    setDisposition(395);
    setTaxRate(6.5);
    setTaxMethod("monthly");
    setRateMode("factor");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setMsrp("");
    setNegotiated("");
    setTerm("");
    setResidualPct("");
    setMoneyFactor("");
    setDown("");
    setTradeIn("");
    setTradeOwed("");
    setRebates("");
    setFees("");
    setAcquisition("");
    setDisposition("");
    setTaxRate("");
    setTaxMethod("monthly");
    setRateMode("factor");
  };

  /** The stored number means different things depending on the mode. */
  const factor = rateMode === "apr" ? n(moneyFactor) / MF_TO_APR : n(moneyFactor);

  const r = useMemo(() => {
    const months = Math.max(1, Math.round(n(term)));
    if (n(msrp) <= 0 || n(negotiated) <= 0) return null;

    // Residual is always a percentage of MSRP, not the negotiated price.
    const residual = (n(msrp) * n(residualPct)) / 100;

    /* A trade worth less than its loan does not reduce anything — the
     * shortfall is added to what is being financed, on a car you will hand
     * back. It raises the depreciation portion AND the rent charge, so it
     * costs more over the lease than the shortfall itself. */
    const tradeEquity = n(tradeIn) - n(tradeOwed);
    const negativeEquity = Math.max(0, -tradeEquity);
    const tradeCredit = Math.max(0, tradeEquity);

    const grossCap = n(negotiated) + n(fees) + n(acquisition) + negativeEquity;
    const capReduction = n(down) + tradeCredit + n(rebates);
    const adjustedCap = grossCap - capReduction;

    const depreciationFee = (adjustedCap - residual) / months;
    const rentCharge = (adjustedCap + residual) * factor;
    const basePayment = depreciationFee + rentCharge;

    /* Two genuinely different state treatments. "upfront" used to tax the cap
     * reduction alone and charge nothing monthly, which on this example came
     * to $228 of tax against the $1,258 the monthly method collects — not a
     * treatment any state actually applies. It now taxes the selling price
     * once, which is what those states do. */
    const monthlyTax = taxMethod === "monthly" ? (basePayment * n(taxRate)) / 100 : 0;
    const upfrontTax = taxMethod === "upfront" ? (n(negotiated) * n(taxRate)) / 100 : 0;
    const totalPayment = basePayment + monthlyTax;

    const dueAtSigning = n(down) + tradeCredit + upfrontTax + totalPayment;
    const totalOfPayments = totalPayment * months;
    const totalLeaseCost = totalOfPayments + n(down) + tradeCredit + upfrontTax + n(disposition);

    // Money factor converts to an APR by multiplying by 2400.
    const apr = factor * MF_TO_APR;
    const discountOffMsrp = n(msrp) - n(negotiated);

    // A payment at 0% money factor, to show what the financing costs.
    const zeroMfPayment = depreciationFee + (taxMethod === "monthly" ? (depreciationFee * n(taxRate)) / 100 : 0);

    /* A residual above what is being financed, or a cap reduction larger than
     * the car, both produce a negative payment — an answer no lease can give.
     * Named rather than printed. */
    const overCapitalised = adjustedCap < 0;
    const residualAboveCap = !overCapitalised && adjustedCap < residual;

    return {
      residual,
      negativeEquity,
      tradeCredit,
      tradeEquity,
      overCapitalised,
      residualAboveCap,
      broken: overCapitalised || residualAboveCap,
      /* What the shortfall actually costs across the lease, against its face
       * value — the part people do not expect. */
      negEqCostOverLease:
        negativeEquity > 0
          ? negativeEquity + negativeEquity * factor * months * (1 + (taxMethod === "monthly" ? n(taxRate) / 100 : 0))
          : 0,
      grossCap,
      capReduction,
      adjustedCap,
      depreciationFee,
      rentCharge,
      basePayment,
      monthlyTax,
      upfrontTax,
      totalPayment,
      dueAtSigning,
      totalOfPayments,
      totalLeaseCost,
      apr,
      discountOffMsrp,
      totalDepreciation: adjustedCap - residual,
      totalRent: rentCharge * months,
      zeroMfPayment,
      effectiveMonthly: totalLeaseCost / months,
      months,
    };
  }, [msrp, negotiated, term, residualPct, factor, down, tradeIn, tradeOwed, rebates, fees, acquisition, disposition, taxRate, taxMethod]);

  return (
    <CalcShell
      slug="lease-payment"
      intro="A lease payment is two numbers added together: depreciation and a finance charge. Once you can build it yourself, you can tell which part of a dealer's quote is negotiable — and which isn't."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["lease-vs-buy", "total-cost-of-ownership", "auto-affordability"]}
      disclaimer="For educational purposes only. Residual values and money factors are set by the leasing company and vary by model, term, and mileage allowance. Sales tax treatment on leases differs by state — some tax the monthly payment, some the full price up front. Confirm every figure on the lease agreement before signing."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The vehicle and the deal" badge="LEASE TERMS">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="MSRP" value={msrp} onChange={setMsrp} min={0} placeholder="45000" prefix="$" />
              <NumField label="Negotiated price" value={negotiated} onChange={setNegotiated} min={0} placeholder="42000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Lease term" value={term} onChange={setTerm} min={1} placeholder="36" suffix="mo" />
              <NumField
                label="Residual"
                value={residualPct}
                onChange={setResidualPct}
                min={0}
                placeholder="58"
                suffix="%"
                step={1}
                hint="Of MSRP, not price."
              />
            </div>
            {/* Dealers quote both, so the page takes both rather than making
                the reader do the division it already explains. */}
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label={rateMode === "apr" ? "Interest rate" : "Money factor"}
                value={moneyFactor}
                onChange={setMoneyFactor}
                min={0}
                placeholder={rateMode === "apr" ? "5.4" : "0.00225"}
                suffix={rateMode === "apr" ? "%" : undefined}
                step={rateMode === "apr" ? 0.1 : 0.00001}
              />
              <SelectField
                label="Quoted as"
                value={rateMode}
                onChange={(v) => {
                  const next = v as RateMode;
                  if (next !== rateMode && moneyFactor !== "") {
                    setMoneyFactor(
                      next === "apr"
                        ? Number((n(moneyFactor) * MF_TO_APR).toFixed(4))
                        : Number((n(moneyFactor) / MF_TO_APR).toFixed(6)),
                    );
                  }
                  setRateMode(next);
                }}
                options={[
                  { value: "factor", label: "Money factor" },
                  { value: "apr", label: "APR %" },
                ]}
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              {r
                ? `A money factor of ${factor.toFixed(5)} is the same as ${pct(r.apr, 2)} APR — multiply by 2,400. Switching the dropdown converts what you have already entered.`
                : "Multiply a money factor by 2,400 to get the APR, or divide an APR by 2,400 to get the factor."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Acquisition fee" value={acquisition} onChange={setAcquisition} min={0} placeholder="895" prefix="$" />
              <NumField label="Other fees" value={fees} onChange={setFees} min={0} placeholder="695" prefix="$" />
            </div>
            <NumField label="Disposition fee at turn-in" value={disposition} onChange={setDisposition} min={0} placeholder="395" prefix="$" />
          </div>
        </Card>

        <Card title="Money down and tax" badge="UP FRONT" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Cash down" value={down} onChange={setDown} min={0} placeholder="2500" prefix="$" />
              <NumField label="Rebates & incentives" value={rebates} onChange={setRebates} min={0} placeholder="1000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Trade-in value" value={tradeIn} onChange={setTradeIn} min={0} placeholder="0" prefix="$" />
              <NumField label="Still owed on it" value={tradeOwed} onChange={setTradeOwed} min={0} placeholder="0" prefix="$" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              Equity in the trade reduces the capitalized cost the way cash down does. Owe more than it
              is worth and the shortfall is added instead — financed across a car you hand back at the
              end.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Sales tax" value={taxRate} onChange={setTaxRate} min={0} placeholder="6.5" suffix="%" step={0.25} />
              <SelectField
                label="Tax method"
                value={taxMethod}
                onChange={(v) => setTaxMethod(v as TaxMethod)}
                options={[
                  { value: "monthly", label: "On the monthly payment" },
                  { value: "upfront", label: "On the price, up front" },
                ]}
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              Most states tax the monthly payment. A few — Texas and Illinois among them — tax the
              selling price once at signing instead, which moves the money into due-at-signing and takes
              it out of the payment.
            </p>
            {r && (
              <>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Residual value at turn-in</span>
                  <span className="text-sm font-medium text-gray-900">{fmtK(r.residual)}</span>
                </div>
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">Adjusted capitalized cost</span>
                  <span className="text-sm font-medium text-green-800">{fmtK(r.adjustedCap)}</span>
                </div>
                {(n(tradeIn) > 0 || n(tradeOwed) > 0) && (
                  <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.negativeEquity > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                    <span className={`text-xs font-medium ${r.negativeEquity > 0 ? "text-amber-700" : "text-gray-400"}`}>
                      {r.negativeEquity > 0 ? "Negative equity rolled in" : "Trade equity applied"}
                    </span>
                    <span className={`text-sm font-medium ${r.negativeEquity > 0 ? "text-amber-800" : "text-gray-900"}`}>
                      {fmt(r.negativeEquity > 0 ? r.negativeEquity : r.tradeCredit)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {r && r.broken ? (
        <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-red-800 mb-1">
            {r.overCapitalised
              ? "You have put down more than the lease finances"
              : "The residual is higher than the amount being financed"}
          </p>
          <p className="text-xs text-red-800 leading-relaxed">
            {r.overCapitalised ? (
              <>
                Cash, trade equity and rebates come to {fmt(r.capReduction)} against a{" "}
                {fmt(r.grossCap)} capitalized cost, which leaves nothing to finance and no payment to
                compute. Check the cash down figure.
              </>
            ) : (
              <>
                A {pct(n(residualPct), 0)} residual on a {fmt(n(msrp))} MSRP is {fmt(r.residual)}, more
                than the {fmt(r.adjustedCap)} being financed — the car would be worth more at turn-in
                than the lease is written for, so depreciation comes out negative. Check the residual
                percentage and the negotiated price.
              </>
            )}
          </p>
        </div>
      ) : r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Your monthly lease payment" value={fmt(r.totalPayment)} unit="/mo" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Depreciation portion" value={`${fmt(r.depreciationFee)}/mo`} sub="the car's lost value" />
              <Stat label="Rent charge (interest)" value={`${fmt(r.rentCharge)}/mo`} tone="amber" sub={pct(r.apr, 2) + " APR"} />
              <Stat label="Sales tax" value={`${fmt(r.monthlyTax)}/mo`} />
              <Stat label="Due at signing" value={fmt(r.dueAtSigning)} tone="amber" />
              <Stat label="Total of payments" value={fmtK(r.totalOfPayments)} />
              <Stat label="Total lease cost" value={fmtK(r.totalLeaseCost)} sub="including fees and turn-in" tone="amber" />
              <Stat label="Effective monthly cost" value={fmt(r.effectiveMonthly)} sub="everything divided by term" />
              <Stat label="Discount off MSRP" value={fmt(r.discountOffMsrp)} tone={r.discountOffMsrp > 0 ? "green" : "red"} />
            </div>
            <Takeaway>
              You&apos;re paying <strong>{fmt(r.depreciationFee)}/mo</strong> for the{" "}
              {fmtK(r.totalDepreciation)} of value the car loses, plus{" "}
              <strong>{fmt(r.rentCharge)}/mo</strong> in finance charges — a{" "}
              {pct(r.apr, 2)} APR in disguise. The negotiable parts are the price, the fees, and sometimes
              the money factor; the residual is set by the bank and cannot be moved.
              {n(down) > 0 && (
                <>
                  {" "}
                  Note that your <strong>{fmt(n(down))}</strong> down payment is not a deposit — if the car
                  is totalled in month two, it is usually gone. Gap insurance covers the difference
                  between what the insurer pays and what the lease still owes, and most leases include
                  it as standard; check the contract rather than assuming either way, because it is the
                  thing that makes that risk survivable.
                </>
              )}
            </Takeaway>
            {r.negativeEquity > 0 && (
              <div className="mt-2">
                <Takeaway tone="amber">
                  <strong>{fmt(r.negativeEquity)}</strong> of negative equity is rolled into this lease.
                  It raises the depreciation portion by{" "}
                  <strong>{fmt(r.negativeEquity / r.months)}/mo</strong> and the rent charge on top of
                  that, so across {r.months} months it costs about{" "}
                  <strong>{fmt(r.negEqCostOverLease)}</strong> — more than the shortfall itself. You are
                  financing a debt on a car you no longer have, across a car you will hand back.
                </Takeaway>
              </div>
            )}
          </div>

          <ChartCard title="What makes up the payment">
            <DonutChart
              ariaLabel="Monthly lease payment split between depreciation, rent charge, and tax"
              centerLabel="per month"
              centerValue={fmt(r.totalPayment)}
              slices={[
                { label: "Depreciation", value: r.depreciationFee, color: COLORS.green },
                { label: "Rent charge", value: r.rentCharge, color: COLORS.amber },
                { label: "Sales tax", value: r.monthlyTax, color: COLORS.gray },
              ]}
            />
          </ChartCard>

          <ChartCard title="Where your money goes over the lease">
            <BarChart
              ariaLabel="Total depreciation paid compared with total finance charges and fees over the lease"
              height={210}
              bars={[
                { label: "Depreciation", segments: [{ label: "Depreciation", value: r.totalDepreciation, color: COLORS.green }] },
                { label: "Finance charges", segments: [{ label: "Rent charge", value: r.totalRent, color: COLORS.amber }] },
                {
                  label: "Fees & tax",
                  segments: [
                    { label: "Fees", value: n(acquisition) + n(fees) + n(disposition), color: COLORS.gray },
                    { label: "Tax", value: r.monthlyTax * r.months + r.upfrontTax, color: COLORS.purple },
                  ],
                },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                At a zero money factor the same lease would cost about{" "}
                <strong>{fmt(r.zeroMfPayment)}/mo</strong>. The difference between that and{" "}
                {fmt(r.totalPayment)} is what the financing costs you — ask the dealer for the buy rate,
                since money factors are often marked up.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the MSRP and negotiated price to build the payment.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
