"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Toggle, DateField, Headline, Takeaway, EmptyState,
  fmt, fmtK, pct, has, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import {
  ASSUMPTION_DEFAULTS as A,
  breakEvenAppreciation, breakEvenRent, compare, daysBetween, isoDate, vaEntitlementInUse, vaNextLoan,
  type Inputs,
} from "../../lib/rentOrSell";
import {
  RESIDENTIAL_RENTAL_RECOVERY_YEARS, SECTION_121_EXCLUSION, SECTION_121_MILITARY_SUSPENSION_MAX_YEARS,
  UNRECAPTURED_1250_MAX_RATE, type FilingStatus,
} from "../../lib/tax";
import { VA_FUNDING_FEE_PURCHASE } from "../../lib/va";
import { CONFORMING_LOAN_LIMIT_BASELINE, CONFORMING_LOAN_LIMIT_YEAR } from "../../lib/finance";

/** "30 September 2029", from an ISO date, without a time zone shifting the day. */
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Marks a field's starting value as an editable assumption, not a sourced figure. */
const assumed = (what: string) => `Assumption, not a sourced figure: ${what}. Change it to match your situation.`;

const VA_SUBSEQUENT_FEE = VA_FUNDING_FEE_PURCHASE[VA_FUNDING_FEE_PURCHASE.length - 1].subsequentUse;

export default function Calculator() {
  const [today] = useState(() => isoDate(new Date()));

  const [homeValue, setHomeValue] = useState<Num>("");
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [yearsLeft, setYearsLeft] = useState<Num>("");
  const [propertyTax, setPropertyTax] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [hoa, setHoa] = useState<Num>("");

  const [sellingCostPct, setSellingCostPct] = useState<Num>(A.sellingCostPct);
  const [repairs, setRepairs] = useState<Num>("");

  const [rent, setRent] = useState<Num>("");
  const [vacancyPct, setVacancyPct] = useState<Num>(A.vacancyPct);
  const [management, setManagement] = useState(true);
  const [managementPct, setManagementPct] = useState<Num>(A.managementPct);
  const [maintenancePct, setMaintenancePct] = useState<Num>(A.maintenancePct);
  const [capexPct, setCapexPct] = useState<Num>(A.capexPct);
  const [turnover, setTurnover] = useState<Num>(A.turnoverPerYear);
  const [landlordExtra, setLandlordExtra] = useState<Num>("");

  const [appreciation, setAppreciation] = useState<Num>(A.appreciationPct);
  const [rentGrowth, setRentGrowth] = useState<Num>(A.rentGrowthPct);
  const [expenseGrowth, setExpenseGrowth] = useState<Num>(A.expenseGrowthPct);
  const [horizon, setHorizon] = useState<Num>(A.horizonYears);
  const [investReturn, setInvestReturn] = useState<Num>(A.investReturnPct);

  const [status, setStatus] = useState<FilingStatus>("single");
  const [yearsLived, setYearsLived] = useState<Num>("");
  const [moveOut, setMoveOut] = useState("");
  const [military, setMilitary] = useState(false);
  const [jobMove, setJobMove] = useState(false);
  /** Military duty is a move for work too, so selecting it turns the job-move box on; it can still be cleared. */
  const chooseMilitary = (on: boolean) => {
    setMilitary(on);
    if (on) setJobMove(true);
  };
  const [dutyYears, setDutyYears] = useState<Num>("");
  const [basis, setBasis] = useState<Num>("");
  const [landPct, setLandPct] = useState<Num>(A.landPct);
  const [income, setIncome] = useState<Num>("");

  const [vaLoan, setVaLoan] = useState(false);
  const [entitlementUsed, setEntitlementUsed] = useState<Num>("");
  const [originalLoan, setOriginalLoan] = useState<Num>("");
  const [countyLimit, setCountyLimit] = useState<Num>(CONFORMING_LOAN_LIMIT_BASELINE);
  const [nextPrice, setNextPrice] = useState<Num>("");

  const resetAssumptions = () => {
    setSellingCostPct(A.sellingCostPct);
    setVacancyPct(A.vacancyPct);
    setManagement(true);
    setManagementPct(A.managementPct);
    setMaintenancePct(A.maintenancePct);
    setCapexPct(A.capexPct);
    setTurnover(A.turnoverPerYear);
    setAppreciation(A.appreciationPct);
    setRentGrowth(A.rentGrowthPct);
    setExpenseGrowth(A.expenseGrowthPct);
    setHorizon(A.horizonYears);
    setInvestReturn(A.investReturnPct);
    setLandPct(A.landPct);
  };

  const loadExample = () => {
    // Moving away now from a home bought a few years ago at a low rate: the case
    // where keeping it as a rental is most tempting.
    resetAssumptions();
    setHomeValue(450000);
    setBalance(260000);
    setRate(3);
    setYearsLeft(25);
    setPropertyTax(5400);
    setInsurance(1800);
    setHoa("");
    setRepairs(5000);
    setRent(2600);
    setLandlordExtra(400);
    setStatus("married");
    setYearsLived(4);
    setMoveOut(today);
    setMilitary(false);
    setJobMove(false);
    setDutyYears("");
    setBasis(340000);
    setIncome(150000);
    setVaLoan(true);
    setEntitlementUsed("");
    setOriginalLoan(285000);
    setCountyLimit(CONFORMING_LOAN_LIMIT_BASELINE);
    setNextPrice(550000);
  };

  const clearExample = () => {
    resetAssumptions();
    setHomeValue("");
    setBalance("");
    setRate("");
    setYearsLeft("");
    setPropertyTax("");
    setInsurance("");
    setHoa("");
    setRepairs("");
    setRent("");
    setLandlordExtra("");
    setStatus("single");
    setYearsLived("");
    setMoveOut("");
    setMilitary(false);
    setJobMove(false);
    setDutyYears("");
    setBasis("");
    setIncome("");
    setVaLoan(false);
    setEntitlementUsed("");
    setOriginalLoan("");
    setCountyLimit(CONFORMING_LOAN_LIMIT_BASELINE);
    setNextPrice("");
  };

  const inputs: Inputs | null = useMemo(() => {
    const ready =
      n(homeValue) > 0 && n(rent) > 0 && n(horizon) > 0 && n(basis) > 0 && has(yearsLived) && moveOut !== "" &&
      (n(balance) === 0 || (has(rate) && n(yearsLeft) > 0));
    if (!ready) return null;
    return {
      homeValue: n(homeValue),
      mortgageBalance: n(balance),
      mortgageRate: n(rate),
      mortgageYearsLeft: n(yearsLeft),
      propertyTax: n(propertyTax),
      insurance: n(insurance),
      hoa: n(hoa),
      sellingCostPct: n(sellingCostPct),
      repairsToSell: n(repairs),
      rent: n(rent),
      vacancyPct: n(vacancyPct),
      management,
      managementPct: n(managementPct),
      maintenancePct: n(maintenancePct),
      capexPct: n(capexPct),
      turnoverPerYear: n(turnover),
      landlordInsuranceExtra: n(landlordExtra),
      appreciationPct: n(appreciation),
      rentGrowthPct: n(rentGrowth),
      expenseGrowthPct: n(expenseGrowth),
      horizonYears: n(horizon),
      investReturnPct: n(investReturn),
      status,
      yearsLived: n(yearsLived),
      moveOut,
      dutyMonths: military ? Math.round(n(dutyYears) * 12) : 0,
      jobMove,
      adjustedBasis: n(basis),
      landPct: n(landPct),
      income: has(income) ? n(income) : null,
      asOf: today,
    };
  }, [homeValue, balance, rate, yearsLeft, propertyTax, insurance, hoa, sellingCostPct, repairs, rent, vacancyPct,
    management, managementPct, maintenancePct, capexPct, turnover, landlordExtra, appreciation, rentGrowth,
    expenseGrowth, horizon, investReturn, status, yearsLived, moveOut, military, jobMove, dutyYears, basis, landPct, income, today]);

  const r = useMemo(() => {
    if (!inputs) return null;
    return { c: compare(inputs), appreciation: breakEvenAppreciation(inputs), rent: breakEvenRent(inputs) };
  }, [inputs]);

  const va = useMemo(() => {
    if (!vaLoan || n(countyLimit) <= 0) return null;
    const inUse = vaEntitlementInUse({
      coeFigure: has(entitlementUsed) ? n(entitlementUsed) : null,
      originalLoan: has(originalLoan) ? n(originalLoan) : null,
    });
    if (inUse === null) return null;
    return {
      ...inUse,
      ...vaNextLoan({ entitlementUsed: inUse.used, countyLimit: n(countyLimit), price: n(nextPrice) > 0 ? n(nextPrice) : null }),
    };
  }, [vaLoan, entitlementUsed, originalLoan, countyLimit, nextPrice]);

  const years = n(horizon);
  const line = (k: string, v: string, tone = "text-gray-900") => (
    <div key={k} className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-gray-400">{k}</span>
      <span className={`text-sm font-medium ${tone}`}>{v}</span>
    </div>
  );
  const money = (v: number) => (v < 0 ? `−${fmt(-v)}` : fmt(v));
  const moneyK = (v: number) => (v < 0 ? `−${fmtK(-v)}` : fmtK(v));

  return (
    <CalcShell
      slug="rent-or-sell"
      intro="Moving out? Compare selling now with renting the house out and selling later: what each leaves you with, the monthly cash flow as a landlord, the date the tax-free sale runs out, and the depreciation tax that comes with renting."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["sell-first-or-buy-first", "capital-gains", "va-vs-conventional", "rent-vs-buy"]}
      disclaimer="For educational purposes only, and not tax, legal or investment advice. Tax treatment depends on your full situation; a tax professional can apply the rules to it. Rents, costs and home values are assumptions you supply, not forecasts."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your house" className="h-full">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <NumField label="Home value today" value={homeValue} onChange={setHomeValue} min={0} placeholder="450000" prefix="$" />
            </div>
            <div className="col-span-2">
              <NumField label="Mortgage balance" value={balance} onChange={setBalance} min={0} placeholder="260000" prefix="$" />
            </div>
            <NumField label="Rate" value={rate} onChange={setRate} min={0} placeholder="3" suffix="%" step={0.125} />
            <NumField label="Years left" value={yearsLeft} onChange={setYearsLeft} min={0} placeholder="25" suffix="yrs" />
            <NumField label="Property tax" value={propertyTax} onChange={setPropertyTax} min={0} placeholder="5400" prefix="$" suffix="/yr" />
            <NumField label="Insurance" value={insurance} onChange={setInsurance} min={0} placeholder="1800" prefix="$" suffix="/yr" />
            <div className="col-span-2">
              <NumField label="HOA" value={hoa} onChange={setHoa} min={0} placeholder="0" prefix="$" suffix="/mo" />
            </div>
          </div>
        </Card>
        <Card title="Selling now" className="h-full">
          <div className="space-y-4">
            <NumField
              label="Selling costs"
              value={sellingCostPct}
              onChange={setSellingCostPct}
              min={0}
              max={100}
              suffix="%"
              step={0.5}
              hint={assumed("commission, transfer taxes and closing costs together; commissions are negotiable and vary")}
            />
            <NumField label="Repairs to sell" value={repairs} onChange={setRepairs} min={0} placeholder="5000" prefix="$" hint="Applied to a later sale too, grown with expenses." />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Renting it out" badge="ASSUMPTIONS INSIDE" badgeTone="amber" className="h-full">
          <div className="space-y-4">
            <NumField label="Monthly rent" value={rent} onChange={setRent} min={0} placeholder="2600" prefix="$" hint="What similar homes nearby rent for, not the asking price of the best one." />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Vacancy" value={vacancyPct} onChange={setVacancyPct} min={0} max={100} suffix="%" hint={assumed("about 18 days a year empty")} />
              <NumField label="Maintenance" value={maintenancePct} onChange={setMaintenancePct} min={0} suffix="% of value/yr" hint={assumed("routine repairs")} />
              <NumField label="Capital reserve" value={capexPct} onChange={setCapexPct} min={0} suffix="% of rent" hint={assumed("roof, HVAC and appliances, saved monthly")} />
              <NumField label="Turnover" value={turnover} onChange={setTurnover} min={0} prefix="$" suffix="/yr" hint={assumed("cleaning, painting and leasing, averaged")} />
            </div>
            <Toggle checked={management} onChange={setManagement} label="Property management">
              Pay a property manager (most people who move away do)
            </Toggle>
            {management && (
              <NumField label="Management fee" value={managementPct} onChange={setManagementPct} min={0} max={100} suffix="% of rent" hint={assumed("on rent collected; some managers also charge leasing fees")} />
            )}
            <NumField label="Landlord insurance, extra" value={landlordExtra} onChange={setLandlordExtra} min={0} placeholder="400" prefix="$" suffix="/yr" hint="A landlord policy usually costs more than a homeowner's; ask your insurer for the difference." />
          </div>
        </Card>
        <Card title="Growth and timing" badge="ASSUMPTIONS" badgeTone="amber" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Home appreciation" value={appreciation} onChange={setAppreciation} suffix="%/yr" step={0.5} hint={assumed("nobody can forecast this")} />
              <NumField label="Rent growth" value={rentGrowth} onChange={setRentGrowth} suffix="%/yr" step={0.5} hint={assumed("yearly")} />
              <NumField label="Expense growth" value={expenseGrowth} onChange={setExpenseGrowth} suffix="%/yr" step={0.5} hint={assumed("tax, insurance, upkeep")} />
              <NumField label="Return on proceeds" value={investReturn} onChange={setInvestReturn} suffix="%/yr" step={0.5} hint={assumed("what the sale money would earn instead")} />
            </div>
            <NumField label="Years until you'd sell" value={horizon} onChange={setHorizon} min={0} max={30} suffix="yrs" hint="Both choices are compared at this point. Defaults to 3: the tax-free window closes just before three years after moving out." />
          </div>
        </Card>
      </div>

      <Card title="Tax" badge="FEDERAL" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Filing status"
            value={status}
            onChange={(v) => setStatus(v as FilingStatus)}
            options={[
              { value: "single", label: "Single" },
              { value: "married", label: "Married filing jointly" },
              { value: "head", label: "Head of household" },
            ]}
            hint={`Exclusion: ${fmt(SECTION_121_EXCLUSION[status])}${status === "married" ? ", if both spouses lived there 2 of the 5 years" : ""}.`}
          />
          <NumField label="Years you lived there" value={yearsLived} onChange={setYearsLived} min={0} placeholder="4" suffix="yrs" step={0.25} hint="As your main home, ending when you move out." />
          <DateField label="Move-out date" value={moveOut} onChange={setMoveOut} hint="The day it stops being your main home." />
          <NumField label="What you paid, plus improvements" value={basis} onChange={setBasis} min={0} placeholder="340000" prefix="$" hint="Your adjusted basis. Improvements add to it; repairs do not." />
          <NumField label="Land share of value" value={landPct} onChange={setLandPct} min={0} max={100} suffix="%" hint={assumed("land is not depreciable; your property tax bill often splits land and building")} />
          <NumField label="Household income in a sale year (optional)" value={income} onChange={setIncome} min={0} placeholder="150000" prefix="$" hint="Sets the capital gains bracket. Left blank: gains at 15% and recapture at the 25% maximum." />
          <div className="sm:col-span-2">
            <Toggle checked={military} onChange={chooseMilitary} label="Military (qualified extended duty)">
              I or my spouse will be on qualified official extended duty after moving out: uniformed services, Foreign Service or intelligence community, at a duty station 50 miles or more away or in government quarters under orders (or Peace Corps service outside the US)
            </Toggle>
            {military && (
              <div className="mt-2 max-w-xs">
                <NumField label="Years of that duty after moving out" value={dutyYears} onChange={setDutyYears} min={0} placeholder="3" suffix="yrs" step={0.25} hint={`Suspends the 5-year clock, up to ${SECTION_121_MILITARY_SUSPENSION_MAX_YEARS} years.`} />
              </div>
            )}
            {has(yearsLived) && n(yearsLived) < 2 && (
              <div className="mt-2">
                <Toggle checked={jobMove} onChange={setJobMove} label="Moving for a new job">
                  I am moving for a new job, and the new workplace (or duty station) is at least 50 miles farther from this
                  home than the old one. Under 2 years lived, this allows a partial exclusion.
                </Toggle>
              </div>
            )}
          </div>
        </div>
      </Card>

      {r && inputs ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Ahead after ${years} year${years === 1 ? "" : "s"}`}
              value={r.c.better === "neither" ? "About the same" : r.c.better === "rent" ? "Renting it out" : "Selling now"}
              tone={r.c.better === "neither" ? "gray" : "green"}
            />
            <Takeaway tone="blue">
              {r.c.better === "neither" ? (
                <>The two come out about even after {years} years on these assumptions. </>
              ) : (
                <>
                  {r.c.better === "rent" ? "Renting it out" : "Selling now"} leaves you{" "}
                  <strong>{fmtK(Math.abs(r.c.difference))}</strong> better off after {years} years, on these assumptions.{" "}
                </>
              )}
              As a landlord you would {r.c.rent.firstMonth.cashFlow < 0 ? "put in" : "clear"}{" "}
              <strong>{fmt(Math.abs(r.c.rent.firstMonth.cashFlow))}/mo</strong> in the first year.{" "}
              {r.appreciation.reason === "found" && r.appreciation.value !== null ? (
                <>Renting comes out ahead if the home appreciates more than <strong>{pct(r.appreciation.value, 1)}</strong> a year.</>
              ) : r.appreciation.reason === "rent-always" ? (
                <>Renting comes out ahead even if the home loses 20% a year.</>
              ) : (
                <>Selling comes out ahead even at 30% appreciation a year.</>
              )}
            </Takeaway>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              {
                key: "sell",
                title: "Sell now",
                tag: `proceeds at ${pct(inputs.investReturnPct, 1)}`,
                good: r.c.better === "sell",
                rows: [
                  line("Sale price", fmtK(inputs.homeValue)),
                  line(`Selling costs, ${pct(inputs.sellingCostPct, 1)}`, `−${fmtK(r.c.sell.sellingCosts)}`),
                  line("Repairs", `−${fmtK(inputs.repairsToSell)}`),
                  line("Mortgage payoff", `−${fmtK(inputs.mortgageBalance)}`),
                  line("Tax on the sale", r.c.sell.tax.tax > 0 ? `−${fmtK(r.c.sell.tax.tax)}` : "None"),
                  line("Net proceeds today", moneyK(r.c.sell.net), "text-gray-500"),
                  line(`Worth after ${years} yrs`, moneyK(r.c.sell.position)),
                ],
              },
              {
                key: "rent",
                title: `Rent it out, sell in ${years} year${years === 1 ? "" : "s"}`,
                tag: `${pct(inputs.appreciationPct, 1)} appreciation`,
                good: r.c.better === "rent",
                rows: [
                  line("Cash flow, year 1", `${money(r.c.rent.firstMonth.cashFlow)}/mo`, r.c.rent.firstMonth.cashFlow < 0 ? "text-red-700" : "text-gray-900"),
                  line(`Cash flow over ${years} yrs`, moneyK(r.c.rent.cashFlowTotal)),
                  line("  with the return on it", moneyK(r.c.rent.cashFlowGrown), "text-gray-500"),
                  line(`Sale price in ${years} yrs`, fmtK(r.c.rent.price)),
                  line("Selling costs and repairs", `−${fmtK(r.c.rent.sellingCosts + r.c.rent.repairs)}`),
                  line("Mortgage left", `−${fmtK(r.c.rent.mortgageBalance)}`),
                  line("Tax on the sale", r.c.rent.tax.tax > 0 ? `−${fmtK(r.c.rent.tax.tax)}` : "None"),
                  line(`Worth after ${years} yrs`, moneyK(r.c.rent.position)),
                ],
              },
            ].map((p) => (
              <div key={p.key} className={`border rounded-2xl p-5 ${p.good ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
                <div className="flex items-baseline justify-between gap-2 mb-4">
                  <h3 className="text-sm font-medium text-gray-900">{p.title}</h3>
                  <span className="text-xs text-gray-400 flex-shrink-0">{p.tag}</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-2">{p.rows}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            &ldquo;Worth&rdquo; is what each choice leaves you with at that point, after selling: the proceeds invested, or the
            equity plus the rent&apos;s cash flow. Where you live meanwhile costs the same either way, so it is left out of both.
          </p>

          <ChartCard title={`What each choice is worth after ${years} years`} footnote="A negative cash flow is money you put in, so it reduces the rental side.">
            <BarChart
              ariaLabel="What selling now and renting are each worth at the horizon"
              height={200}
              bars={[
                { label: "Sell now", segments: [{ label: "Proceeds, invested", value: Math.max(0, r.c.sell.position), color: COLORS.blue }] },
                {
                  label: "Rent it out",
                  segments: [
                    { label: "Equity after the sale", value: Math.max(0, r.c.rent.equity + Math.min(0, r.c.rent.cashFlowGrown)), color: COLORS.green },
                    { label: "Cash flow", value: Math.max(0, r.c.rent.cashFlowGrown), color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Your monthly cash flow as a landlord, year 1</h2>
              <div className="space-y-2">
                {line("Rent", fmt(r.c.rent.firstMonth.scheduledRent))}
                {line(`Vacancy, ${pct(inputs.vacancyPct, 1)}`, `−${fmt(r.c.rent.firstMonth.vacancy)}`)}
                {inputs.management && line(`Management, ${pct(inputs.managementPct, 1)}`, `−${fmt(r.c.rent.firstMonth.management)}`)}
                {line("Mortgage payment", `−${fmt(r.c.rent.firstMonth.mortgage)}`)}
                {line("Tax, insurance and HOA", `−${fmt(r.c.rent.firstMonth.taxInsHoa)}`)}
                {line("Maintenance", `−${fmt(r.c.rent.firstMonth.maintenance)}`)}
                {line("Capital reserve", `−${fmt(r.c.rent.firstMonth.capex)}`)}
                {line("Turnover", `−${fmt(r.c.rent.firstMonth.turnover)}`)}
                {line("Cash flow", `${money(r.c.rent.firstMonth.cashFlow)}/mo`, r.c.rent.firstMonth.cashFlow < 0 ? "text-red-700" : "text-green-700")}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mt-3">
                Before income tax. Rent can still lose money on paper, or make it, once depreciation is deducted; see the
                note below.
              </p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Break-even points</h2>
              <div className="space-y-2">
                {line(
                  "Appreciation, a year",
                  r.appreciation.reason === "found" && r.appreciation.value !== null
                    ? pct(r.appreciation.value, 2)
                    : r.appreciation.reason === "rent-always" ? "Renting wins at any" : "Selling wins at any",
                )}
                {line(
                  "Starting rent, a month",
                  r.rent.reason === "found" && r.rent.value !== null
                    ? fmt(r.rent.value)
                    : r.rent.reason === "rent-always" ? "Renting wins at any" : "Selling wins at any",
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mt-3">
                Each is the figure at which the two choices come out even after {years} years, everything else as you
                entered it. Above either one, renting comes out ahead.
              </p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">The tax-free window (section 121)</h2>
            {r.c.sellBy ? (
              <>
                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                  Sell by <strong>{longDate(r.c.sellBy)}</strong> to keep the exclusion of up to{" "}
                  <strong>{fmt(SECTION_121_EXCLUSION[inputs.status])}</strong> of gain
                  {inputs.status === "married" ? " (if you both lived there 2 of the 5 years)" : ""}.
                  {inputs.dutyMonths > 0 && r.c.sellByWithoutSuspension && (
                    <> Without the military suspension it would be {longDate(r.c.sellByWithoutSuspension)}.</>
                  )}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You must have owned and lived in the home for 2 of the 5 years before the sale. After moving out the
                  clock keeps running, so the window closes about three years later.
                  {inputs.dutyMonths > 0 &&
                    ` Qualified official extended duty suspends the 5-year period, for up to ${SECTION_121_MILITARY_SUSPENSION_MAX_YEARS} years; you elect it on the return for the year of the sale.`}{" "}
                  A sale {years} years from now, on {longDate(r.c.rent.saleDate)}, {r.c.rent.tax.qualifies ? "is inside" : "is outside"} the
                  window. This is an estimate counted to the day: leave a margin, because closings slip.
                </p>
              </>
            ) : r.c.sell.tax.exclusion.kind === "partial" || r.c.rent.tax.exclusion.kind === "partial" ? (
              <>
                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                  Living there under 2 years, you get a <strong>partial exclusion</strong> for the job move: up to{" "}
                  <strong>{fmt(r.c.sell.tax.exclusion.limit)}</strong> on a sale now
                  {r.c.sell.tax.exclusion.residenceMonths !== null &&
                    ` (${r.c.sell.tax.exclusion.residenceMonths.toFixed(1)} of 24 months)`}
                  , and {r.c.rent.tax.exclusion.limit > 0 ? <strong>{fmt(r.c.rent.tax.exclusion.limit)}</strong> : "none"} on a
                  sale on {longDate(r.c.rent.saleDate)}.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  IRS Publication 523: &ldquo;You can meet the requirements for a partial exclusion if the main reason for your
                  home sale was a change in workplace location&rdquo;, and a move qualifies if &ldquo;You took or were transferred
                  to a new job in a work location at least 50 miles farther from the home than your old work
                  location.&rdquo; The exclusion is the months you lived there in the 5 years before the sale, over 24, times{" "}
                  {fmt(SECTION_121_EXCLUSION.single)}
                  {inputs.status === "married" ? " for each spouse (this assumes you both lived there the same time)" : ""}. The
                  longer you wait to sell, the fewer of those months stay inside the 5 years, and Publication 523 counts
                  &ldquo;You sold your home not long after the situation arose&rdquo; among the factors for a sale to count as
                  work-related.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">
                Living there under 2 years, you do not meet the use test at any sale date. A partial exclusion can apply if
                you moved for a new job at least 50 miles farther away (tick the box above), or for health or an unforeseen
                circumstance, which is not modelled here (IRS Publication 523).
              </p>
            )}
            {r.c.sellBy && !r.c.rent.tax.qualifies && r.c.sell.tax.qualifies && daysBetween(r.c.sellBy, r.c.rent.saleDate) <= 92 && (
              <p className="text-xs text-amber-700 mt-2">
                The sale {years} years out misses the window by {daysBetween(r.c.sellBy, r.c.rent.saleDate)} day
                {daysBetween(r.c.sellBy, r.c.rent.saleDate) === 1 ? "" : "s"}: &ldquo;three years&rdquo; after moving out is a
                day or so too late. Closing by {longDate(r.c.sellBy)} would keep the exclusion.
              </p>
            )}
            {!r.c.sell.tax.qualifies && r.c.sellBy && (
              <p className="text-xs text-amber-700 mt-2">The window has already closed for a sale today.</p>
            )}
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Depreciation recapture on the later sale</h2>
            <div className="space-y-2 mb-3">
              {line("Depreciable basis", fmtK(r.c.rent.depreciableBasis))}
              {line(`Depreciation over ${years} yrs (${RESIDENTIAL_RENTAL_RECOVERY_YEARS}-year schedule)`, fmtK(r.c.rent.depreciation))}
              {line(`Tax on it, at most ${UNRECAPTURED_1250_MAX_RATE}%`, fmtK(r.c.rent.tax.recaptureTax), "text-red-700")}
              {r.c.rent.tax.excluded > 0 && line("Gain covered by the exclusion", fmtK(r.c.rent.tax.excluded), "text-green-700")}
              {r.c.rent.tax.gainTax > 0 && line("Capital gains tax on the rest", fmtK(r.c.rent.tax.gainTax))}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              The basis is the lesser of what you paid plus improvements or today&apos;s value, less the land. The depreciation
              part of the gain is taxed even when the exclusion covers the rest, and it is owed on depreciation you were
              allowed to take whether or not you took it.
            </p>
          </div>

          <div className="border border-amber-200 bg-amber-50 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">Not modelled</h2>
            <p className="text-xs text-gray-700 leading-relaxed">
              Income tax on the rent, and the depreciation deduction against it, are not included; nor are the passive
              activity loss rules, which can limit deducting a rental loss against your other income, the 3.8% net
              investment income tax, state tax, or tax on the sale proceeds&apos; investment growth. Leaving out the
              depreciation deduction understates renting a little, since it can shelter the rent from income tax. IRS
              Publication 527 covers these rules; a tax professional can apply them to your return.
            </p>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add the home&apos;s value, your mortgage, the rent it would fetch, what you paid for it, how long you lived there
            and when you move out. The assumptions are already filled in; change any of them.
          </EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-1">Buying again with VA?</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          If this house has a VA loan and you keep it, the entitlement it uses stays tied up, which can limit a no-down-payment
          VA loan at your next home.
        </p>
        <Toggle checked={vaLoan} onChange={setVaLoan} label="VA loan on this house">
          This house has a VA loan, and I would keep it
        </Toggle>
        {vaLoan && (
          <div className="mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <NumField label="Original loan amount (the full amount on your note, including any funding fee you financed)" value={originalLoan} onChange={setOriginalLoan} min={0} placeholder="285000" prefix="$" hint={
                <>
                  Estimates the entitlement in use: 25% of a loan over $144,000. On a
                  financed funding fee, VA Pamphlet 26-7 says the guaranty &ldquo;is based on the loan amount including the
                  funding fee portion when the fee is paid from loan proceeds.&rdquo;
                </>
              } />
              <NumField label="Entitlement in use (from your Certificate of Eligibility, if you have it)" value={entitlementUsed} onChange={setEntitlementUsed} min={0} placeholder="optional" prefix="$" hint="The Entitlement Charged column on your COE. When filled, it is used instead of the estimate from the loan amount." />
              <NumField label="County loan limit where you're buying" value={countyLimit} onChange={setCountyLimit} min={0} prefix="$" hint={`${fmt(CONFORMING_LOAN_LIMIT_BASELINE)} in most counties for ${CONFORMING_LOAN_LIMIT_YEAR} (FHFA one-unit). High-cost counties are higher: look yours up on FHFA's site.`} />
              <NumField label="Price of the next home (optional)" value={nextPrice} onChange={setNextPrice} min={0} placeholder="550000" prefix="$" />
            </div>
            {va ? (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2 mb-3">
                {line(va.source === "coe" ? "Entitlement in use (your COE figure)" : "Entitlement in use (estimated)", fmt(va.used))}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {va.source === "coe"
                    ? "Based on the entitlement figure from your COE."
                    : "An estimate: 25% of the original loan amount, the guaranty on a loan over $144,000 made with full entitlement. Your COE's figure is exact; enter it above if you have it."}
                </p>
                {line("Remaining entitlement", fmt(va.remaining))}
                {line("Most lenders' no-down-payment limit", fmt(va.maxNoDown), "text-green-700")}
                {va.downPayment !== null && line("Down payment for that price", va.downPayment > 0 ? fmt(va.downPayment) : "None", va.downPayment > 0 ? "text-amber-700" : "text-green-700")}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-3">Add the original loan amount to estimate this, or the entitlement in use from your COE.</p>
            )}
            <div className="text-xs text-gray-600 leading-relaxed space-y-2">
              <p>
                Remaining entitlement is 25% of the county&apos;s one-unit loan limit, less the entitlement still in use (VA
                Pamphlet 26-7, chapter 3). VA&apos;s own example multiplies it by 4 for the most lenders will usually lend with
                no down payment; above that, most lenders want your entitlement and down payment together to cover 25% of
                the loan. Lenders set this, so ask yours. The next loan would be a subsequent use: a {VA_SUBSEQUENT_FEE}%
                funding fee with under 5% down, unless you are exempt.
              </p>
              <p>
                <strong>Getting it back.</strong> Entitlement is restored when the house is sold and the loan paid in full,
                or when a veteran buyer assumes the loan and substitutes their own entitlement (38 U.S.C. 3702(b)). A
                one-time restoration is possible if the loan is paid off, say by refinancing, while you keep the house.
              </p>
              <p>
                <strong>Selling by assumption.</strong> A VA loan can be assumed by a buyer who qualifies. That releases you
                from liability for the loan (38 U.S.C. 3714) but does not restore your entitlement unless the buyer is a
                veteran who substitutes theirs.
              </p>
            </div>
          </div>
        )}
      </div>
    </CalcShell>
  );
}
