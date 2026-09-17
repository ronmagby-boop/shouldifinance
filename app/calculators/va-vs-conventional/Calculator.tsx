"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/**
 * VA funding fee on a purchase loan, as a percent of the loan amount.
 * Rates step down once you put money down, and rise on a later use.
 */
function fundingFeeRate(downPct: number, use: string): number {
  if (use === "exempt") return 0;
  if (downPct >= 10) return 1.25;
  if (downPct >= 5) return 1.5;
  return use === "first" ? 2.15 : 3.3;
}

/** Typical annual PMI as a percent of the loan, by credit tier. */
const PMI_BY_TIER: Record<string, number> = {
  "760": 0.30,
  "740": 0.42,
  "720": 0.56,
  "700": 0.76,
  "680": 0.95,
  "660": 1.15,
};

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [vaRate, setVaRate] = useState<Num>("");
  const [convRate, setConvRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [tier, setTier] = useState("740");
  const [use, setUse] = useState("first");

  const loadExample = () => {
    setPrice(420000);
    setDown(25000);
    setVaRate(6.25);
    setConvRate(6.5);
    setTerm(30);
    setTier("740");
    setUse("first");
  };

  const r = useMemo(() => {
    const P = n(price);
    const term_m = Math.round(n(term) * 12);
    if (P <= 0 || term_m <= 0 || n(vaRate) <= 0 || n(convRate) <= 0) return null;

    // VA path: nothing down, so the cash stays in your pocket and the funding
    // fee is rolled into the loan. No PMI, ever.
    const feePct = fundingFeeRate(0, use);
    const fee = P * (feePct / 100);
    const vaLoan = P + fee;
    const vaPI = payment(vaLoan, n(vaRate), term_m);
    const vaInterest = vaPI * term_m - vaLoan;
    const vaUpfront = 0;
    const vaLifetime = vaPI * term_m;

    // Conventional path: your cash goes in as the down payment, and PMI rides
    // along until the balance reaches 78% of the purchase price.
    const convDown = Math.min(Math.max(0, n(down)), P);
    const convLoan = Math.max(0, P - convDown);
    const ltv = P > 0 ? (convLoan / P) * 100 : 0;
    const pmiAnnualPct = ltv > 80 ? (PMI_BY_TIER[tier] ?? 0.56) : 0;
    const pmiMonthly = (convLoan * (pmiAnnualPct / 100)) / 12;
    const convPI = payment(convLoan, n(convRate), term_m);

    // Walk the loan to find when PMI falls away.
    const mr = n(convRate) / 100 / 12;
    let bal = convLoan;
    let pmiMonths = 0;
    for (let i = 0; i < term_m && bal > 0.005; i++) {
      if (pmiAnnualPct > 0 && bal > P * 0.78) pmiMonths++;
      const interest = bal * mr;
      bal = Math.max(0, bal - (convPI - interest));
    }
    const totalPMI = pmiMonthly * pmiMonths;
    const convInterest = convPI * term_m - convLoan;
    const convUpfront = convDown;
    const convLifetime = convDown + convPI * term_m + totalPMI;

    const vaFirstMonthly = vaPI;
    const convFirstMonthly = convPI + pmiMonthly;
    const lifetimeGap = convLifetime - vaLifetime;
    const vaWins = lifetimeGap > 0;

    return {
      feePct, fee, vaLoan, vaPI, vaInterest, vaUpfront, vaLifetime, vaFirstMonthly,
      convDown, convLoan, ltv, pmiAnnualPct, pmiMonthly, pmiMonths, totalPMI,
      convPI, convInterest, convUpfront, convLifetime, convFirstMonthly,
      lifetimeGap: Math.abs(lifetimeGap), vaWins,
      monthlyGap: Math.abs(convFirstMonthly - vaFirstMonthly),
    };
  }, [price, down, vaRate, convRate, term, tier, use]);

  return (
    <CalcShell
      slug="va-vs-conventional"
      intro="A VA loan asks for nothing down and charges no mortgage insurance, but it adds a funding fee to the loan. A conventional loan skips the fee and wants a down payment, plus PMI until you reach 20% equity. Put both side by side."
      onExample={loadExample}
      relatedSlugs={["mortgage-payment", "va-recoup", "home-affordability"]}
      disclaimer="For educational purposes only. Funding fee tiers and PMI rates are typical figures, not quotes — your lender's PMI depends on credit, LTV and the insurer, and VA eligibility rules change. Confirm both with a lender before deciding."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The purchase" badge="SHARED">
          <div className="space-y-4">
            <NumField label="Home price" value={price} onChange={setPrice} placeholder="420000" prefix="$" />
            <NumField
              label="Down payment you have"
              value={down}
              onChange={setDown}
              placeholder="25000"
              prefix="$"
              hint="Used by the conventional loan. The VA side assumes nothing down, which is the point of the comparison."
            />
            <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
          </div>
        </Card>

        <Card title="Rates and fees" badge="TERMS" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="VA rate" value={vaRate} onChange={setVaRate} placeholder="6.25" suffix="%" step={0.125} />
              <NumField label="Conventional rate" value={convRate} onChange={setConvRate} placeholder="6.5" suffix="%" step={0.125} />
            </div>
            <SelectField
              label="VA funding fee"
              value={use}
              onChange={setUse}
              options={[
                { value: "first", label: "First use — 2.15%" },
                { value: "subsequent", label: "Subsequent use — 3.3%" },
                { value: "exempt", label: "Exempt (service-connected disability) — 0%" },
              ]}
            />
            <SelectField
              label="Credit score (sets PMI)"
              value={tier}
              onChange={setTier}
              options={[
                { value: "760", label: "760+" },
                { value: "740", label: "740 – 759" },
                { value: "720", label: "720 – 739" },
                { value: "700", label: "700 – 719" },
                { value: "680", label: "680 – 699" },
                { value: "660", label: "Below 680" },
              ]}
            />
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="VA loan — lifetime cost" value={fmtK(r.vaLifetime)} tone={r.vaWins ? "green" : "gray"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Monthly payment" value={`${fmt(r.vaFirstMonthly)}/mo`} />
                <Stat label="Cash at closing" value={fmt(r.vaUpfront)} tone="green" sub="no down payment" />
                <Stat label="Funding fee" value={`${fmt(r.fee)} (${r.feePct}%)`} tone="amber" sub="financed into the loan" />
                <Stat label="Total interest" value={fmtK(r.vaInterest)} />
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="Conventional — lifetime cost" value={fmtK(r.convLifetime)} tone={r.vaWins ? "gray" : "green"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Monthly payment" value={`${fmt(r.convFirstMonthly)}/mo`} sub={r.pmiMonthly > 0 ? `includes ${fmt(r.pmiMonthly)} PMI` : "no PMI"} />
                <Stat label="Cash at closing" value={fmt(r.convUpfront)} tone="amber" />
                <Stat
                  label="PMI"
                  value={r.pmiMonthly > 0 ? fmtK(r.totalPMI) : "None"}
                  tone={r.pmiMonthly > 0 ? "amber" : "green"}
                  sub={r.pmiMonthly > 0 ? `${fmtMonths(r.pmiMonths)} at ${r.pmiAnnualPct}%/yr` : "20% down or more"}
                />
                <Stat label="Total interest" value={fmtK(r.convInterest)} />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Takeaway tone={r.vaWins ? "green" : "blue"}>
              Over the full term the <strong>{r.vaWins ? "VA loan" : "conventional loan"}</strong> costs{" "}
              <strong>{fmtK(r.lifetimeGap)}</strong> less. The VA route keeps{" "}
              <strong>{fmt(r.convUpfront)}</strong> in your pocket at closing but finances a{" "}
              <strong>{fmt(r.fee)}</strong> funding fee, so you start with a bigger balance.
              {r.pmiMonthly > 0 && (
                <> The conventional payment drops by <strong>{fmt(r.pmiMonthly)}/mo</strong> once PMI ends after about{" "}
                  <strong>{fmtMonths(r.pmiMonths)}</strong>.</>
              )}
            </Takeaway>
          </div>

          <ChartCard
            title="Lifetime cost, side by side"
            footnote="Cash at closing plus every payment made over the full term, including PMI."
          >
            <BarChart
              ariaLabel="Lifetime cost of a VA loan compared with a conventional loan"
              bars={[
                {
                  label: "VA loan",
                  segments: [
                    { label: "Principal", value: n(price), color: COLORS.gray },
                    { label: "Funding fee", value: r.fee, color: COLORS.purple },
                    { label: "Interest", value: r.vaInterest, color: COLORS.amber },
                  ],
                },
                {
                  label: "Conventional",
                  segments: [
                    { label: "Principal", value: n(price), color: COLORS.gray },
                    { label: "PMI", value: r.totalPMI, color: COLORS.red },
                    { label: "Interest", value: r.convInterest, color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Beyond the numbers</h2>
            <div className="space-y-2">
              <Takeaway tone="blue">
                The funding fee is one-off; PMI is a monthly drag that eventually stops. If you expect to
                sell or refinance within a few years, the fee has less time to be worth it — check the
                lifetime figures above against how long you actually plan to stay.
              </Takeaway>
              <Takeaway tone="amber">
                VA loans cap what you can be charged in closing costs and have no PMI at any LTV, but
                sellers in competitive markets sometimes prefer conventional offers. That is a negotiating
                reality this calculator cannot price.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the price, both rates and a term to compare the two loans.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
