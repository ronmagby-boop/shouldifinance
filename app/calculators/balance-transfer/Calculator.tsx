"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { amortize } from "../../lib/finance";

/**
 * Run a balance at one rate for the promo window, then at another rate after.
 * Returns the month-by-month balance, total interest, and where things stand
 * the day the promotional rate ends.
 */
function runTransfer(
  start: number,
  pay: number,
  promoRate: number,
  promoMonths: number,
  afterRate: number,
) {
  let bal = start;
  let interest = 0;
  let interestInPromo = 0;
  let balAtPromoEnd = 0;
  let payoffMonths = 0;
  let clearedInPromo = false;
  const balances = [bal];
  const cap = 600;

  for (let m = 0; m < cap && bal > 0.005; m++) {
    const rate = m < promoMonths ? promoRate : afterRate;
    const mr = rate / 100 / 12;
    const charge = bal * mr;
    if (pay <= charge && mr > 0) {
      // The payment never covers interest once the promo ends.
      return {
        balances, interest: Infinity, interestInPromo,
        balAtPromoEnd: m >= promoMonths ? balAtPromoEnd : bal,
        payoffMonths: Infinity, clearedInPromo: false, stalls: true,
      };
    }
    bal = Math.max(0, bal - (pay - charge));
    interest += charge;
    if (m < promoMonths) interestInPromo += charge;
    if (m === promoMonths - 1) balAtPromoEnd = bal;
    balances.push(bal);
    payoffMonths = m + 1;
  }
  if (promoMonths === 0) balAtPromoEnd = start;
  clearedInPromo = payoffMonths <= promoMonths;
  return { balances, interest, interestInPromo, balAtPromoEnd, payoffMonths, clearedInPromo, stalls: false };
}

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [pay, setPay] = useState<Num>("");
  const [feePct, setFeePct] = useState<Num>("");
  const [promoRate, setPromoRate] = useState<Num>("");
  const [promoMonths, setPromoMonths] = useState<Num>("");
  const [afterRate, setAfterRate] = useState<Num>("");

  const loadExample = () => {
    setBalance(9200);
    setRate(23.99);
    setPay(400);
    setFeePct(3);
    setPromoRate(0);
    setPromoMonths(18);
    setAfterRate(26.99);
  };

  const r = useMemo(() => {
    const B = n(balance);
    const P = n(pay);
    const pm = Math.round(n(promoMonths));
    if (B <= 0 || P <= 0 || n(rate) <= 0 || pm < 0) return null;

    const keep = amortize(B, n(rate), 600, 0, P);
    const keepStalls = !Number.isFinite(keep.totalInterest);

    const fee = B * (Math.max(0, n(feePct)) / 100);
    const transferred = B + fee;
    const move = runTransfer(transferred, P, n(promoRate), pm, n(afterRate));

    const interestSaved = keepStalls || move.stalls
      ? Infinity
      : keep.totalInterest - move.interest - fee;
    const better = keepStalls || (!move.stalls && interestSaved > 0);

    // What it would take to clear the balance inside the promo window.
    const payToClear = pm > 0 ? transferred / pm : transferred;

    return {
      keep, keepStalls, fee, transferred, move,
      interestSaved, better, payToClear, pm,
      promoSaving: keepStalls ? 0 : Math.max(0, B * (n(rate) / 100) * (pm / 12) - move.interestInPromo),
    };
  }, [balance, rate, pay, feePct, promoRate, promoMonths, afterRate]);

  return (
    <CalcShell
      slug="balance-transfer"
      intro="A 0% window can wipe out a year or more of interest, but the transfer fee is charged up front and the old rate comes back the day the promo ends. This shows what you save, and what happens if you are still carrying a balance when the clock runs out."
      onExample={loadExample}
      relatedSlugs={["debt-payoff", "debt-consolidation", "heloc-debt-payoff"]}
      disclaimer="For educational purposes only. Transfer offers vary, and a new purchase on the card can change how payments are allocated. Missing a payment often voids the promotional rate entirely — read the terms."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The card you have" badge="CURRENT">
          <div className="space-y-4">
            <NumField label="Balance" value={balance} onChange={setBalance} placeholder="9200" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current rate" value={rate} onChange={setRate} placeholder="23.99" suffix="%" step={0.01} />
              <NumField label="Paying each month" value={pay} onChange={setPay} placeholder="400" prefix="$" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Clear at this pace</span>
                <span className="text-sm font-medium text-gray-900">
                  {r.keepStalls ? "Never" : fmtMonths(r.keep.payoffMonths)}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The offer" badge="TRANSFER" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Transfer fee" value={feePct} onChange={setFeePct} placeholder="3" suffix="%" step={0.5} />
              <NumField label="Promo rate" value={promoRate} onChange={setPromoRate} placeholder="0" suffix="%" step={0.1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Promo lasts" value={promoMonths} onChange={setPromoMonths} placeholder="18" suffix="mo" />
              <NumField label="Rate after" value={afterRate} onChange={setAfterRate} placeholder="26.99" suffix="%" step={0.01} />
            </div>
            {r && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-amber-700 font-medium">Fee added to the balance</span>
                <span className="text-sm font-medium text-amber-800">{fmt(r.fee)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Stay put</p>
                <p className="text-lg font-medium text-gray-900">
                  {r.keepStalls ? "Never clears" : fmtMonths(r.keep.payoffMonths)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.keepStalls ? "payment under interest" : `${fmtK(r.keep.totalInterest)} interest`}
                </p>
              </div>
              <div className={`p-4 text-center ${r.better ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">{r.better ? "Net saving" : "Net cost"}</p>
                <p className="text-2xl font-medium text-white">
                  {Number.isFinite(r.interestSaved) ? fmtK(Math.abs(r.interestSaved)) : "—"}
                </p>
                <p className="text-xs text-white/70">after the {fmt(r.fee)} fee</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Transfer</p>
                <p className="text-lg font-medium text-gray-900">
                  {r.move.stalls ? "Never clears" : fmtMonths(r.move.payoffMonths)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.move.stalls ? "stalls after the promo" : `${fmtK(r.move.interest)} interest`}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Interest avoided during the promo window"
              value={fmtK(r.promoSaving)}
              tone="green"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Transfer fee" value={fmt(r.fee)} tone="amber" sub={`${n(feePct)}% of the balance`} />
              <Stat label="Balance after transfer" value={fmt(r.transferred)} />
              <Stat
                label={`Owing when promo ends`}
                value={r.move.clearedInPromo ? "Paid off" : fmt(r.move.balAtPromoEnd)}
                tone={r.move.clearedInPromo ? "green" : "red"}
                sub={r.move.clearedInPromo ? `inside ${fmtMonths(r.pm)}` : `then ${n(afterRate)}% kicks in`}
              />
              <Stat
                label="To clear it in the window"
                value={`${fmt(r.payToClear)}/mo`}
                tone={n(pay) >= r.payToClear ? "green" : "amber"}
                sub={n(pay) >= r.payToClear ? "you're on track" : `${fmt(r.payToClear - n(pay))} more a month`}
              />
            </div>
            <Takeaway tone={r.move.clearedInPromo ? "green" : "amber"}>
              {r.move.clearedInPromo ? (
                <>
                  Paying <strong>{fmt(n(pay))}</strong> a month clears the balance in{" "}
                  <strong>{fmtMonths(r.move.payoffMonths)}</strong> — inside the{" "}
                  <strong>{fmtMonths(r.pm)}</strong> window. You pay the{" "}
                  <strong>{fmt(r.fee)}</strong> fee and almost nothing else. This is the case where a
                  transfer clearly wins.
                </>
              ) : (
                <>
                  At <strong>{fmt(n(pay))}</strong> a month you will still owe{" "}
                  <strong>{fmt(r.move.balAtPromoEnd)}</strong> when the promo ends, and that balance starts
                  earning <strong>{n(afterRate)}%</strong> — higher than the{" "}
                  <strong>{n(rate)}%</strong> you pay today. Raising the payment to{" "}
                  <strong>{fmt(r.payToClear)}</strong> would clear it in time.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard
            title="Balance over time"
            footnote="The transfer line starts higher because of the fee, then falls faster while the promo lasts."
          >
            <LineChart
              ariaLabel="Balance over time keeping the card compared with transferring it"
              periodsPerYear={12}
              series={[
                { label: "Stay put", color: COLORS.gray, data: r.keep.balances },
                { label: "After transfer", color: COLORS.green, data: r.move.balances, dash: [6, 3] },
              ]}
            />
          </ChartCard>

          <div className="border border-amber-200 rounded-2xl p-5 mb-4 bg-amber-50">
            <h2 className="text-sm font-medium text-amber-800 mb-3">When the promo ends</h2>
            <div className="space-y-2">
              <Takeaway tone="amber">
                The whole saving lives inside the promotional window. Anything still owing on the last day
                reverts to <strong>{n(afterRate)}%</strong>, and go-to rates on transfer cards are often
                <em> higher</em> than the card you left. Treat{" "}
                <strong>{fmt(r.payToClear)}/mo</strong> as the real target, not the minimum.
              </Takeaway>
              <Takeaway tone="red">
                A single late payment usually cancels the promotional rate on the spot. Set up the
                autopay before you move the balance, not after.
              </Takeaway>
              <Takeaway tone="blue">
                Do not spend on the new card. Purchases often sit at the go-to rate while your payments are
                applied to the promotional balance first, so the expensive part is the part that lingers.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your balance, rate and monthly payment, plus the offer you were sent.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
