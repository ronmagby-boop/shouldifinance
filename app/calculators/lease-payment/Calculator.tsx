"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, DonutChart, BarChart, COLORS } from "../../components/Charts";

type TaxMethod = "monthly" | "upfront";

export default function Calculator() {
  const [msrp, setMsrp] = useState<Num>("");
  const [negotiated, setNegotiated] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [residualPct, setResidualPct] = useState<Num>("");
  const [moneyFactor, setMoneyFactor] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [tradeIn, setTradeIn] = useState<Num>("");
  const [rebates, setRebates] = useState<Num>("");
  const [fees, setFees] = useState<Num>("");
  const [acquisition, setAcquisition] = useState<Num>("");
  const [disposition, setDisposition] = useState<Num>("");
  const [taxRate, setTaxRate] = useState<Num>("");
  const [taxMethod, setTaxMethod] = useState<TaxMethod>("monthly");

  const loadExample = () => {
    setMsrp(45000);
    setNegotiated(42000);
    setTerm(36);
    setResidualPct(58);
    setMoneyFactor(0.00225);
    setDown(2500);
    setTradeIn(0);
    setRebates(1000);
    setFees(695);
    setAcquisition(895);
    setDisposition(395);
    setTaxRate(6.5);
    setTaxMethod("monthly");
  };

  const r = useMemo(() => {
    const months = Math.max(1, Math.round(n(term)));
    if (n(msrp) <= 0 || n(negotiated) <= 0) return null;

    // Residual is always a percentage of MSRP, not the negotiated price.
    const residual = (n(msrp) * n(residualPct)) / 100;

    const grossCap = n(negotiated) + n(fees) + n(acquisition);
    const capReduction = n(down) + n(tradeIn) + n(rebates);
    const adjustedCap = grossCap - capReduction;

    const depreciationFee = (adjustedCap - residual) / months;
    const rentCharge = (adjustedCap + residual) * n(moneyFactor);
    const basePayment = depreciationFee + rentCharge;

    const monthlyTax = taxMethod === "monthly" ? (basePayment * n(taxRate)) / 100 : 0;
    const upfrontTax = taxMethod === "upfront" ? (capReduction * n(taxRate)) / 100 : 0;
    const totalPayment = basePayment + monthlyTax;

    const dueAtSigning = n(down) + n(tradeIn) + upfrontTax + totalPayment;
    const totalOfPayments = totalPayment * months;
    const totalLeaseCost = totalOfPayments + n(down) + n(tradeIn) + upfrontTax + n(disposition);

    // Money factor converts to an APR by multiplying by 2400.
    const apr = n(moneyFactor) * 2400;
    const discountOffMsrp = n(msrp) - n(negotiated);

    // A payment at 0% money factor, to show what the financing costs.
    const zeroMfPayment = depreciationFee + (taxMethod === "monthly" ? (depreciationFee * n(taxRate)) / 100 : 0);

    return {
      residual,
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
  }, [msrp, negotiated, term, residualPct, moneyFactor, down, tradeIn, rebates, fees, acquisition, disposition, taxRate, taxMethod]);

  return (
    <CalcShell
      slug="lease-payment"
      category="Auto"
      eyebrow="Auto tools"
      title="Car lease payment calculator"
      crumb="Lease payment"
      intro="A lease payment is two numbers added together: depreciation and a finance charge. Once you can build it yourself, you can tell which part of a dealer's quote is negotiable — and which isn't."
      onExample={loadExample}
      relatedSlugs={["lease-vs-buy", "total-cost-of-ownership", "auto-affordability"]}
      disclaimer="For educational purposes only. Residual values and money factors are set by the leasing company and vary by model, term, and mileage allowance. Sales tax treatment on leases differs by state — some tax the monthly payment, some the full price up front. Confirm every figure on the lease agreement before signing."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The vehicle and the deal" badge="LEASE TERMS">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="MSRP" value={msrp} onChange={setMsrp} placeholder="45000" prefix="$" />
              <NumField label="Negotiated price" value={negotiated} onChange={setNegotiated} placeholder="42000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Lease term" value={term} onChange={setTerm} placeholder="36" suffix="mo" />
              <NumField
                label="Residual"
                value={residualPct}
                onChange={setResidualPct}
                placeholder="58"
                suffix="%"
                step={1}
                hint="Of MSRP, not price."
              />
            </div>
            <NumField
              label="Money factor"
              value={moneyFactor}
              onChange={setMoneyFactor}
              placeholder="0.00225"
              step={0.00001}
              hint={r ? `Equivalent to ${pct(r.apr, 2)} APR — multiply by 2,400.` : "Multiply by 2,400 to get the APR."}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Acquisition fee" value={acquisition} onChange={setAcquisition} placeholder="895" prefix="$" />
              <NumField label="Other fees" value={fees} onChange={setFees} placeholder="695" prefix="$" />
            </div>
            <NumField label="Disposition fee at turn-in" value={disposition} onChange={setDisposition} placeholder="395" prefix="$" />
          </div>
        </Card>

        <Card title="Money down and tax" badge="UP FRONT" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Cash down" value={down} onChange={setDown} placeholder="2500" prefix="$" />
              <NumField label="Trade-in value" value={tradeIn} onChange={setTradeIn} placeholder="0" prefix="$" />
            </div>
            <NumField
              label="Rebates & incentives"
              value={rebates}
              onChange={setRebates}
              placeholder="1000"
              prefix="$"
              hint="Reduce the capitalized cost just like cash down."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Sales tax" value={taxRate} onChange={setTaxRate} placeholder="6.5" suffix="%" step={0.25} />
              <SelectField
                label="Tax method"
                value={taxMethod}
                onChange={(v) => setTaxMethod(v as TaxMethod)}
                options={[
                  { value: "monthly", label: "On the payment" },
                  { value: "upfront", label: "On cap reduction" },
                ]}
              />
            </div>
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
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
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
                  is totalled in month two, it is usually gone.
                </>
              )}
            </Takeaway>
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
                At a 0.00000 money factor the same lease would cost about{" "}
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
