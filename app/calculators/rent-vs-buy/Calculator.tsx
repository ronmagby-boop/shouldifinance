"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, Headline, Stat, Takeaway, EmptyState,
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
  const [financeClosing, setFinanceClosing] = useState(true);
  const [cgRate, setCgRate] = useState<Num>(15);
  const [filing, setFiling] = useState("married");
  /** null = follow the horizon; set once the user picks for themselves. */
  const [intentOverride, setIntentOverride] = useState<"sell" | "stay" | null>(null);
  /** Share of the monthly surplus each household actually invests, 0-100. */
  const [discipline, setDiscipline] = useState<Num>(50);

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
    setFinanceClosing(true);
    setCgRate(15);
    setFiling("married");
    setIntentOverride(null);
    setDiscipline(50);
  };

  // Short horizons usually end in a sale; long ones usually do not. The user
  // can say otherwise, and that choice then sticks.
  const intent: "sell" | "stay" = intentOverride ?? (n(years) >= 20 ? "stay" : "sell");
  const willSell = intent === "sell";
  /** IRC Section 121 exclusion on the gain from a primary residence. */
  const exclusion = filing === "married" ? 500000 : 250000;

  const r = useMemo(() => {
    if (n(price) <= 0 || n(rent) <= 0 || n(years) <= 0) return null;

    const horizon = Math.round(n(years) * 12);
    const termMonths = Math.max(1, n(term) * 12);
    const closingCosts = (n(price) * n(closingPct)) / 100;
    // Financed, the costs ride on the loan and the buyer only brings the down
    // payment. Paid at the table, they are cash on top of it.
    const loan = Math.max(0, n(price) - n(down)) + (financeClosing ? closingCosts : 0);
    const upFront = financeClosing ? n(down) : n(down) + closingCosts;
    const pi = payment(loan, n(rate), termMonths);
    const monthlyRate = n(rate) / 100 / 12;
    const cg = Math.max(0, n(cgRate)) / 100;

    // Both households start with the same cash and spend the same amount on
    // housing each month. The buyer sinks the cash into the house; the renter
    // invests it. Whoever has the cheaper month invests the difference, so the
    // two paths stay directly comparable on wealth.
    //
    // Basis is tracked on both portfolios — contributions are after-tax money —
    // so a sale can be taxed on the gain alone, the same way the house is.
    let balance = loan;
    let homeValue = n(price);
    let currentRent = n(rent);
    let buyerPortfolio = 0;
    let buyerBasis = 0;
    let renterPortfolio = upFront;
    let renterBasis = upFront;
    // The lump sum always goes in whole; only the monthly surplus is discounted.
    const renterLump = upFront;
    let renterMonthlyBasis = 0;
    let crossoverMonth: number | null = null;
    let payoffMonth: number | null = null;
    const invested = Math.min(Math.max(n(discipline), 0), 100) / 100;
    let buyerOutlay = upFront;
    let renterOutlay = 0;
    const monthlyReturn = n(investReturn) / 100 / 12;

    const buyNet: number[] = [];
    const rentNet: number[] = [];
    let breakEvenMonth: number | null = null;

    /**
     * Where each side stands if they settled up today. The symmetry rule: on a
     * sale both sides are marked to the liquidation — the house net of selling
     * costs and capital gains tax, the portfolios net of tax on their gain. If
     * there is no sale neither side is realised, so both are shown gross.
     */
    const positions = () => {
      if (!willSell) {
        return {
          buyer: homeValue - balance + buyerPortfolio,
          renter: renterPortfolio,
          sellCosts: 0, homeGain: 0, homeTax: 0, exclusionUsed: 0,
          renterTax: 0, buyerPortTax: 0,
        };
      }
      const sellCosts = (homeValue * n(sellingPct)) / 100;
      const homeGain = Math.max(0, homeValue - n(price));
      const exclusionUsed = Math.min(homeGain, exclusion);
      const homeTax = Math.max(0, homeGain - exclusion) * cg;
      const renterTax = Math.max(0, renterPortfolio - renterBasis) * cg;
      const buyerPortTax = Math.max(0, buyerPortfolio - buyerBasis) * cg;
      return {
        buyer: homeValue - sellCosts - balance + buyerPortfolio - homeTax - buyerPortTax,
        renter: renterPortfolio - renterTax,
        sellCosts, homeGain, homeTax, exclusionUsed, renterTax, buyerPortTax,
      };
    };

    for (let m = 1; m <= horizon; m++) {
      const interest = balance * monthlyRate;
      const principal = Math.max(0, Math.min(pi - interest, balance));
      // Cash P&I actually due: the scheduled payment while a balance remains, a
      // smaller one in the payoff month, and nothing at all afterwards. Without
      // this the buyer keeps paying a mortgage they have already retired.
      const piDue = balance > 0 ? interest + principal : 0;
      balance = Math.max(0, balance - principal);
      if (payoffMonth === null && balance <= 0) payoffMonth = m;

      const taxMo = (homeValue * n(tax)) / 100 / 12;
      const maintMo = (homeValue * n(maintenance)) / 100 / 12;
      const ownMonthly = piDue + taxMo + n(insurance) + n(hoa) + maintMo;
      const rentMonthly = currentRent + n(rentersIns);
      buyerOutlay += ownMonthly;
      renterOutlay += rentMonthly;

      // Whichever household pays less that month invests the difference — but
      // only the share they would realistically keep investing. The same
      // discipline applies to both sides, so neither is flattered.
      const diff = ownMonthly - rentMonthly;
      if (crossoverMonth === null && diff < 0) crossoverMonth = m;
      const renterAdd = Math.max(0, diff) * invested;
      const buyerAdd = Math.max(0, -diff) * invested;
      renterPortfolio = renterPortfolio * (1 + monthlyReturn) + renterAdd;
      renterBasis += renterAdd;
      renterMonthlyBasis += renterAdd;
      buyerPortfolio = buyerPortfolio * (1 + monthlyReturn) + buyerAdd;
      buyerBasis += buyerAdd;

      homeValue *= Math.pow(1 + n(appreciation) / 100, 1 / 12);
      if (m % 12 === 0) currentRent *= 1 + n(rentGrowth) / 100;

      const p = positions();
      buyNet.push(p.buyer);
      rentNet.push(p.renter);
      if (breakEvenMonth === null && p.buyer > p.renter) breakEvenMonth = m;
    }

    const final = positions();
    const equity = homeValue - balance;

    return {
      pi,
      loan,
      closingCosts,
      upFront,
      buyNet,
      rentNet,
      finalBuy: final.buyer,
      finalRent: final.renter,
      advantage: final.buyer - final.renter,
      breakEvenMonth,
      homeValue,
      balance,
      equity,
      buyerOutlay,
      renterOutlay,
      finalRentPayment: currentRent,
      renterPortfolio,
      renterBasis,
      renterLump,
      renterMonthlyBasis,
      crossoverMonth,
      payoffMonth,
      renterGain: Math.max(0, renterPortfolio - renterBasis),
      renterTax: final.renterTax,
      buyerPortfolio,
      buyerPortTax: final.buyerPortTax,
      buyerGross: homeValue - balance + buyerPortfolio,
      sellCosts: final.sellCosts,
      homeGain: final.homeGain,
      homeTax: final.homeTax,
      exclusionUsed: final.exclusionUsed,
      firstMonthOwn: pi + (n(price) * n(tax)) / 100 / 12 + n(insurance) + n(hoa) + (n(price) * n(maintenance)) / 100 / 12,
    };
  }, [price, down, rate, term, tax, insurance, maintenance, hoa, appreciation, closingPct, sellingPct, rent, rentGrowth, rentersIns, investReturn, years, financeClosing, willSell, cgRate, exclusion, discipline]);

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
              <NumField
                label="Cost to sell"
                value={sellingPct}
                onChange={setSellingPct}
                placeholder="6"
                suffix="%"
                step={0.5}
                disabled={!willSell}
                hint={!willSell ? "Not charged — you plan to stay, so there is no sale." : undefined}
              />
            </div>
            <Toggle checked={financeClosing} onChange={setFinanceClosing}>
              Finance closing costs into the loan (unchecked = paid in cash at closing)
            </Toggle>
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
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <label htmlFor="discipline" className="block text-xs text-gray-400">
                  Share of the monthly difference actually invested
                </label>
                <span className="text-sm font-medium text-gray-900 tabular-nums shrink-0">
                  {n(discipline)}%
                </span>
              </div>
              {/* On a phone the presets drop to their own row so the slider keeps the
                  full width — sharing it left about 137px, which is too fine to drag. */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {/* touch-action: pan-y lets a vertical swipe scroll the page instead of
                    dragging the thumb, which is the iOS Safari failure mode. The 44px
                    height is the touch target; the thumb is drawn smaller inside it. */}
                <input
                  id="discipline"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={n(discipline)}
                  onChange={(e) => setDiscipline(Number(e.target.value))}
                  style={{ touchAction: "pan-y" }}
                  aria-label="Share of the monthly difference actually invested"
                  className="w-full sm:flex-1 min-w-0 h-11 cursor-pointer appearance-none bg-transparent
                    [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:-mt-[9px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-800 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow
                    [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-gray-200
                    [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-green-800 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                />
                <div className="flex gap-1.5 shrink-0 self-start sm:self-auto">
                  {[0, 50, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDiscipline(v)}
                      aria-pressed={n(discipline) === v}
                      className={`h-11 w-11 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                        n(discipline) === v
                          ? "bg-green-800 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                This is the single biggest lever on the answer. Whichever side pays less
                each month only comes out ahead if they actually invest the difference
                instead of spending it — and the same share is applied to both sides.
              </p>
            </div>
            <NumField label="How long you'll stay" value={years} onChange={setYears} placeholder="10" suffix="yrs" />
            <SelectField
              label="At the end of that period"
              value={intent}
              onChange={v => setIntentOverride(v as "sell" | "stay")}
              options={[
                { value: "sell", label: "I plan to sell" },
                { value: "stay", label: "I plan to stay" },
              ]}
              hint={
                intentOverride === null
                  ? `Defaulted from your ${n(years)}-year horizon. Change it if that is not the plan.`
                  : "Selling costs and capital gains tax only apply if you sell."
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Capital gains rate" value={cgRate} onChange={setCgRate} placeholder="15" suffix="%" step={1} />
              <SelectField
                label="Filing status"
                value={filing}
                onChange={setFiling}
                options={[
                  { value: "married", label: "Married filing jointly" },
                  { value: "single", label: "Single" },
                ]}
              />
            </div>
            {r && (
              <>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Rent in year {n(years)}</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.finalRentPayment)}/mo</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Renter&apos;s portfolio{willSell ? " (after tax)" : ""}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{fmtK(r.finalRent)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Renting leaves you with</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalRent)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{willSell ? "after capital gains tax" : "portfolio, not sold"}</p>
              </div>
              <div className={`p-4 text-center ${r.advantage >= 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.advantage >= 0 ? "Buying wins by" : "Renting wins by"}
                </p>
                <p className="text-2xl font-medium text-white">{fmtK(Math.abs(r.advantage))}</p>
                <p className="text-xs text-green-300">
                  after {n(years)} years, {willSell ? "both after tax" : "both before tax"}
                </p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Buying leaves you with</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalBuy)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{willSell ? "after selling costs and tax" : "equity, not sold"}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={r.breakEvenMonth && r.advantage < 0 ? "Buying leads from" : "Break-even point"}
              value={r.breakEvenMonth ? `Year ${(r.breakEvenMonth / 12).toFixed(1)}` : "Not within this horizon"}
              tone={r.advantage >= 0 && r.breakEvenMonth ? "green" : "gray"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label={`Home value in year ${n(years)}`} value={fmtK(r.homeValue)} />
              <Stat label="Mortgage balance" value={fmtK(r.balance)} />
              <Stat label="Equity built" value={fmtK(r.equity)} tone="green" />
              <Stat label="Up-front cash to buy" value={fmtK(r.upFront)} tone="amber" sub={financeClosing ? "closing costs financed" : "includes closing costs"} />
            </div>
            <Takeaway tone={r.advantage >= 0 ? "green" : "amber"}>
              {/* Branch on who is ahead at the horizon, not merely on whether the
                  lines ever crossed — they can cross back. */}
              {r.advantage >= 0 && r.breakEvenMonth ? (
                <>
                  Buying pulls ahead of renting around{" "}
                  <strong>year {(r.breakEvenMonth / 12).toFixed(1)}</strong> and is still ahead at{" "}
                  <strong>year {n(years)}</strong>, by <strong>{fmtK(r.advantage)}</strong>. Move sooner
                  and the transaction costs — about{" "}
                  <strong>{fmtK(r.closingCosts + (willSell ? (r.homeValue * n(sellingPct)) / 100 : 0))}</strong>{" "}
                  in total — swallow the equity you built.
                </>
              ) : r.breakEvenMonth ? (
                <>
                  Buying leads from about <strong>year {(r.breakEvenMonth / 12).toFixed(1)}</strong>, but
                  the renter&apos;s portfolio overtakes it again before{" "}
                  <strong>year {n(years)}</strong>, finishing <strong>{fmtK(Math.abs(r.advantage))}</strong>{" "}
                  ahead. Compounding at {n(investReturn)}% eventually outruns a home appreciating at{" "}
                  {n(appreciation)}%, so the winner here depends on exactly when you stop.
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

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">
              {willSell ? "Both sides, after tax" : "Both sides, nothing sold"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-900 mb-2">Renter</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2"><span className="text-gray-400">Portfolio</span><span className="text-gray-900">{fmtK(r.renterPortfolio)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-gray-400">Basis (what they put in)</span><span className="text-gray-900">{fmtK(r.renterBasis)}</span></div>
                  <div className="flex justify-between gap-2 pl-3"><span className="text-gray-400">Day-one lump sum</span><span className="text-gray-500">{fmtK(r.renterLump)}</span></div>
                  <div className="flex justify-between gap-2 pl-3"><span className="text-gray-400">Monthly contributions at {n(discipline)}%</span><span className="text-gray-500">{fmtK(r.renterMonthlyBasis)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-gray-400">Unrealised gain</span><span className="text-gray-900">{fmtK(r.renterGain)}</span></div>
                  <div className="flex justify-between gap-2 border-t border-gray-200 pt-1.5">
                    <span className="text-gray-400">{willSell ? `Capital gains tax at ${n(cgRate)}%` : "Not sold, so no tax"}</span>
                    <span className={willSell ? "text-amber-600" : "text-green-700"}>{willSell ? `−${fmtK(r.renterTax)}` : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2 font-medium"><span className="text-gray-900">Net</span><span className="text-gray-900">{fmtK(r.finalRent)}</span></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-900 mb-2">Buyer</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2"><span className="text-gray-400">Equity{r.buyerPortfolio > 0 ? " + portfolio" : ""}</span><span className="text-gray-900">{fmtK(r.buyerGross)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-gray-400">Gain on the home</span><span className="text-gray-900">{fmtK(r.homeGain)}</span></div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Section 121 exclusion</span>
                    <span className="text-green-700">{willSell ? `−${fmtK(r.exclusionUsed)} shielded` : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-gray-200 pt-1.5">
                    <span className="text-gray-400">{willSell ? "Selling costs + capital gains tax" : "Not sold, so neither applies"}</span>
                    <span className={willSell ? "text-amber-600" : "text-green-700"}>{willSell ? `−${fmtK(r.sellCosts + r.homeTax + r.buyerPortTax)}` : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2 font-medium"><span className="text-gray-900">Net</span><span className="text-gray-900">{fmtK(r.finalBuy)}</span></div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Takeaway tone="green">
                <strong>The Section 121 exclusion</strong> is the biggest tax break most homeowners will
                ever get, and many have never heard of it. Sell a home you have owned and lived in for at
                least two of the last five years and{" "}
                <strong>{fmtK(exclusion)}</strong> of the gain is excluded from capital gains tax entirely
                ({filing === "married" ? "$500,000 married filing jointly" : "$250,000 filing single"};
                the other status gives {filing === "married" ? "$250,000" : "$500,000"}). An investment
                portfolio has no equivalent — every dollar of growth is taxable when sold.
              </Takeaway>
              <Takeaway tone={willSell ? "blue" : "amber"}>
                {willSell ? (
                  <>
                    Because you plan to sell, both sides are shown at the same moment: the home net of
                    selling costs and any tax the exclusion does not cover, and the portfolio net of tax on
                    its gain. Comparing a house after its exit costs against a portfolio before them is the
                    most common way this question gets answered wrongly.
                  </>
                ) : (
                  <>
                    Because you plan to stay, neither side is being cashed out, so both figures are shown
                    before tax — no selling costs on the house and no capital gains tax on either the house
                    or the portfolio. The catch is that they are not equally spendable: the portfolio can be
                    sold in a day, the equity cannot.
                  </>
                )}
              </Takeaway>
              <Takeaway tone="amber">
                <strong>One thing this model cannot see</strong> is whether you would really invest the
                difference. A mortgage takes the money whether you feel like saving that month or not,
                while investing the gap every month for {n(years)} years takes a decision you have to keep
                making. That is what the slider above is for — at{" "}
                {n(discipline)}% it assumes you invest {n(discipline)} cents of every dollar you save, and
                it applies the same assumption to whichever side is paying less. Be honest about your own
                number rather than picking the one that gives the answer you want.
              </Takeaway>
            </div>
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
