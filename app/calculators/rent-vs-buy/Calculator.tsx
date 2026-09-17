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
  const [down, setDown] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [tax, setTax] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [maintenance, setMaintenance] = useState<Num>("");
  const [hoa, setHoa] = useState<Num>("");
  const [appreciation, setAppreciation] = useState<Num>("");
  const [closingPct, setClosingPct] = useState<Num>("");
  const [sellingPct, setSellingPct] = useState<Num>("");
  const [rent, setRent] = useState<Num>("");
  const [rentGrowth, setRentGrowth] = useState<Num>("");
  const [rentersIns, setRentersIns] = useState<Num>("");
  const [investReturn, setInvestReturn] = useState<Num>("");
  const [years, setYears] = useState<Num>("");

  const loadExample = () => {
    setPrice(450000);
    setDown(90000);
    setRate(6.75);
    setTerm(30);
    setTax(1.2);
    setInsurance(150);
    setMaintenance(1);
    setHoa(0);
    setAppreciation(3.5);
    setClosingPct(3);
    setSellingPct(6);
    setRent(2400);
    setRentGrowth(3);
    setRentersIns(20);
    setInvestReturn(7);
    setYears(10);
  };

  const r = useMemo(() => {
    if (n(price) <= 0 || n(rent) <= 0 || n(years) <= 0) return null;

    const horizon = Math.round(n(years) * 12);
    const termMonths = Math.max(1, n(term) * 12);
    const loan = Math.max(0, n(price) - n(down));
    const pi = payment(loan, n(rate), termMonths);
    const monthlyRate = n(rate) / 100 / 12;
    const closingCosts = (n(price) * n(closingPct)) / 100;

    // Both households start with the same cash and spend the same amount on
    // housing each month. The buyer sinks the cash into the house; the renter
    // invests it. Whoever has the cheaper month invests the difference, so the
    // two paths stay directly comparable on wealth.
    let balance = loan;
    let homeValue = n(price);
    let currentRent = n(rent);
    let buyerPortfolio = 0;
    let renterPortfolio = n(down) + closingCosts;
    let buyerOutlay = n(down) + closingCosts;
    let renterOutlay = 0;
    const monthlyReturn = n(investReturn) / 100 / 12;

    const buyNet: number[] = [];
    const rentNet: number[] = [];
    let breakEvenMonth: number | null = null;

    for (let m = 1; m <= horizon; m++) {
      const interest = balance * monthlyRate;
      const principal = Math.max(0, Math.min(pi - interest, balance));
      balance = Math.max(0, balance - principal);

      const taxMo = (homeValue * n(tax)) / 100 / 12;
      const maintMo = (homeValue * n(maintenance)) / 100 / 12;
      const ownMonthly = pi + taxMo + n(insurance) + n(hoa) + maintMo;
      const rentMonthly = currentRent + n(rentersIns);
      buyerOutlay += ownMonthly;
      renterOutlay += rentMonthly;

      // Whichever household pays less that month invests the difference.
      const diff = ownMonthly - rentMonthly;
      renterPortfolio = renterPortfolio * (1 + monthlyReturn) + Math.max(0, diff);
      buyerPortfolio = buyerPortfolio * (1 + monthlyReturn) + Math.max(0, -diff);

      homeValue *= Math.pow(1 + n(appreciation) / 100, 1 / 12);
      if (m % 12 === 0) currentRent *= 1 + n(rentGrowth) / 100;

      // Wealth if you sold and settled up today.
      const sellCosts = (homeValue * n(sellingPct)) / 100;
      const buyerPosition = homeValue - sellCosts - balance + buyerPortfolio;
      const renterPosition = renterPortfolio;

      buyNet.push(buyerPosition);
      rentNet.push(renterPosition);
      if (breakEvenMonth === null && buyerPosition > renterPosition) breakEvenMonth = m;
    }

    const finalBuy = buyNet[buyNet.length - 1];
    const finalRent = rentNet[rentNet.length - 1];
    const equity = homeValue - balance;
    const invested = renterPortfolio;

    return {
      pi,
      loan,
      closingCosts,
      buyNet,
      rentNet,
      finalBuy,
      finalRent,
      advantage: finalBuy - finalRent,
      breakEvenMonth,
      homeValue,
      balance,
      equity,
      buyerOutlay,
      renterOutlay,
      finalRentPayment: currentRent,
      investedFinal: invested,
      firstMonthOwn: pi + (n(price) * n(tax)) / 100 / 12 + n(insurance) + n(hoa) + (n(price) * n(maintenance)) / 100 / 12,
    };
  }, [price, down, rate, term, tax, insurance, maintenance, hoa, appreciation, closingPct, sellingPct, rent, rentGrowth, rentersIns, investReturn, years]);

  return (
    <CalcShell
      slug="rent-vs-buy"
      intro="Buying isn't automatically better — it depends on how long you stay. This compares both paths honestly: the renter invests the down payment and any monthly difference, and the buyer pays every cost of ownership including selling."
      onExample={loadExample}
      relatedSlugs={["mortgage-payment", "home-affordability", "should-i-refinance"]}
      disclaimer="For educational purposes only. Results are highly sensitive to assumed appreciation, rent growth, and investment returns — small changes swing the answer by years. Ignores tax deductions for mortgage interest and property tax, which may favour buying if you itemize. Not a recommendation to buy or rent."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="If you buy" badge="PURCHASE" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Home price" value={price} onChange={setPrice} placeholder="450000" prefix="$" />
              <NumField label="Down payment" value={down} onChange={setDown} placeholder="90000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Interest rate" value={rate} onChange={setRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Property tax/yr" value={tax} onChange={setTax} placeholder="1.2" suffix="%" step={0.1} />
              <NumField label="Maintenance/yr" value={maintenance} onChange={setMaintenance} placeholder="1" suffix="%" step={0.25} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Insurance/mo" value={insurance} onChange={setInsurance} placeholder="150" prefix="$" />
              <NumField label="HOA/mo" value={hoa} onChange={setHoa} placeholder="0" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Closing costs" value={closingPct} onChange={setClosingPct} placeholder="3" suffix="%" step={0.5} />
              <NumField label="Cost to sell" value={sellingPct} onChange={setSellingPct} placeholder="6" suffix="%" step={0.5} />
            </div>
            <NumField label="Home appreciation/yr" value={appreciation} onChange={setAppreciation} placeholder="3.5" suffix="%" step={0.25} />
            {r && (
              <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-green-700 font-medium">All-in monthly cost</span>
                <span className="text-sm font-medium text-green-800">{fmt(r.firstMonthOwn)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="If you rent" badge="RENTAL">
          <div className="space-y-4">
            <NumField label="Monthly rent" value={rent} onChange={setRent} placeholder="2400" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rent increase/yr" value={rentGrowth} onChange={setRentGrowth} placeholder="3" suffix="%" step={0.25} />
              <NumField label="Renters insurance/mo" value={rentersIns} onChange={setRentersIns} placeholder="20" prefix="$" />
            </div>
            <NumField
              label="Investment return"
              value={investReturn}
              onChange={setInvestReturn}
              placeholder="7"
              suffix="%"
              step={0.25}
              hint="What the renter earns investing the down payment and any monthly savings."
            />
            <NumField label="How long you'll stay" value={years} onChange={setYears} placeholder="10" suffix="yrs" />
            {r && (
              <>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Rent in year {n(years)}</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.finalRentPayment)}/mo</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Renter&apos;s portfolio</span>
                  <span className="text-sm font-medium text-gray-900">{fmtK(r.investedFinal)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Renting leaves you with</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalRent)}</p>
              </div>
              <div className={`p-4 text-center ${r.advantage >= 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.advantage >= 0 ? "Buying wins by" : "Renting wins by"}
                </p>
                <p className="text-2xl font-medium text-white">{fmtK(Math.abs(r.advantage))}</p>
                <p className="text-xs text-green-300">after {n(years)} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Buying leaves you with</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalBuy)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Break-even point`}
              value={r.breakEvenMonth ? `Year ${(r.breakEvenMonth / 12).toFixed(1)}` : "Not within this horizon"}
              tone={r.breakEvenMonth ? "green" : "gray"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label={`Home value in year ${n(years)}`} value={fmtK(r.homeValue)} />
              <Stat label="Mortgage balance" value={fmtK(r.balance)} />
              <Stat label="Equity built" value={fmtK(r.equity)} tone="green" />
              <Stat label="Up-front cash to buy" value={fmtK(n(down) + r.closingCosts)} tone="amber" />
            </div>
            <Takeaway tone={r.breakEvenMonth ? "green" : "amber"}>
              {r.breakEvenMonth ? (
                <>
                  Buying pulls ahead of renting around{" "}
                  <strong>year {(r.breakEvenMonth / 12).toFixed(1)}</strong>. Stay longer than that and
                  buying wins; move sooner and the closing and selling costs — about{" "}
                  <strong>{fmtK(r.closingCosts + (r.homeValue * n(sellingPct)) / 100)}</strong> combined —
                  swallow the equity you built.
                </>
              ) : (
                <>
                  Over {n(years)} years renting stays ahead by{" "}
                  <strong>{fmtK(Math.abs(r.advantage))}</strong>. At these assumptions the transaction
                  costs and the renter&apos;s investment returns outweigh the equity you&apos;d build. Try a
                  longer horizon or a lower price to see where that flips.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Wealth over time: buy vs. rent and invest">
            <LineChart
              ariaLabel="Net financial position of buying compared with renting and investing the difference"
              periodsPerYear={12}
              baselineZero
              series={[
                { label: "Buy", color: COLORS.green, data: r.buyNet },
                { label: "Rent & invest", color: COLORS.blue, data: r.rentNet, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Both households start with the same cash and spend the same amount on housing each month —
                the renter just invests what the buyer sinks into the down payment, closing costs, and any
                higher monthly bill. Buying starts behind because closing and selling costs come off the
                top; where the lines cross is the point where equity and appreciation have paid for them.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Total cash spent over the period">
            <BarChart
              ariaLabel="Total housing costs paid when buying compared with renting"
              height={210}
              bars={[
                { label: "Total paid buying", segments: [{ label: "Buying", value: r.buyerOutlay, color: COLORS.green }] },
                { label: "Total paid renting", segments: [{ label: "Renting", value: r.renterOutlay, color: COLORS.blue }] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="amber">
                Spending more is not the same as losing more. The buyer&apos;s payments include principal,
                which comes back as equity at the sale; the renter&apos;s payments do not — but the renter
                invests the difference. That is why the net-position chart above is the one that answers
                the question.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter a home price, a monthly rent, and how long you plan to stay.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
