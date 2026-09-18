"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";

export default function Calculator() {
  const [value, setValue] = useState<Num>("");
  const [balance, setBalance] = useState<Num>("");
  const [sellPct, setSellPct] = useState<Num>("");
  const [newPrice, setNewPrice] = useState<Num>("");
  const [newDownPct, setNewDownPct] = useState<Num>("");
  const [otherCash, setOtherCash] = useState<Num>("");
  const [bridgeCost, setBridgeCost] = useState<Num>("");
  /** Sell-first has its own carrying cost; one shared field only ever charged
   *  the buy-first side, which made buying first look dearer than it is. */
  const [tempHousing, setTempHousing] = useState<Num>("");
  const [needProceeds, setNeedProceeds] = useState(true);

  const loadExample = () => {
    setValue(480000);
    setBalance(265000);
    setSellPct(7);
    setNewPrice(610000);
    setNewDownPct(20);
    setOtherCash(30000);
    setBridgeCost(9000);
    setTempHousing(4000);
    setNeedProceeds(true);
  };

  const r = useMemo(() => {
    const V = n(value);
    const NP = n(newPrice);
    if (V <= 0 || NP <= 0) return null;

    const sellingCosts = V * (Math.max(0, n(sellPct)) / 100);
    const netProceeds = V - sellingCosts - n(balance);
    const downNeeded = NP * (Math.min(Math.max(n(newDownPct), 0), 100) / 100);

    // Both paths put the SAME down payment on the table. What differs is when
    // the money has to exist and where it comes from — not the amount.
    // Sell first: the sale closes, so proceeds fund the down payment first.
    const sellFirstAvailable = netProceeds + n(otherCash);
    const sellFirstShortfall = Math.max(0, downNeeded - sellFirstAvailable);
    const fromProceeds = Math.min(Math.max(0, netProceeds), downNeeded);
    const ownCashSellFirst = Math.max(0, downNeeded - Math.max(0, netProceeds));

    // Buy first: the equity is still locked in the old home, so the whole down
    // payment has to come from savings or a bridge before any sale closes.
    const buyFirstAvailable = n(otherCash);
    const buyFirstShortfall = Math.max(0, downNeeded - buyFirstAvailable);
    const fromSavings = Math.min(n(otherCash), downNeeded);
    const bridgeNeeded = buyFirstShortfall > 0;

    // The only genuine dollar difference between the paths: what each one costs
    // to carry. Everything else is timing.
    const sellFirstOutlay = downNeeded + n(tempHousing);
    const buyFirstOutlay = downNeeded + n(bridgeCost);
    const costDifference = n(bridgeCost) - n(tempHousing);

    return {
      sellingCosts, netProceeds, downNeeded,
      sellFirstAvailable, sellFirstShortfall, fromProceeds, ownCashSellFirst,
      buyFirstAvailable, buyFirstShortfall, fromSavings, bridgeNeeded,
      sellFirstOutlay, buyFirstOutlay, costDifference,
      equity: V - n(balance),
      canBuyFirstOutright: !bridgeNeeded,
      sellFirstWorks: sellFirstShortfall <= 0,
    };
  }, [value, balance, sellPct, newPrice, newDownPct, otherCash, bridgeCost, tempHousing]);

  return (
    <CalcShell
      slug="sell-first-or-buy-first"
      intro="Selling first is cheaper and safer but can leave you without a home for a while. Buying first is smoother to live through but needs the down payment before your equity is free. This works out the cash each path needs."
      onExample={loadExample}
      relatedSlugs={["home-affordability", "mortgage-payment", "rent-vs-buy"]}
      disclaimer="For educational purposes only. Bridge loans, contingent offers and rent-back agreements vary a lot by lender and market, and a sale that falls through changes everything. Talk to an agent and a lender about what is realistic where you are buying."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The home you're selling" badge="CURRENT">
          <div className="space-y-4">
            <NumField label="What it's worth" value={value} onChange={setValue} placeholder="480000" prefix="$" />
            <NumField label="Mortgage still owed" value={balance} onChange={setBalance} placeholder="265000" prefix="$" />
            <NumField
              label="Selling costs"
              value={sellPct}
              onChange={setSellPct}
              placeholder="7"
              suffix="%"
              hint="Agent commission, transfer taxes and the usual concessions — commonly 6–9%."
            />
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Net proceeds</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.netProceeds)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The home you're buying" badge="NEXT" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Price" value={newPrice} onChange={setNewPrice} placeholder="610000" prefix="$" />
              <NumField label="Down payment" value={newDownPct} onChange={setNewDownPct} placeholder="20" suffix="%" />
            </div>
            <NumField
              label="Savings you can use"
              value={otherCash}
              onChange={setOtherCash}
              placeholder="30000"
              prefix="$"
              hint="Cash on hand, not counting anything tied up in the current home."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Bridge cost if you buy first" value={bridgeCost} onChange={setBridgeCost} placeholder="9000" prefix="$" />
              <NumField label="Housing cost if you sell first" value={tempHousing} onChange={setTempHousing} placeholder="4000" prefix="$" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Bridge fees and interest on one side; storage, a short rental or a rent-back on the other.
              These are the only figures that genuinely differ between the paths — the down payment
              itself is the same either way.
            </p>
            <Toggle checked={needProceeds} onChange={setNeedProceeds}>
              I need the sale proceeds to cover the down payment
            </Toggle>
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline
                label="Sell first — down payment at closing"
                value={fmt(r.downNeeded)}
                tone="green"
              />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Stat label="Funded by the sale" value={fmt(r.fromProceeds)} tone="green" sub="already in hand" />
                <Stat
                  label="Funded by your cash"
                  value={r.ownCashSellFirst > 0 ? fmt(r.ownCashSellFirst) : "None needed"}
                  tone={r.ownCashSellFirst > 0 ? "amber" : "green"}
                />
                <Stat
                  label="Still short"
                  value={r.sellFirstShortfall > 0 ? fmt(r.sellFirstShortfall) : "None"}
                  tone={r.sellFirstShortfall > 0 ? "red" : "green"}
                  sub={r.sellFirstShortfall > 0 ? "proceeds and savings combined" : "proceeds and savings cover it"}
                />
                <Stat label="Typical timeline" value="1–3 months" sub="sale closes, then you buy" />
              </div>
              <Takeaway tone="green">
                You know exactly what you have to spend and carry one mortgage at a time. The cost is
                flexibility: you may need a rent-back or a short let between closings.
              </Takeaway>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline
                label="Buy first — down payment at closing"
                value={fmt(r.downNeeded)}
                tone={r.canBuyFirstOutright ? "green" : "red"}
              />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Stat label="Funded by the sale" value="Nothing yet" tone="amber" sub="equity is locked until you sell" />
                <Stat label="Funded by your cash" value={fmt(r.fromSavings)} tone={r.canBuyFirstOutright ? "green" : "default"} />
                <Stat
                  label="Needs a bridge"
                  value={r.bridgeNeeded ? fmt(r.buyFirstShortfall) : "No"}
                  tone={r.bridgeNeeded ? "red" : "green"}
                  sub={r.bridgeNeeded ? "borrowed until the sale closes" : "savings cover it outright"}
                />
                <Stat label="Typical timeline" value="2–4 months" sub="buy, move, then sell" />
              </div>
              <Takeaway tone={r.bridgeNeeded ? "amber" : "blue"}>
                You move once and never live in limbo. The risk is carrying both homes if the sale is slow —
                two mortgages, and a price cut if you get impatient.
              </Takeaway>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            {/* Both paths put the same down payment on the table. The old panel
                subtracted two different quantities and presented the result as a
                cost of buying first, which it never was. */}
            <Headline
              label={
                r.costDifference === 0
                  ? "Cost difference between the paths"
                  : r.costDifference > 0
                    ? "Buying first costs more to carry"
                    : "Selling first costs more to carry"
              }
              value={fmt(Math.abs(r.costDifference))}
              tone={r.costDifference === 0 ? "green" : "gray"}
            />
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Both paths need the same{" "}
              <strong className="font-medium text-gray-500">{fmt(r.downNeeded)}</strong> down payment.
              This is the difference in what each costs to carry — {fmt(n(bridgeCost))} of
              bridge against {fmt(n(tempHousing))} of temporary housing. The real decision is timing
              and financing, not the size of the check.
            </p>
            <Takeaway tone={needProceeds && r.bridgeNeeded ? "red" : "blue"}>
              {needProceeds && r.bridgeNeeded ? (
                <>
                  You said you need the sale proceeds for the down payment, and your savings fall{" "}
                  <strong>{fmt(r.buyFirstShortfall)}</strong> short of it. Buying first means a bridge loan
                  or a sale contingency — expect the contingency to weaken your offer in a competitive
                  market. Selling first is the realistic path here.
                </>
              ) : r.canBuyFirstOutright ? (
                <>
                  Your savings of <strong>{fmt(r.buyFirstAvailable)}</strong> already cover the{" "}
                  <strong>{fmt(r.downNeeded)}</strong> down payment, so you can buy first without a bridge. That
                  buys you a clean move and a stronger offer — just make sure you could carry both
                  mortgages for a few months if the sale drags.
                </>
              ) : (
                <>
                  Buying first needs <strong>{fmt(r.buyFirstShortfall)}</strong> more than you have in
                  savings, so it depends on a bridge loan. Price that borrowing carefully — it is short
                  term and usually expensive.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Cash needed up front" footnote="The same down payment either way — the bars differ in where the money comes from and when, plus each path's carrying cost.">
            <BarChart
              ariaLabel="Cash needed up front when selling first compared with buying first"
              height={200}
              bars={[
                {
                  label: "Sell first",
                  segments: [
                    { label: "From proceeds", value: r.fromProceeds, color: COLORS.green },
                    { label: "From savings", value: r.ownCashSellFirst, color: COLORS.blue },
                    { label: "Carrying cost", value: n(tempHousing), color: COLORS.amber },
                  ],
                },
                {
                  label: "Buy first",
                  segments: [
                    { label: "From savings", value: r.fromSavings, color: COLORS.blue },
                    { label: "Borrowed on a bridge", value: r.buyFirstShortfall, color: COLORS.red },
                    { label: "Carrying cost", value: n(bridgeCost), color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Risks worth pricing</h2>
            <div className="space-y-2">
              <Takeaway tone="amber">
                <strong>Selling first:</strong> you are a cash-ready buyer, which is strong. But if you
                cannot find the next home quickly you are renting, moving twice, and paying for storage.
                Negotiate a rent-back from your buyer if you can.
              </Takeaway>
              <Takeaway tone="red">
                <strong>Buying first:</strong> the danger is a sale that stalls. Work out how many months
                of two mortgages you could absorb, and treat that as your real deadline — a forced price
                cut usually costs more than a bridge loan ever would.
              </Takeaway>
              <Takeaway tone="blue">
                Your equity of <strong>{fmt(r.equity)}</strong> becomes{" "}
                <strong>{fmt(r.netProceeds)}</strong> after {pct(n(sellPct), 1)} in selling costs. That gap
                of <strong>{fmt(r.sellingCosts)}</strong> is the number most people forget.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your current home&apos;s value and the price of the next one.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
