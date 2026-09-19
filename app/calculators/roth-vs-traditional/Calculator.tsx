"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { growthSeries } from "../../lib/finance";

export default function Calculator() {
  const [contrib, setContrib] = useState<Num>("");
  const [rateNow, setRateNow] = useState<Num>("");
  const [rateLater, setRateLater] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [ret, setRet] = useState<Num>("");
  const [sideInvest, setSideInvest] = useState<Num>("");

  const loadExample = () => {
    setContrib(1000);
    setRateNow(24);
    setRateLater(18);
    setYears(25);
    setRet(7);
    setSideInvest(15);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setContrib("");
    setRateNow("");
    setRateLater("");
    setYears("");
    setRet("");
    setSideInvest("");
  };

  const r = useMemo(() => {
    const C = n(contrib);
    const yrs = n(years);
    if (C <= 0 || yrs <= 0 || n(ret) < 0) return null;

    const tNow = Math.min(Math.max(n(rateNow), 0), 100) / 100;
    const tLater = Math.min(Math.max(n(rateLater), 0), 100) / 100;

    /**
     * Roth: the contribution is made from money already taxed, so the same
     * gross pay buys a smaller contribution. Nothing is owed at the end.
     */
    const rothContribution = C * (1 - tNow);
    const roth = growthSeries({ initial: 0, contribution: rothContribution, annualRate: n(ret), years: yrs });
    const rothEnd = roth.balances[roth.balances.length - 1] ?? 0;
    const rothAfterTax = rothEnd;

    /**
     * Traditional: the full amount goes in pre-tax and grows, then every dollar
     * withdrawn is taxed at the retirement rate.
     */
    const trad = growthSeries({ initial: 0, contribution: C, annualRate: n(ret), years: yrs });
    const tradEnd = trad.balances[trad.balances.length - 1] ?? 0;
    const tradTax = tradEnd * tLater;
    const tradAfterTax = tradEnd - tradTax;

    /**
     * The honest version of Traditional: the tax you did not pay up front is
     * real money. If you invest that side amount too, it grows in a taxable
     * account — taxed along the way at the assumed drag.
     */
    const taxSaved = C * tNow;
    const netRet = n(ret) * (1 - Math.min(Math.max(n(sideInvest), 0), 100) / 100);
    const side = growthSeries({ initial: 0, contribution: taxSaved, annualRate: netRet, years: yrs });
    const sideEnd = side.balances[side.balances.length - 1] ?? 0;
    const tradWithSide = tradAfterTax + sideEnd;

    const gap = rothAfterTax - tradAfterTax;
    const gapWithSide = rothAfterTax - tradWithSide;
    const rothWins = gap > 0;

    return {
      rothContribution, rothEnd, rothAfterTax,
      tradEnd, tradTax, tradAfterTax,
      taxSaved, sideEnd, tradWithSide, netRet,
      gap: Math.abs(gap), gapWithSide: Math.abs(gapWithSide),
      rothWins, rothWinsWithSide: gapWithSide > 0,
      contributedRoth: roth.contributed,
      contributedTrad: trad.contributed,
      sameRate: Math.abs(n(rateNow) - n(rateLater)) < 0.01,
    };
  }, [contrib, rateNow, rateLater, years, ret, sideInvest]);

  return (
    <CalcShell
      slug="roth-vs-traditional"
      intro="Roth pays the tax now, Traditional pays it in retirement. If your bracket is the same either way the two are identical — so the whole question is whether you expect to be taxed more or less later."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["retirement-savings", "early-withdrawal", "investment-growth"]}
      disclaimer="For educational purposes only and not tax advice. Real brackets are progressive, so a blended retirement rate is usually lower than your marginal rate today. Contribution limits, RMDs and state taxes all matter — talk to a tax professional."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="What you're putting in" badge="SHARED">
          <div className="space-y-4">
            <NumField
              label="Contribution each month"
              value={contrib}
              onChange={setContrib}
              placeholder="1000"
              prefix="$"
              hint="Measured before tax, so both paths start from the same gross pay."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Years until retirement" value={years} onChange={setYears} placeholder="25" suffix="yrs" />
              <NumField label="Expected return" value={ret} onChange={setRet} placeholder="7" suffix="%" step={0.5} />
            </div>
          </div>
        </Card>

        <Card title="Your tax rates" badge="THE DECIDER" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Marginal rate today" value={rateNow} onChange={setRateNow} placeholder="24" suffix="%" />
              <NumField label="Expected in retirement" value={rateLater} onChange={setRateLater} placeholder="18" suffix="%" />
            </div>
            <NumField
              label="Tax drag on side investing"
              value={sideInvest}
              onChange={setSideInvest}
              placeholder="15"
              suffix="%"
              hint="Traditional frees up cash today. If you invest it in a taxable account, this is the bite taken out of its return."
            />
            {r && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-blue-600 font-medium">Roth buys you</span>
                <span className="text-sm font-medium text-blue-800">{fmt(r.rothContribution)}/mo</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="Roth — yours to keep" value={fmtK(r.rothAfterTax)} tone={r.rothWins ? "green" : "gray"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Goes in each month" value={fmt(r.rothContribution)} sub={`${fmt(n(contrib))} less tax`} />
                <Stat label="Contributed in total" value={fmtK(r.contributedRoth)} />
                <Stat label="Tax at retirement" value="None" tone="green" />
                <Stat label="Balance at the end" value={fmtK(r.rothEnd)} />
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="Traditional — after the tax bill" value={fmtK(r.tradAfterTax)} tone={r.rothWins ? "gray" : "green"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Goes in each month" value={fmt(n(contrib))} sub="full pre-tax amount" />
                <Stat label="Contributed in total" value={fmtK(r.contributedTrad)} />
                <Stat label="Tax at retirement" value={fmtK(r.tradTax)} tone="amber" sub={pct(n(rateLater), 0)} />
                <Stat label="Balance at the end" value={fmtK(r.tradEnd)} />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={r.sameRate ? "Difference between them" : `${r.rothWins ? "Roth" : "Traditional"} comes out ahead by`}
              value={fmtK(r.gap)}
              tone={r.sameRate ? "gray" : "green"}
            />
            <Takeaway tone={r.sameRate ? "blue" : r.rothWins ? "green" : "amber"}>
              {r.sameRate ? (
                <>
                  Your rate is the same in both periods, so the two land within rounding of each other —
                  which is the point. When brackets match, Roth and Traditional are mathematically
                  identical. Choose on flexibility instead: Roth has no required distributions and its
                  contributions can be withdrawn without penalty.
                </>
              ) : r.rothWins ? (
                <>
                  You expect to pay <strong>{pct(n(rateNow), 0)}</strong> now and{" "}
                  <strong>{pct(n(rateLater), 0)}</strong> later. Paying the lower rate later is not on
                  offer here, so locking in tax at today&apos;s rate leaves you{" "}
                  <strong>{fmtK(r.gap)}</strong> better off. Roth is the call.
                </>
              ) : (
                <>
                  You expect <strong>{pct(n(rateNow), 0)}</strong> now against{" "}
                  <strong>{pct(n(rateLater), 0)}</strong> in retirement. Deferring the tax into the lower
                  bracket wins by <strong>{fmtK(r.gap)}</strong>. Traditional is the call — provided your
                  retirement rate really does come in lower.
                </>
              )}
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900 mb-3">If you invest the tax break too</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Tax saved each month" value={fmt(r.taxSaved)} tone="green" />
              <Stat label="Side pot at the end" value={fmtK(r.sideEnd)} sub={`at ${r.netRet.toFixed(1)}% after drag`} />
              <Stat label="Traditional plus side pot" value={fmtK(r.tradWithSide)} />
              <Stat
                label={r.rothWinsWithSide ? "Roth still ahead by" : "Traditional ahead by"}
                value={fmtK(r.gapWithSide)}
                tone={r.rothWinsWithSide ? "green" : "amber"}
              />
            </div>
            <Takeaway tone="blue">
              This is the comparison most people skip. Traditional hands you{" "}
              <strong>{fmt(r.taxSaved)}</strong> a month you would otherwise pay in tax. Investing it makes
              Traditional look much stronger — but only if you genuinely invest it rather than spend it.
              If it gets spent, the figures in the panel above are the real ones.
            </Takeaway>
          </div>

          <ChartCard title="What you actually keep" footnote="After every tax bill has been paid.">
            <BarChart
              ariaLabel="After-tax retirement value of Roth compared with Traditional"
              bars={[
                {
                  label: "Roth",
                  segments: [{ label: "Yours, tax free", value: r.rothAfterTax, color: COLORS.green }],
                },
                {
                  label: "Traditional",
                  segments: [
                    { label: "After tax", value: r.tradAfterTax, color: COLORS.gray },
                    { label: "Tax owed", value: r.tradTax, color: COLORS.red },
                  ],
                },
                {
                  label: "Traditional + side pot",
                  segments: [
                    { label: "After tax", value: r.tradAfterTax, color: COLORS.gray },
                    { label: "Side investments", value: r.sideEnd, color: COLORS.blue },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter a contribution, both tax rates and your time horizon to compare.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
