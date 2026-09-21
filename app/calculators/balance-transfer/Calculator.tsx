"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/** Same guard as debt-payoff, debt-consolidation and heloc-debt-payoff. */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;

/**
 * One schedule, used for both paths.
 *
 * Both sides of this comparison used to be computed by different functions —
 * the stay-put path by the shared amortize(), the transfer by a local loop —
 * and the "interest avoided" headline by a third expression that was neither.
 * That is how the page came to claim it avoided more interest in eighteen
 * months than staying put cost over thirty-two.
 *
 * A path with no promotional period is just this with promoMonths at zero and
 * the same rate on both sides, so the stay-put case runs through here too.
 * `windowMonths` is tracked separately from `promoMonths` so the two paths can
 * be compared over the same stretch of calendar.
 */
function runSchedule(
  start: number,
  pay: number,
  promoRate: number,
  promoMonths: number,
  afterRate: number,
  windowMonths: number,
) {
  let bal = start;
  let interest = 0;
  let interestInWindow = 0;
  let balAtPromoEnd = promoMonths === 0 ? start : 0;
  let payoffMonths = 0;
  const balances = [bal];

  for (let m = 0; m < 600 && bal > 0.005; m++) {
    const rate = m < promoMonths ? promoRate : afterRate;
    const mr = rate / 100 / 12;
    const charge = bal * mr;
    if (pay <= charge * INTEREST_ONLY_EPSILON && mr > 0) {
      return {
        balances,
        interest: Infinity,
        interestInWindow,
        balAtPromoEnd: m >= promoMonths ? balAtPromoEnd : bal,
        payoffMonths: Infinity,
        clearedInPromo: false,
        stalls: true,
      };
    }
    bal = Math.max(0, bal - (pay - charge));
    interest += charge;
    if (m < windowMonths) interestInWindow += charge;
    if (m === promoMonths - 1) balAtPromoEnd = bal;
    balances.push(bal);
    payoffMonths = m + 1;
  }
  return {
    balances,
    interest,
    interestInWindow,
    balAtPromoEnd,
    payoffMonths,
    clearedInPromo: promoMonths > 0 && payoffMonths <= promoMonths,
    stalls: false,
  };
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

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setBalance("");
    setRate("");
    setPay("");
    setFeePct("");
    setPromoRate("");
    setPromoMonths("");
    setAfterRate("");
  };

  const r = useMemo(() => {
    const B = n(balance);
    const P = n(pay);
    const pm = Math.max(0, Math.round(n(promoMonths)));
    if (B <= 0 || n(rate) <= 0) return null;

    /* A payment below the month's interest never clears the card, and every
     * figure downstream would be an infinity dressed up as a dollar sign. Say
     * which it is rather than going blank. */
    const monthlyInterest = (B * n(rate)) / 100 / 12;
    if (P <= 0 || P <= monthlyInterest * INTEREST_ONLY_EPSILON) {
      return { blocked: true as const, noPayment: P <= 0, monthlyInterest };
    }

    const keep = runSchedule(B, P, n(rate), 0, n(rate), pm);
    const fee = (B * Math.max(0, n(feePct))) / 100;
    const transferred = B + fee;
    const move = runSchedule(transferred, P, n(promoRate), pm, n(afterRate), pm);

    const interestSaved = move.stalls ? -Infinity : keep.interest - move.interest - fee;
    const better = !move.stalls && interestSaved > 0;

    /* The figure this page got wrong. It used to be
     *   balance × rate × (promoMonths / 12)
     * which is simple interest on the opening balance, as though nothing were
     * ever repaid — larger than the whole cost of staying put. It is the
     * interest the stay-put schedule actually accrues over the window, less
     * whatever the promotional rate charges over the same months. */
    const promoAvoided = keep.interestInWindow - move.interestInWindow;

    // What it takes to clear the transferred balance inside the window. An
    // annuity rather than a division, so a promo rate above 0% is charged for.
    const payToClear = pm > 0 ? payment(transferred, n(promoRate), pm) : 0;

    return {
      blocked: false as const,
      keep, fee, transferred, move,
      interestSaved, better, payToClear, pm,
      promoAvoided,
      hasWindow: pm > 0,
      reverts: n(afterRate) > n(rate),
      monthlyInterest,
    };
  }, [balance, rate, pay, feePct, promoRate, promoMonths, afterRate]);

  return (
    <CalcShell
      slug="balance-transfer"
      intro="A 0% window can wipe out a year or more of interest, but the transfer fee is charged up front and a new rate takes over the day the promo ends. This shows what you save, and what happens if you are still carrying a balance when the clock runs out."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-payoff", "debt-consolidation", "heloc-debt-payoff"]}
      disclaimer="For educational purposes only. Transfer offers vary and the rate you are approved for may not be the one advertised. Carrying a transferred balance usually costs you the grace period on new purchases, so read the terms before you spend on the card."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The card you have" badge="CURRENT">
          <div className="space-y-4">
            <NumField label="Balance" value={balance} onChange={setBalance} min={0} placeholder="9200" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current rate" value={rate} onChange={setRate} min={0} placeholder="23.99" suffix="%" step={0.01} />
              <NumField label="Paying each month" value={pay} onChange={setPay} min={0} placeholder="400" prefix="$" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Clear at this pace</span>
                <span className="text-sm font-medium text-gray-900">
                  {r.blocked ? "Never" : fmtMonths(r.keep.payoffMonths)}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The offer" badge="TRANSFER" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Transfer fee" value={feePct} onChange={setFeePct} min={0} placeholder="3" suffix="%" step={0.5} />
              <NumField label="Promo rate" value={promoRate} onChange={setPromoRate} min={0} placeholder="0" suffix="%" step={0.1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Promo lasts" value={promoMonths} onChange={setPromoMonths} min={0} placeholder="18" suffix="mo" />
              <NumField label="Rate after" value={afterRate} onChange={setAfterRate} min={0} placeholder="26.99" suffix="%" step={0.01} />
            </div>
            {r && !r.blocked && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-amber-700 font-medium">Fee added to the balance</span>
                <span className="text-sm font-medium text-amber-800">{fmt(r.fee)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r && r.blocked ? (
        <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-red-800 mb-1">
            {r.noPayment ? "Enter what you pay each month" : "This payment never clears the card"}
          </p>
          <p className="text-xs text-red-800 leading-relaxed">
            {r.noPayment ? (
              <>
                Interest on {fmt(n(balance))} at {n(rate)}% runs{" "}
                <strong>{fmt(r.monthlyInterest)}</strong> a month. Whatever you pay has to beat that
                before any of it reaches the balance, and a transfer only changes the rate — not the
                arithmetic.
              </>
            ) : (
              <>
                {fmt(n(pay))} a month does not cover the <strong>{fmt(r.monthlyInterest)}</strong> of
                interest {fmt(n(balance))} at {n(rate)}% accrues, so the balance grows. A promotional
                rate would pause that for a while, but the payment still has to beat the interest once
                the window closes, or the card never clears.
              </>
            )}
          </p>
        </div>
      ) : r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Stay put</p>
                <p className="text-lg font-medium text-gray-900">{fmtMonths(r.keep.payoffMonths)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtK(r.keep.interest)} interest</p>
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
              label={
                r.hasWindow
                  ? `Interest avoided over the ${fmtMonths(r.pm)} window`
                  : r.better
                    ? "Net saving after the fee"
                    : "Net cost after the fee"
              }
              value={
                r.hasWindow
                  ? fmtK(r.promoAvoided)
                  : Number.isFinite(r.interestSaved)
                    ? fmtK(Math.abs(r.interestSaved))
                    : "—"
              }
              tone={r.hasWindow ? "green" : r.better ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Transfer fee" value={fmt(r.fee)} tone="amber" sub={`${n(feePct)}% of the balance`} />
              <Stat label="Balance after transfer" value={fmt(r.transferred)} />
              <Stat
                label="Owing when promo ends"
                value={!r.hasWindow ? "No window" : r.move.clearedInPromo ? "Paid off" : fmt(r.move.balAtPromoEnd)}
                tone={!r.hasWindow ? "default" : r.move.clearedInPromo ? "green" : "red"}
                sub={
                  !r.hasWindow
                    ? `${n(afterRate)}% from day one`
                    : r.move.clearedInPromo
                      ? `inside ${fmtMonths(r.pm)}`
                      : `then ${n(afterRate)}% applies`
                }
              />
              <Stat
                label="To clear it in the window"
                value={r.hasWindow ? `${fmt(r.payToClear)}/mo` : "—"}
                tone={!r.hasWindow ? "default" : n(pay) >= r.payToClear ? "green" : "amber"}
                sub={
                  !r.hasWindow
                    ? "there is no window"
                    : n(pay) >= r.payToClear
                      ? "you're on track"
                      : `${fmt(r.payToClear - n(pay))} more a month`
                }
              />
            </div>
            <Takeaway tone={!r.hasWindow ? "amber" : r.move.clearedInPromo ? "green" : "amber"}>
              {!r.hasWindow ? (
                <>
                  With no promotional period this is just the same balance at{" "}
                  <strong>{n(afterRate)}%</strong> plus a <strong>{fmt(r.fee)}</strong> fee. It{" "}
                  {r.better ? "still comes out ahead" : "costs more than staying put"} by{" "}
                  <strong>{fmtK(Math.abs(r.interestSaved))}</strong>. Enter the promotional length from
                  the offer to see the case for moving.
                </>
              ) : r.move.clearedInPromo ? (
                <>
                  Paying <strong>{fmt(n(pay))}</strong> a month clears the balance in{" "}
                  <strong>{fmtMonths(r.move.payoffMonths)}</strong> — inside the{" "}
                  <strong>{fmtMonths(r.pm)}</strong> window. You pay the <strong>{fmt(r.fee)}</strong> fee
                  and <strong>{fmtK(r.move.interest)}</strong> in interest, against{" "}
                  <strong>{fmtK(r.keep.interest)}</strong> staying put. This is the case where a transfer
                  clearly wins.
                </>
              ) : (
                <>
                  At <strong>{fmt(n(pay))}</strong> a month you will still owe{" "}
                  <strong>{fmt(r.move.balAtPromoEnd)}</strong> when the promo ends, and that balance starts
                  earning <strong>{n(afterRate)}%</strong>
                  {r.reverts ? (
                    <> — higher than the <strong>{n(rate)}%</strong> you pay today</>
                  ) : (
                    <> against the <strong>{n(rate)}%</strong> you pay today</>
                  )}
                  . Raising the payment to <strong>{fmt(r.payToClear)}</strong> would clear it in time.
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

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Before you move the balance</h2>
            <div className="space-y-2">
              <Takeaway tone="amber">
                The whole saving lives inside the promotional window. Anything still owing on the last day
                is charged at <strong>{n(afterRate)}%</strong>
                {r.reverts && <>, above the {n(rate)}% you pay now</>}. Treat{" "}
                <strong>{fmt(r.payToClear)}/mo</strong> as the real target, not the minimum.
              </Takeaway>
              {/* Both of these used to be wrong. The old copy said a single late
                  payment cancels the promo rate, and that payments go to the
                  promotional balance first — the opposite of what Reg Z
                  requires. */}
              <Takeaway tone="amber">
                A single late payment does not end the promotional rate. An issuer can only raise the rate
                on a balance you are already carrying once the minimum payment is more than{" "}
                <strong>60 days late</strong>, and a promotional rate cannot be written to end early at
                the issuer&apos;s discretion (Regulation Z §1026.55). Sixty days is not much room, and a
                missed payment still brings a late fee and a mark on your credit file — set up the autopay
                before you move the balance, not after.
              </Takeaway>
              <Takeaway tone="blue">
                Do not spend on the new card. While a transferred balance is outstanding most issuers
                revoke the grace period, so new purchases are charged at the purchase rate{" "}
                <em>from the day you make them</em> rather than from the end of the billing cycle.
                Allocation is not the problem — anything you pay above the minimum has to go to your
                highest-rate balance first (Regulation Z §1026.53). The lost grace period is.
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
