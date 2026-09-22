"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, has, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { effectiveAnnualRate } from "../../lib/finance";

/** Compounding periods a year, in the order the dropdown offers them. */
const FREQ: Record<string, number> = {
  daily: 365, monthly: 12, quarterly: 4, semiannually: 2, annually: 1,
};

export default function Calculator() {
  const [savingRate, setSavingRate] = useState<Num>("");
  const [freq, setFreq] = useState("monthly");
  const [deposit, setDeposit] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [inflation, setInflation] = useState<Num>("");

  const loadExample = () => {
    setSavingRate(4.5);
    setFreq("monthly");
    setDeposit(25000);
    setYears(10);
    setInflation(2.5);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setSavingRate("");
    setFreq("monthly");
    setDeposit("");
    setYears("");
    setInflation("");
  };

  const saving = useMemo(() => {
    /* A typed 0% is a real answer — a checking account earning nothing — so
     * the gate asks whether the field is filled, not whether it is positive.
     * Only a blank rate falls through to the empty state. */
    if (!has(savingRate) || n(savingRate) < 0) return null;

    const yrs = Math.max(1, n(years));
    const apy = effectiveAnnualRate(n(savingRate), FREQ[freq]);
    const perYear = n(deposit) * (apy / 100);
    const simpleYear = n(deposit) * (n(savingRate) / 100);
    const comparisons = Object.entries(FREQ).map(([label, periods]) => ({
      label,
      apy: effectiveAnnualRate(n(savingRate), periods),
    }));

    /* Everything over the holding period grows at the same APY the headline
     * shows, so the tiles, the line under it and the narrative cannot drift. */
    const balance = n(deposit) * Math.pow(1 + apy / 100, yrs);
    const realBalance = balance / Math.pow(1 + n(inflation) / 100, yrs);

    /* What the bank's crediting schedule is worth over the whole period —
     * the same ladder the chart plots, priced in dollars instead of percent. */
    const apys = comparisons.map((c) => c.apy);
    const freqGap =
      n(deposit) * Math.pow(1 + Math.max(...apys) / 100, yrs) -
      n(deposit) * Math.pow(1 + Math.min(...apys) / 100, yrs);

    return {
      apy, perYear, simpleYear, bonus: perYear - simpleYear, comparisons,
      yrs, balance, totalInterest: balance - n(deposit), realBalance, freqGap,
      hasDeposit: n(deposit) > 0,
    };
  }, [savingRate, freq, deposit, years, inflation]);

  return (
    <CalcShell
      slug="savings-apy"
      intro="Banks quote a nominal rate, but interest paid monthly starts earning interest of its own, so what you actually collect over a year is higher. That figure is the APY, and it is the only number worth comparing between accounts — two banks can advertise the same rate and pay different amounts."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["compound-interest", "emergency-fund", "effective-interest-rate"]}
      disclaimer="For educational purposes only. Banks must disclose an APY under the Truth in Savings Act, so compare that figure rather than the nominal rate. Advertised rates on savings accounts are variable and can change without notice, and introductory rates often fall after a promotional period."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The quoted yield" badge="SAVING" badgeTone="green">
          <div className="space-y-4">
            <NumField
              label="Nominal annual rate"
              value={savingRate}
              onChange={setSavingRate}
              min={0}
              placeholder="4.5"
              suffix="%"
              step={0.05}
              hint="The headline rate, before compounding. If the bank only shows an APY, it has already done this sum for you."
            />
            <SelectField
              label="Compounding frequency"
              value={freq}
              onChange={setFreq}
              options={[
                { value: "daily", label: "Daily" },
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "semiannually", label: "Semi-annually" },
                { value: "annually", label: "Annually" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Deposit" value={deposit} onChange={setDeposit} min={0} placeholder="25000" prefix="$" />
              <NumField label="Years held" value={years} onChange={setYears} min={1} placeholder="1" suffix="yrs" />
            </div>
            <NumField
              label="Inflation"
              value={inflation}
              onChange={setInflation}
              min={0}
              placeholder="2.5"
              suffix="%"
              step={0.1}
              hint="Used only to show what the balance buys in today's money. Set it to 0 to see the nominal figure alone."
            />
          </div>
        </Card>

        <Card title="What you actually earn" badge="APY" badgeTone="green" className="bg-gray-50">
          {saving ? (
            <>
              <Headline label="Effective annual yield (APY)" value={pct(saving.apy, 3)} />
              {/* The headline is a percentage, so the holding period gets a
                  sentence rather than tiles — it names the balance it is
                  talking about, which a bare "in today's money" could not.
                  At the default of one year with no inflation entered it does
                  not render, leaving the year-one figures on their own. */}
              {saving.hasDeposit && (saving.yrs > 1 || n(inflation) > 0) && (
                <p className="text-xs text-gray-500 leading-relaxed -mt-3 mb-4">
                  Your {fmtK(n(deposit))} becomes{" "}
                  <strong className="text-gray-900">{fmtK(saving.balance)}</strong> after {saving.yrs}{" "}
                  year{saving.yrs === 1 ? "" : "s"}, {fmtK(saving.totalInterest)} of it interest.
                  {n(inflation) > 0 && (
                    <>
                      {" "}
                      That is about <strong className="text-gray-900">{fmtK(saving.realBalance)}</strong> in
                      today&apos;s money, after {pct(n(inflation), 1)} inflation — the balance is real;
                      what it buys is the smaller number.
                    </>
                  )}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Nominal rate" value={pct(n(savingRate), 3)} />
                <Stat label="Compounding bonus" value={`+${pct(saving.apy - n(savingRate), 3)}`} tone="green" />
                <Stat label="First-year interest" value={fmt(saving.perYear)} tone="green" />
                <Stat label="Without compounding" value={fmt(saving.simpleYear)} />
              </div>
              <Takeaway>
                Compounding {freq} turns a {pct(n(savingRate), 2)} rate into a{" "}
                <strong>{pct(saving.apy, 3)}</strong> yield
                {saving.hasDeposit ? (
                  <>
                    {" "}
                    — an extra <strong>{fmt(saving.bonus)}</strong> in the first year on a{" "}
                    {fmt(n(deposit))} deposit.
                  </>
                ) : (
                  <>. Add a deposit to see what that is worth in dollars.</>
                )}{" "}
                When comparing accounts, always compare APY to APY; the headline rate hides this
                difference.
              </Takeaway>
            </>
          ) : (
            <EmptyState>Enter a nominal savings rate to see its true yield.</EmptyState>
          )}
        </Card>
      </div>

      {saving && (
        <ChartCard title="Same rate, different compounding">
          <BarChart
            ariaLabel="Effective annual yield at different compounding frequencies for the same nominal rate"
            height={200}
            bars={saving.comparisons.map((c) => ({
              label: c.label.charAt(0).toUpperCase() + c.label.slice(1),
              segments: [{ label: "APY", value: c.apy, color: c.label === freq ? COLORS.green : COLORS.gray }],
            }))}
            valueFormat={(v) => `${v.toFixed(3)}%`}
          />
          <div className="mt-4">
            <Takeaway tone="blue">
              More frequent compounding always yields more, but the gains shrink fast — moving from annual
              to monthly matters far more than moving from monthly to daily.
              {saving.yrs > 1 && saving.freqGap >= 1 && (
                <>
                  {" "}
                  Over {saving.yrs} years on {fmtK(n(deposit))}, daily compounding pays{" "}
                  <strong>{fmtK(saving.freqGap)}</strong> more than annual — worth having, but far less
                  than a better rate would be.
                </>
              )}
            </Takeaway>
          </div>
        </ChartCard>
      )}
    </CalcShell>
  );
}
