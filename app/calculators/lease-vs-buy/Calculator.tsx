"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [investReturn, setInvestReturn] = useState<Num>("");

  // Lease
  const [leaseDown, setLeaseDown] = useState<Num>("");
  const [leasePayment, setLeasePayment] = useState<Num>("");
  const [leaseTerm, setLeaseTerm] = useState<Num>("");
  const [leaseFees, setLeaseFees] = useState<Num>("");
  const [mileageCharge, setMileageCharge] = useState<Num>("");

  // Buy
  const [buyDown, setBuyDown] = useState<Num>("");
  const [buyRate, setBuyRate] = useState<Num>("");
  const [buyTerm, setBuyTerm] = useState<Num>("");
  const [salesTax, setSalesTax] = useState<Num>("");
  const [resaleValue, setResaleValue] = useState<Num>("");
  const [maintenance, setMaintenance] = useState<Num>("");

  const loadExample = () => {
    setPrice(42000);
    setYears(6);
    setInvestReturn(5);
    setLeaseDown(3000);
    setLeasePayment(529);
    setLeaseTerm(36);
    setLeaseFees(1095);
    setMileageCharge(0);
    setBuyDown(6000);
    setBuyRate(6.9);
    setBuyTerm(60);
    setSalesTax(6.5);
    setResaleValue(17000);
    setMaintenance(700);
  };

  const r = useMemo(() => {
    const horizon = Math.round(n(years) * 12);
    if (n(price) <= 0 || horizon <= 0) return null;

    // ---- Leasing: repeat the lease as many times as the horizon needs ----
    const leaseMonths = Math.max(1, Math.round(n(leaseTerm)));
    const leaseCycles = Math.ceil(horizon / leaseMonths);
    const leaseUpfrontEach = n(leaseDown) + n(leaseFees);
    let leaseCumulative = 0;
    const leaseCosts: number[] = [0];
    for (let m = 1; m <= horizon; m++) {
      if ((m - 1) % leaseMonths === 0) leaseCumulative += leaseUpfrontEach;
      leaseCumulative += n(leasePayment);
      if (m % leaseMonths === 0) leaseCumulative += n(mileageCharge);
      leaseCosts.push(leaseCumulative);
    }
    const leaseTotal = leaseCumulative;

    // ---- Buying: loan, maintenance, then credit back the resale value ----
    const taxAmount = (n(price) * n(salesTax)) / 100;
    const financed = Math.max(0, n(price) + taxAmount - n(buyDown));
    const loanMonths = Math.max(1, Math.round(n(buyTerm)));
    const monthlyLoan = payment(financed, n(buyRate), loanMonths);

    let buyCumulative = n(buyDown);
    const buyCosts: number[] = [0];
    const buyNet: number[] = [0];
    for (let m = 1; m <= horizon; m++) {
      if (m <= loanMonths) buyCumulative += monthlyLoan;
      buyCumulative += n(maintenance) / 12;
      buyCosts.push(buyCumulative);
      // Net of the car's current value, straight-lined to the resale figure.
      const valueNow = n(price) + (n(resaleValue) - n(price)) * Math.min(1, m / horizon);
      buyNet.push(buyCumulative - valueNow);
    }
    const buyOutOfPocket = buyCumulative;
    const buyNetCost = buyOutOfPocket - n(resaleValue);

    const totalInterest = Math.max(0, monthlyLoan * Math.min(loanMonths, horizon) - Math.min(financed, monthlyLoan * horizon));
    const leaseNetCosts = leaseCosts;

    const monthsOwnedFree = Math.max(0, horizon - loanMonths);
    const difference = leaseTotal - buyNetCost;

    return {
      leaseTotal,
      leaseCycles,
      leaseMonthly: leaseTotal / horizon,
      buyOutOfPocket,
      buyNetCost,
      buyMonthly: buyNetCost / horizon,
      monthlyLoan,
      taxAmount,
      financed,
      totalInterest,
      difference,
      leaseCosts: leaseNetCosts,
      buyNet,
      buyCosts,
      monthsOwnedFree,
      equityAtEnd: n(resaleValue),
      horizon,
    };
  }, [price, years, leaseDown, leasePayment, leaseTerm, leaseFees, mileageCharge, buyDown, buyRate, buyTerm, salesTax, resaleValue, maintenance]);

  return (
    <CalcShell
      slug="lease-vs-buy"
      intro="Leasing usually has the lower payment; buying usually has the lower cost. Compare both over the same number of years — including what the car is still worth at the end, which is the part leasing never gives you."
      onExample={loadExample}
      relatedSlugs={["lease-payment", "loan-vs-cash", "total-cost-of-ownership"]}
      disclaimer="For educational purposes only. Lease terms, residual values, money factors, and disposition fees vary by manufacturer and by month. Resale values are estimates — check current market data for the specific model. Excess mileage and wear charges can add substantially to a lease."
    >
      <Card title="The car and the timeframe" badge="SHARED" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="Vehicle price" value={price} onChange={setPrice} placeholder="42000" prefix="$" />
          <NumField
            label="Years you'll compare"
            value={years}
            onChange={setYears}
            placeholder="6"
            suffix="yrs"
            hint="Leasing repeats to fill this period."
          />
          <NumField label="Your savings return" value={investReturn} onChange={setInvestReturn} placeholder="5" suffix="%" step={0.25} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="If you lease" badge="LEASE" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Monthly payment" value={leasePayment} onChange={setLeasePayment} placeholder="529" prefix="$" />
              <NumField label="Lease term" value={leaseTerm} onChange={setLeaseTerm} placeholder="36" suffix="mo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Due at signing" value={leaseDown} onChange={setLeaseDown} placeholder="3000" prefix="$" />
              <NumField label="Fees per lease" value={leaseFees} onChange={setLeaseFees} placeholder="1095" prefix="$" />
            </div>
            <NumField
              label="Expected mileage/wear charges"
              value={mileageCharge}
              onChange={setMileageCharge}
              placeholder="0"
              prefix="$"
              hint="Charged at the end of each lease, typically $0.25/mile over the limit."
            />
            {r && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-blue-700 font-medium">Leases needed</span>
                <span className="text-sm font-medium text-blue-800">{r.leaseCycles} over {n(years)} yrs</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="If you buy" badge="PURCHASE" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Down payment" value={buyDown} onChange={setBuyDown} placeholder="6000" prefix="$" />
              <NumField label="Sales tax" value={salesTax} onChange={setSalesTax} placeholder="6.5" suffix="%" step={0.25} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Loan rate" value={buyRate} onChange={setBuyRate} placeholder="6.9" suffix="%" step={0.25} />
              <NumField label="Loan term" value={buyTerm} onChange={setBuyTerm} placeholder="60" suffix="mo" />
            </div>
            <NumField
              label={`Resale value after ${n(years) || "N"} years`}
              value={resaleValue}
              onChange={setResaleValue}
              placeholder="17000"
              prefix="$"
              hint="What you could sell it for — this is the equity leasing never gives you."
            />
            <NumField label="Maintenance & repairs/yr" value={maintenance} onChange={setMaintenance} placeholder="700" prefix="$" />
            {r && (
              <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-green-700 font-medium">Loan payment</span>
                <span className="text-sm font-medium text-green-800">{fmt(r.monthlyLoan)}/mo</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Leasing costs</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.leaseTotal)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(r.leaseMonthly)}/mo effective</p>
              </div>
              <div className={`p-4 text-center ${r.difference >= 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.difference >= 0 ? "Buying saves" : "Leasing saves"}
                </p>
                <p className="text-2xl font-medium text-white">{fmtK(Math.abs(r.difference))}</p>
                <p className="text-xs text-green-300">over {n(years)} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Buying costs</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.buyNetCost)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(r.buyMonthly)}/mo effective</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Net cost of ownership over ${n(years)} years`}
              value={fmtK(r.buyNetCost)}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Cash out of pocket buying" value={fmtK(r.buyOutOfPocket)} />
              <Stat label="Car still worth" value={fmtK(r.equityAtEnd)} tone="green" sub="yours to keep or sell" />
              <Stat label="Loan interest" value={fmt(r.totalInterest)} tone="amber" />
              <Stat
                label="Payment-free months"
                value={`${r.monthsOwnedFree} mo`}
                sub="after the loan is paid off"
                tone="green"
              />
            </div>
            <Takeaway tone={r.difference >= 0 ? "green" : "blue"}>
              {r.difference >= 0 ? (
                <>
                  <strong>Buying comes out ahead by {fmtK(r.difference)}.</strong> The car is worth{" "}
                  {fmtK(r.equityAtEnd)} at the end, and you get {r.monthsOwnedFree} months with no payment
                  at all. Leasing would require {r.leaseCycles} separate leases over this period, each with
                  its own fees.
                </>
              ) : (
                <>
                  <strong>Leasing comes out ahead by {fmtK(Math.abs(r.difference))}</strong> at these
                  numbers — usually a sign the resale value is low, the loan rate is high, or the lease is
                  subsidised. Leasing still leaves you with no car at the end, so factor in that you start
                  over each time.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Money spent over time">
            <LineChart
              ariaLabel="Cumulative cost of leasing compared with the net cost of buying over time"
              periodsPerYear={12}
              series={[
                { label: "Leasing (cumulative)", color: COLORS.blue, data: r.leaseCosts },
                { label: "Buying (net of car value)", color: COLORS.green, data: r.buyNet, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The lease line steps up at each renewal — those are the fees and the new down payment. The
                buy line counts the car&apos;s remaining value against what you&apos;ve spent, which is why
                it stays lower once the loan is paid off.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Total cost side by side">
            <BarChart
              ariaLabel="Total cost of leasing compared with buying over the comparison period"
              height={210}
              bars={[
                {
                  label: "Leasing",
                  segments: [
                    { label: "Payments", value: n(leasePayment) * r.horizon, color: COLORS.blue },
                    { label: "Fees & down payments", value: Math.max(0, r.leaseTotal - n(leasePayment) * r.horizon), color: COLORS.gray },
                  ],
                },
                {
                  label: "Buying net",
                  segments: [
                    { label: "Payments", value: Math.max(0, r.buyNetCost), color: COLORS.green },
                    { label: "Fees & down payments", value: 0, color: COLORS.gray },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter a vehicle price and how many years you want to compare.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
