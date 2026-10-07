"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Takeaway, EmptyState,
  fmt, fmtK, pct, has, n, type Num,
} from "../../components/Inputs";
import {
  HELOC_CAP_CHOICES, HELOC_REPAY_YEARS_DEFAULT,
  currentCltv, equityTooThin, limitRows, securedBalances, type Inputs,
} from "../../lib/helocLimit";

export default function Calculator() {
  const [homeValue, setHomeValue] = useState<Num>("");
  const [mortgage, setMortgage] = useState<Num>("");
  const [otherLiens, setOtherLiens] = useState<Num>("");
  const [customCap, setCustomCap] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [repayYears, setRepayYears] = useState<Num>(HELOC_REPAY_YEARS_DEFAULT);

  const loadExample = () => {
    setHomeValue(400000);
    setMortgage(250000);
    setOtherLiens("");
    setCustomCap("");
    setRate(8.5);
    setRepayYears(HELOC_REPAY_YEARS_DEFAULT);
  };

  const clearExample = () => {
    setHomeValue("");
    setMortgage("");
    setOtherLiens("");
    setCustomCap("");
    setRate("");
    setRepayYears(HELOC_REPAY_YEARS_DEFAULT);
  };

  const inputs: Inputs | null = useMemo(() => {
    if (!(n(homeValue) > 0) || !has(mortgage)) return null;
    return {
      homeValue: n(homeValue),
      mortgageBalance: n(mortgage),
      otherLiens: n(otherLiens),
      customCap: has(customCap) && n(customCap) > 0 ? n(customCap) : null,
      rate: has(rate) ? n(rate) : null,
      repayYears: n(repayYears) > 0 ? n(repayYears) : HELOC_REPAY_YEARS_DEFAULT,
    };
  }, [homeValue, mortgage, otherLiens, customCap, rate, repayYears]);

  const r = useMemo(() => {
    if (!inputs) return null;
    const rows = limitRows(inputs);
    return { rows, cltv: currentCltv(inputs), thin: equityTooThin(inputs), owed: securedBalances(inputs) };
  }, [inputs]);

  const capList = HELOC_CAP_CHOICES.map((c) => `${c}%`).join(", ");
  const headlineRow = r && (r.rows.find((row) => row.custom) ?? r.rows.find((row) => row.cap === 85) ?? r.rows[0]);

  return (
    <CalcShell
      slug="heloc-limit"
      intro="A HELOC is sized against your home's value: the lender takes a percentage of it, its combined loan-to-value cap, and subtracts everything you already owe on the home. See the line at several caps, and what the payment would be if you drew all of it."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["heloc-vs-cash-out", "heloc-debt-payoff", "blended-interest-rate", "home-affordability"]}
      disclaimer="For educational purposes only, and not an offer or a commitment to lend. Your line depends on your lender's cap, its valuation of your home, and your credit and income."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your home" className="h-full">
          <div className="space-y-4">
            <NumField label="Home value" value={homeValue} onChange={setHomeValue} min={0} placeholder="400000" prefix="$" hint="The lender uses its own appraisal or valuation, which may differ from your estimate." />
            <NumField label="Mortgage balance" value={mortgage} onChange={setMortgage} min={0} placeholder="250000" prefix="$" hint="Enter 0 if the home is paid off." />
            <NumField label="Other liens on the home" value={otherLiens} onChange={setOtherLiens} min={0} placeholder="0" prefix="$" hint="A second mortgage, home equity loan, or an existing HELOC balance. They count against the cap too." />
          </div>
        </Card>
        <Card title="The line" badge="LENDER-SPECIFIC" badgeTone="amber" className="h-full">
          <div className="space-y-4">
            <NumField
              label="Your lender's cap (optional)"
              value={customCap}
              onChange={setCustomCap}
              min={0}
              max={100}
              placeholder="e.g. 85"
              suffix="% CLTV"
              hint={`Shown alongside ${capList}. Those three are comparison points, not rules: each lender sets its own cap, so ask yours.`}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="HELOC rate (optional)" value={rate} onChange={setRate} min={0} placeholder="8.5" suffix="%" step={0.125} hint="For the payment estimates." />
              <NumField label="Repayment period" value={repayYears} onChange={setRepayYears} min={1} placeholder="15" suffix="yrs" hint="From your agreement. The CFPB says often 10 or 15 years." />
            </div>
          </div>
        </Card>
      </div>

      {r && inputs && headlineRow ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Line at a ${headlineRow.cap}% cap${headlineRow.custom ? " (yours)" : ""}`}
              value={fmt(headlineRow.line)}
              tone={headlineRow.line > 0 ? "green" : "gray"}
            />
            <Takeaway tone={r.thin ? "amber" : "blue"}>
              You owe {fmt(r.owed)} against a {fmt(inputs.homeValue)} home: a combined loan-to-value of{" "}
              <strong>{pct(r.cltv, 1)}</strong>.{" "}
              {r.thin ? (
                <>
                  That is at or above every cap shown, so there is no line to borrow at any of them. Paying the balance
                  down, or the home&apos;s value rising, is what opens one.
                </>
              ) : (
                <>Any cap above {pct(r.cltv, 1)} leaves a line; each point of cap is {fmt(inputs.homeValue / 100)}.</>
              )}
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-1">The line at each cap</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Value × cap − everything owed on the home, never below zero.
              {inputs.rate !== null &&
                ` Payments assume the whole line is drawn at ${pct(inputs.rate, 2)}: interest only during the draw period, then repaid over ${n(repayYears) > 0 ? n(repayYears) : HELOC_REPAY_YEARS_DEFAULT} years.`}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-gray-400 text-left">
                    <th className="py-2 pr-3 font-normal">CLTV cap</th>
                    <th className="py-2 pr-3 font-normal">Lender&apos;s limit</th>
                    <th className="py-2 pr-3 font-normal">Your line</th>
                    {inputs.rate !== null && <th className="py-2 pr-3 font-normal">Interest-only</th>}
                    {inputs.rate !== null && <th className="py-2 font-normal">Repaying</th>}
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.cap} className={`border-t border-gray-100 ${row.custom ? "bg-amber-50" : ""}`}>
                      <td className="py-2 pr-3">
                        {pct(row.cap, row.cap % 1 === 0 ? 0 : 1)}
                        {row.custom && <span className="text-xs text-amber-700"> yours</span>}
                      </td>
                      <td className="py-2 pr-3">{fmtK((inputs.homeValue * row.cap) / 100)}</td>
                      <td className={`py-2 pr-3 font-medium ${row.line > 0 ? "text-gray-900" : "text-gray-400"}`}>{row.line > 0 ? fmt(row.line) : "None"}</td>
                      {row.payments && <td className="py-2 pr-3">{row.line > 0 ? `${fmt(row.payments.interestOnly)}/mo` : "—"}</td>}
                      {row.payments && <td className="py-2">{row.line > 0 ? `${fmt(row.payments.amortized)}/mo` : "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mt-3">
              The {capList} rows are points to compare, not rules: no regulation sets a HELOC&apos;s cap, each lender
              chooses its own, so ask yours. A rate that moves changes these payments too.
            </p>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900 mb-3">What else sets the line</h2>
            <div className="space-y-2">
              <Takeaway tone="blue">
                <strong>The valuation.</strong> The cap applies to the lender&apos;s value, from an appraisal or a cheaper
                automated estimate, not to your own estimate. A lower value lowers every line above.
              </Takeaway>
              <Takeaway tone="blue">
                <strong>Credit and income.</strong> Equity sets the ceiling; whether you get all of it depends on your
                credit history, income and existing debts, including whether you could repay the fully drawn line.
              </Takeaway>
              <Takeaway tone="amber">
                <strong>The line can shrink later.</strong> A lender can freeze or cut a line in some circumstances, such as
                a significant fall in the home&apos;s value or a material change in your finances.
              </Takeaway>
              <Takeaway tone="green">
                Deciding between a HELOC and refinancing? The{" "}
                <Link href="/calculators/heloc-vs-cash-out" className="underline">HELOC or cash-out refinance calculator</Link>{" "}
                compares them on your numbers. Using it for card debt? See{" "}
                <Link href="/calculators/heloc-debt-payoff" className="underline">whether a HELOC pays off debt</Link>.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add your home&apos;s value and what you owe on it to see the line at each combined loan-to-value cap.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
