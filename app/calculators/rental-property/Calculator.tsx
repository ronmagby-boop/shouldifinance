"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Takeaway, EmptyState,
  fmt, fmtK, pct, has, n, type Num,
} from "../../components/Inputs";
import { analyze, RENTAL_DEFAULTS as D, type Inputs } from "../../lib/rentalProperty";
import { INVESTMENT_LLPA_DATE, INVESTMENT_MATRIX_DATE, INVESTMENT_MAX_LTV } from "../../lib/finance";

/** Marks a field's starting value as an editable assumption, not a sourced figure. */
const assumed = (what: string) => `Assumption, not a sourced figure: ${what}. Change it to match the property.`;

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [downPct, setDownPct] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>(30);
  const [closing, setClosing] = useState<Num>("");
  const [rent, setRent] = useState<Num>("");
  const [vacancy, setVacancy] = useState<Num>(D.vacancyPct);
  const [management, setManagement] = useState(true);
  const [managementPct, setManagementPct] = useState<Num>(D.managementPct);
  const [maintenance, setMaintenance] = useState<Num>(D.maintenancePct);
  const [capex, setCapex] = useState<Num>(D.capexPct);
  const [tax, setTax] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [hoa, setHoa] = useState<Num>("");

  const resetAssumptions = () => {
    setVacancy(D.vacancyPct);
    setManagement(true);
    setManagementPct(D.managementPct);
    setMaintenance(D.maintenancePct);
    setCapex(D.capexPct);
  };

  const loadExample = () => {
    // A modest single-family rental at 25% down and a 7.25% investor rate:
    // the common case where the rent covers the bills but not by much.
    resetAssumptions();
    setPrice(320000);
    setDownPct(25);
    setRate(7.25);
    setTerm(30);
    setClosing(8000);
    setRent(2400);
    setTax(3800);
    setInsurance(1800);
    setHoa("");
  };

  const clearExample = () => {
    resetAssumptions();
    setPrice("");
    setDownPct("");
    setRate("");
    setTerm(30);
    setClosing("");
    setRent("");
    setTax("");
    setInsurance("");
    setHoa("");
  };

  const inputs: Inputs | null = useMemo(() => {
    const ready = n(price) > 0 && has(downPct) && n(downPct) <= 100 && n(rent) > 0 &&
      (n(downPct) >= 100 || (has(rate) && n(term) > 0));
    if (!ready) return null;
    return {
      price: n(price),
      downPct: n(downPct),
      rate: n(rate),
      termYears: n(term) > 0 ? n(term) : 30,
      closingCosts: n(closing),
      rent: n(rent),
      vacancyPct: n(vacancy),
      management,
      managementPct: n(managementPct),
      maintenancePct: n(maintenance),
      capexPct: n(capex),
      propertyTax: n(tax),
      insurance: n(insurance),
      hoa: n(hoa),
    };
  }, [price, downPct, rate, term, closing, rent, vacancy, management, managementPct, maintenance, capex, tax, insurance, hoa]);

  const r = useMemo(() => (inputs ? analyze(inputs) : null), [inputs]);

  const line = (k: string, v: string, tone = "text-gray-900") => (
    <div key={k} className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-gray-500">{k}</span>
      <span className={`text-sm font-medium ${tone}`}>{v}</span>
    </div>
  );
  const money = (v: number) => (v < 0 ? `−${fmt(-v)}` : fmt(v));
  const signedPct = (v: number | null, d = 1) => (v === null ? "—" : v < 0 ? `−${pct(-v, d)}` : pct(v, d));

  return (
    <CalcShell
      slug="rental-property"
      intro="Run the numbers on a rental before you buy it: what it puts in your pocket each month, what it returns on the cash you put in, and how much room there is before it costs you money."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["rent-or-sell", "mortgage-payment", "home-affordability", "investment-growth"]}
      disclaimer="For educational purposes only, and not investment, tax or lending advice. Rents, vacancy and costs are assumptions you supply; the figures are a first-year snapshot, before income tax."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The purchase" className="h-full">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <NumField label="Purchase price" value={price} onChange={setPrice} min={0} placeholder="320000" prefix="$" />
            </div>
            <NumField label="Down payment" value={downPct} onChange={setDownPct} min={0} max={100} placeholder="25" suffix="%" hint={`Fannie Mae requires at least ${100 - INVESTMENT_MAX_LTV.oneUnit}% on one unit.`} />
            <NumField label="Closing costs" value={closing} onChange={setClosing} min={0} placeholder="8000" prefix="$" />
            <NumField label="Mortgage rate" value={rate} onChange={setRate} min={0} placeholder="7.25" suffix="%" step={0.125} hint="An investor quote, usually higher than for a home you live in." />
            <NumField label="Term" value={term} onChange={setTerm} min={1} placeholder="30" suffix="yrs" />
          </div>
        </Card>
        <Card title="Rent and running costs" badge="ASSUMPTIONS INSIDE" badgeTone="amber" className="h-full">
          <div className="space-y-4">
            <NumField label="Monthly rent" value={rent} onChange={setRent} min={0} placeholder="2400" prefix="$" hint="What comparable homes nearby actually rent for." />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Vacancy" value={vacancy} onChange={setVacancy} min={0} max={100} suffix="%" hint={assumed("about 18 days a year empty")} />
              <NumField label="Capital reserve" value={capex} onChange={setCapex} min={0} suffix="% of rent" hint={assumed("roof, HVAC and appliances, saved monthly")} />
              <NumField label="Maintenance" value={maintenance} onChange={setMaintenance} min={0} suffix="% of price/yr" hint={assumed("routine repairs")} />
              <NumField label="HOA" value={hoa} onChange={setHoa} min={0} placeholder="0" prefix="$" suffix="/mo" />
              <NumField label="Property tax" value={tax} onChange={setTax} min={0} placeholder="3800" prefix="$" suffix="/yr" />
              <NumField label="Insurance" value={insurance} onChange={setInsurance} min={0} placeholder="1800" prefix="$" suffix="/yr" hint="A landlord policy, not a homeowner's." />
            </div>
            <Toggle checked={management} onChange={setManagement} label="Property management">
              Pay a property manager
            </Toggle>
            {management && (
              <NumField label="Management fee" value={managementPct} onChange={setManagementPct} min={0} max={100} suffix="% of rent" hint={assumed("on rent collected")} />
            )}
          </div>
        </Card>
      </div>

      {r && inputs ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Monthly cash flow, year one"
              value={money(r.cashFlow)}
              tone={r.cashFlow >= 0 ? "green" : "red"}
            />
            <Takeaway tone={r.cashFlow >= 0 ? "blue" : "amber"}>
              {r.cashFlow >= 0 ? (
                <>After every cost and the mortgage, the rent leaves <strong>{fmt(r.cashFlow)}</strong> a month, </>
              ) : (
                <>The rent falls short of the costs and the mortgage by <strong>{fmt(-r.cashFlow)}</strong> a month, </>
              )}
              a <strong>{signedPct(r.cashOnCash)}</strong> cash-on-cash return on the {fmtK(r.cashToClose)} you need to close.
              {r.breakEvenRent !== null && (
                <> It breaks even at <strong>{fmt(r.breakEvenRent)}</strong> a month in rent.</>
              )}
            </Takeaway>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">The month, line by line</h2>
              <div className="space-y-2">
                {line("Rent", fmt(r.lines.scheduledRent))}
                {line(`Vacancy, ${pct(inputs.vacancyPct, 1)}`, `−${fmt(r.lines.vacancy)}`)}
                {inputs.management && line(`Management, ${pct(inputs.managementPct, 1)}`, `−${fmt(r.lines.management)}`)}
                {line(`Capital reserve, ${pct(inputs.capexPct, 1)}`, `−${fmt(r.lines.capex)}`)}
                {line("Maintenance", `−${fmt(r.lines.maintenance)}`)}
                {line("Tax, insurance and HOA", `−${fmt(r.lines.taxInsHoa)}`)}
                {line("Net operating income", fmt(r.noi), "text-gray-700")}
                {line("Mortgage payment", `−${fmt(r.mortgage)}`)}
                {line("Cash flow", `${money(r.cashFlow)}/mo`, r.cashFlow >= 0 ? "text-green-700" : "text-red-700")}
              </div>
            </div>
            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">The metrics</h2>
              <div className="space-y-2">
                {line("Cash-on-cash return", signedPct(r.cashOnCash))}
                {line("Cap rate", signedPct(r.capRate))}
                {line("DSCR", r.dscr === null ? "No mortgage" : r.dscr.toFixed(2), r.dscr !== null && r.dscr < 1 ? "text-red-700" : "text-gray-900")}
                {line("Break-even rent", r.breakEvenRent === null ? "—" : `${fmt(r.breakEvenRent)}/mo`)}
                {line("Cash to close", fmt(r.cashToClose))}
                {line("Loan", `${fmtK(r.loan)}, ${pct(r.ltv, 1)} of the price`, "text-gray-700")}
              </div>
              {r.belowFannieMinimum && (
                <p className="text-xs text-amber-700 leading-relaxed mt-3">
                  Under {100 - INVESTMENT_MAX_LTV.oneUnit}% down is below Fannie Mae&apos;s minimum for a one-unit
                  investment property ({INVESTMENT_MAX_LTV.oneUnit}% LTV, Eligibility Matrix, {INVESTMENT_MATRIX_DATE}).
                </p>
              )}
              {r.llpaPct !== null && (
                <p className="text-xs text-gray-500 leading-relaxed mt-3">
                  At {pct(r.ltv, 1)} LTV, Fannie Mae charges lenders an investment-property price adjustment of{" "}
                  {r.llpaPct}% of the loan (LLPA Matrix, {INVESTMENT_LLPA_DATE}), on top of the one for your credit score.
                  Lenders usually build it into the rate, which is why investor rates run higher.
                </p>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">How each metric is worked out</h2>
            <dl className="text-xs text-gray-600 leading-relaxed space-y-2">
              <div><dt className="inline font-semibold text-gray-900">Net operating income (NOI)</dt> <dd className="inline">= rent − vacancy − management − capital reserve − maintenance − property tax − insurance − HOA. The mortgage is not in it.</dd></div>
              <div><dt className="inline font-semibold text-gray-900">Cash flow</dt> <dd className="inline">= NOI − the mortgage payment (principal and interest).</dd></div>
              <div><dt className="inline font-semibold text-gray-900">Cash-on-cash return</dt> <dd className="inline">= annual cash flow ÷ cash to close.</dd></div>
              <div><dt className="inline font-semibold text-gray-900">Cap rate</dt> <dd className="inline">= annual NOI ÷ purchase price. It ignores financing, so it compares properties, not deals.</dd></div>
              <div><dt className="inline font-semibold text-gray-900">DSCR (debt service coverage ratio)</dt> <dd className="inline">= annual NOI ÷ annual mortgage payments. Below 1, the property does not cover its own loan. Lenders define it their own way: some use gross rent, some their own vacancy and expense figures, so a lender&apos;s DSCR can differ from this one.</dd></div>
              <div><dt className="inline font-semibold text-gray-900">Break-even rent</dt> <dd className="inline">= the rent at which cash flow is zero: the costs that do not depend on rent, divided by the share of rent left after vacancy, management and the capital reserve.</dd></div>
              <div><dt className="inline font-semibold text-gray-900">Cash to close</dt> <dd className="inline">= down payment + closing costs. Lenders usually also want cash reserves left over, which this does not include.</dd></div>
            </dl>
          </div>

          <div className="border border-amber-200 bg-amber-50 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">Not modelled</h2>
            <p className="text-xs text-gray-700 leading-relaxed">
              This is a first-year snapshot before tax. It leaves out income tax on the rent, depreciation and the passive
              activity loss rules, appreciation, the principal you pay down, rent and cost growth, and turnover costs
              between tenants. Thinking of keeping the home you live in as a rental instead? The{" "}
              <Link href="/calculators/rent-or-sell" className="underline">rent out or sell calculator</Link> models a
              later sale, with appreciation, depreciation recapture and the home-sale exclusion.
            </p>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add the price, the down payment, the mortgage rate and the rent. The vacancy, management, maintenance and
            reserve assumptions are filled in; change any of them.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
