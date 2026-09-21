"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, pct, n, type Num,
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

  const loadExample = () => {
    setSavingRate(4.5);
    setFreq("monthly");
    setDeposit(25000);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setSavingRate("");
    setFreq("monthly");
    setDeposit("");
  };

  const saving = useMemo(() => {
    if (n(savingRate) <= 0) return null;
    const apy = effectiveAnnualRate(n(savingRate), FREQ[freq]);
    const annual = FREQ[freq];
    const perYear = n(deposit) * (apy / 100);
    const simpleYear = n(deposit) * (n(savingRate) / 100);
    const comparisons = Object.entries(FREQ).map(([label, periods]) => ({
      label,
      apy: effectiveAnnualRate(n(savingRate), periods),
    }));
    return { apy, annual, perYear, simpleYear, bonus: perYear - simpleYear, comparisons };
  }, [savingRate, freq, deposit]);

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
            <NumField label="Deposit amount" value={deposit} onChange={setDeposit} min={0} placeholder="25000" prefix="$" />
          </div>
        </Card>

        <Card title="What you actually earn" badge="APY" badgeTone="green" className="bg-gray-50">
          {saving ? (
            <>
              <Headline label="Effective annual yield (APY)" value={pct(saving.apy, 3)} />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Nominal rate" value={pct(n(savingRate), 3)} />
                <Stat label="Compounding bonus" value={`+${pct(saving.apy - n(savingRate), 3)}`} tone="green" />
                <Stat label="First-year interest" value={fmt(saving.perYear)} tone="green" />
                <Stat label="Without compounding" value={fmt(saving.simpleYear)} />
              </div>
              <Takeaway>
                Compounding {freq} turns a {pct(n(savingRate), 2)} rate into a{" "}
                <strong>{pct(saving.apy, 3)}</strong> yield — an extra{" "}
                <strong>{fmt(saving.bonus)}</strong> in the first year on a {fmt(n(deposit))} deposit. When
                comparing accounts, always compare APY to APY; the headline rate hides this difference.
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
            </Takeaway>
          </div>
        </ChartCard>
      )}
    </CalcShell>
  );
}
