"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment, balanceAfter, typicalMonthlyRent } from "../../lib/finance";

/** Typical annual PMI as a percent of the loan, by loan-to-value band. */
function pmiRate(ltv: number): number {
  if (ltv <= 80) return 0;
  if (ltv <= 85) return 0.32;
  if (ltv <= 90) return 0.52;
  if (ltv <= 95) return 0.78;
  return 1.03;
}

/** Amortize and report interest, PMI and when the balance reaches 80% of value. */
function run(loan: number, rate: number, term_m: number, price: number) {
  const pi = payment(loan, rate, term_m);
  const ltv = price > 0 ? (loan / price) * 100 : 0;
  const annualPmi = pmiRate(ltv);
  const pmiMonthly = (loan * (annualPmi / 100)) / 12;
  const mr = rate / 100 / 12;

  let bal = loan;
  let pmiMonths = 0;
  let monthsTo20 = 0;
  let reached = false;
  for (let i = 0; i < term_m && bal > 0.005; i++) {
    if (annualPmi > 0 && bal > price * 0.78) pmiMonths++;
    if (!reached && bal <= price * 0.8) {
      monthsTo20 = i;
      reached = true;
    }
    bal = Math.max(0, bal - (pi - bal * mr));
  }
  if (!reached) monthsTo20 = term_m;

  return {
    pi,
    ltv,
    annualPmi,
    pmiMonthly,
    pmiMonths,
    totalPmi: pmiMonthly * pmiMonths,
    interest: pi * term_m - loan,
    monthsTo20,
  };
}

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [savings, setSavings] = useState<Num>("");
  const [monthlySave, setMonthlySave] = useState<Num>("");
  const [dpNow, setDpNow] = useState<Num>("");
  const [dpTarget, setDpTarget] = useState<Num>("");
  const [rateNow, setRateNow] = useState<Num>("");
  const [rateLater, setRateLater] = useState<Num>("");
  const [appr, setAppr] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  /** What the saving household pays to live meanwhile. */
  const [rent, setRent] = useState<Num>("");

  const loadExample = () => {
    setPrice(400000);
    setSavings(28000);
    setMonthlySave(1500);
    setDpNow(7);
    setDpTarget(20);
    setRateNow(6.5);
    setRateLater(6.5);
    setAppr(3);
    setTerm(30);
    setRent(typicalMonthlyRent(400000));
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setPrice("");
    setSavings("");
    setMonthlySave("");
    setDpNow("");
    setDpTarget("");
    setRateNow("");
    setRateLater("");
    setAppr("");
    setTerm("");
    setRent("");
  };

  const r = useMemo(() => {
    const P = n(price);
    const term_m = Math.round(n(term) * 12);
    if (P <= 0 || term_m <= 0 || n(rateNow) <= 0 || n(rateLater) <= 0) return null;

    const dn = Math.min(Math.max(n(dpNow), 0), 100) / 100;
    const dt = Math.min(Math.max(n(dpTarget), 0), 100) / 100;
    if (dt <= dn) return { invalid: true as const };

    // Path A — buy now with the smaller down payment
    const downNow = P * dn;
    const loanNow = P - downNow;
    const now = run(loanNow, n(rateNow), term_m, P);
    const totalNow = downNow + now.pi * term_m + now.totalPmi;

    // Path B — keep saving until the bigger down payment is covered, while the
    // price moves under you.
    const monthlyAppr = Math.pow(1 + n(appr) / 100, 1 / 12);
    let cash = n(savings);
    let futurePrice = P;
    let waitM = 0;
    const cap = 600;
    let everReaches = false;
    for (let i = 0; i < cap; i++) {
      if (cash >= futurePrice * dt) {
        everReaches = true;
        break;
      }
      cash += n(monthlySave);
      futurePrice *= monthlyAppr;
      waitM++;
    }
    if (!everReaches) {
      return {
        invalid: false as const, unreachable: true as const,
        downNow, loanNow, now, totalNow, waitM: cap,
      };
    }

    const downLater = futurePrice * dt;
    const loanLater = futurePrice - downLater;
    const later = run(loanLater, n(rateLater), term_m, futurePrice);
    // Saving is not free: you live somewhere for those months. Leaving it out
    // was decisive here — the saving advantage is small against a long wait.
    const rentTotal = Math.max(0, n(rent)) * waitM;
    const totalLater = rentTotal + downLater + later.pi * term_m + later.totalPmi;

    // Shown, not deducted: totalNow already counts every payment over the term,
    // and both paths end owning the home outright, so crediting this against the
    // lifetime total would count the same principal twice.
    const balAtWait = balanceAfter(loanNow, n(rateNow), term_m, waitM);
    const principalWhileSaving = Math.max(0, loanNow - balAtWait);
    const paidWhileSaving = (now.pi + now.pmiMonthly) * waitM;

    const totalGap = totalLater - totalNow;
    const savingWins = totalGap < 0;

    return {
      invalid: false as const, unreachable: false as const,
      downNow, loanNow, now, totalNow,
      futurePrice, downLater, loanLater, later, totalLater,
      waitM, totalGap, savingWins,
      rentTotal, principalWhileSaving, paidWhileSaving,
      priceRise: futurePrice - P,
      monthlyGap: later.pi + later.pmiMonthly - (now.pi + now.pmiMonthly),
    };
  }, [price, savings, monthlySave, dpNow, dpTarget, rateNow, rateLater, appr, term, rent]);

  return (
    <CalcShell
      slug="buy-now-or-save"
      intro="Buying sooner with less down means PMI and a bigger loan. Saving longer means a smaller loan and no PMI — but home prices keep rising while you save, so the amount you need keeps growing too. This shows how long the saving actually takes and what each path costs in total."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["home-affordability", "mortgage-payment", "buy-now-or-wait"]}
      disclaimer="For educational purposes only. PMI rates here are typical bands, not a quote, and price growth is an assumption rather than a forecast. Rent while saving is counted, but taxes, insurance and maintenance are not — they fall on the owner either way."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The home and your cash" badge="SHARED">
          <div className="space-y-4">
            <NumField label="Home price today" value={price} onChange={setPrice} placeholder="400000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Saved so far" value={savings} onChange={setSavings} placeholder="28000" prefix="$" />
              <NumField label="Saving each month" value={monthlySave} onChange={setMonthlySave} placeholder="1500" prefix="$" />
            </div>
            <NumField
              label="Rent while you save"
              value={rent}
              onChange={setRent}
              placeholder={String(typicalMonthlyRent(n(price) || 400000))}
              prefix="$"
              suffix="/mo"
              hint="You live somewhere for every month of the wait, and over a saving period this long it is usually the largest number on the page. Enter 0 only if you would genuinely pay nothing."
            />
            <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            <NumField
              label="Price growth while you save"
              value={appr}
              onChange={setAppr}
              placeholder="3"
              suffix="%/yr"
              hint="The target moves as you save. This is what makes waiting expensive."
            />
          </div>
        </Card>

        <Card title="The two down payments" badge="COMPARE" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Buy now with" value={dpNow} onChange={setDpNow} placeholder="7" suffix="%" />
              <NumField label="Or save up to" value={dpTarget} onChange={setDpTarget} placeholder="20" suffix="%" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate if you buy now" value={rateNow} onChange={setRateNow} placeholder="6.5" suffix="%" step={0.125} />
              <NumField label="Rate if you wait" value={rateLater} onChange={setRateLater} placeholder="6.5" suffix="%" step={0.125} />
            </div>
            {r && !r.invalid && !r.unreachable && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-blue-600 font-medium">Time to reach {pct(n(dpTarget), 0)}</span>
                <span className="text-sm font-medium text-blue-800">{fmtMonths(r.waitM)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r && r.invalid ? (
        <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
          <Takeaway tone="red">
            The target down payment needs to be larger than what you would put down today.
          </Takeaway>
        </div>
      ) : r && r.unreachable ? (
        <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
          <Takeaway tone="red">
            At <strong>{fmt(n(monthlySave))}</strong> a month you never catch the target — prices are
            rising at least as fast as you save. Either buy sooner with the smaller down payment, save more
            each month, or look at a lower price.
          </Takeaway>
        </div>
      ) : r ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="Buy now — total cost" value={fmtK(r.totalNow)} tone={r.savingWins ? "gray" : "green"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Monthly payment" value={`${fmt(r.now.pi + r.now.pmiMonthly)}/mo`} sub={r.now.pmiMonthly > 0 ? `incl. ${fmt(r.now.pmiMonthly)} PMI` : "no PMI"} />
                <Stat label="Down payment" value={fmt(r.downNow)} />
                <Stat
                  label="PMI in total"
                  value={r.now.totalPmi > 0 ? fmtK(r.now.totalPmi) : "None"}
                  sub={r.now.pmiMonths > 0 ? `charged for ${fmtMonths(r.now.pmiMonths)}` : undefined}
                  tone={r.now.totalPmi > 0 ? "amber" : "green"}
                />
                <Stat label="Reach 20% equity" value={fmtMonths(r.now.monthsTo20)} sub="ask to cancel PMI here" />
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label={`Save ${fmtMonths(r.waitM)} — total cost`} value={fmtK(r.totalLater)} tone={r.savingWins ? "green" : "gray"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Monthly payment" value={`${fmt(r.later.pi + r.later.pmiMonthly)}/mo`} sub={r.later.pmiMonthly > 0 ? `incl. ${fmt(r.later.pmiMonthly)} PMI` : "no PMI"} />
                <Stat label="Down payment" value={fmt(r.downLater)} sub={`on a ${fmtK(r.futurePrice)} home`} />
                <Stat label="PMI in total" value={r.later.totalPmi > 0 ? fmtK(r.later.totalPmi) : "None"} tone={r.later.totalPmi > 0 ? "amber" : "green"} />
                <Stat label="Reach 20% equity" value={r.later.ltv <= 80 ? "Day one" : fmtMonths(r.later.monthsTo20)} tone={r.later.ltv <= 80 ? "green" : "default"} />
                <Stat label="Rent while saving" value={fmtK(r.rentTotal)} sub={`${fmtMonths(r.waitM)} of paying to live`} tone="amber" />
                <Stat
                  label="Equity you'd have by now"
                  value={fmtK(r.principalWhileSaving)}
                  sub="if you had bought instead"
                  tone="green"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <div className="space-y-2">
            <Takeaway tone={r.savingWins ? "green" : "amber"}>
              Saving to <strong>{pct(n(dpTarget), 0)}</strong> takes about{" "}
              <strong>{fmtMonths(r.waitM)}</strong>, by which point the home costs{" "}
              <strong>{fmtK(r.futurePrice)}</strong> — <strong>{fmtK(r.priceRise)}</strong> more than
              today. On these numbers{" "}
              <strong>{r.savingWins ? "waiting to save" : "buying now"}</strong> costs{" "}
              <strong>{fmtK(Math.abs(r.totalGap))}</strong> less over the life of the loan.
              {r.now.totalPmi > 0 && !r.savingWins && (
                <> PMI is real money, but here the price rise outweighs it.</>
              )}
            </Takeaway>
            {r.now.totalPmi > 0 && (
              <Takeaway tone="amber">
                <strong>That {fmtMonths(r.now.pmiMonths)} of PMI is automatic termination</strong>,
                which the servicer must do at 78% of the <em>original</em> price. You can ask for
                cancellation earlier, at 80% — {fmtMonths(r.now.monthsTo20)} here. The house
                appreciating does not bring the automatic date forward, because the test is against
                what you paid rather than what the home is now worth; rising value only helps if you
                request cancellation and the lender accepts a new appraisal.
              </Takeaway>
            )}
            </div>
          </div>

          <ChartCard
            title="Total cost of each path"
            footnote="Down payment, principal, interest and PMI over the full term, and the rent paid while saving."
          >
            <BarChart
              ariaLabel="Total cost of buying now compared with saving a bigger down payment"
              bars={[
                {
                  label: "Buy now",
                  segments: [
                    { label: "Down payment", value: r.downNow, color: COLORS.blue },
                    { label: "Principal", value: r.loanNow, color: COLORS.gray },
                    { label: "Interest", value: r.now.interest, color: COLORS.amber },
                    { label: "PMI", value: r.now.totalPmi, color: COLORS.red },
                  ],
                },
                {
                  label: `Save ${fmtMonths(r.waitM)}`,
                  segments: [
                    { label: "Rent", value: r.rentTotal, color: COLORS.purple },
                    { label: "Down payment", value: r.downLater, color: COLORS.blue },
                    { label: "Principal", value: r.loanLater, color: COLORS.gray },
                    { label: "Interest", value: r.later.interest, color: COLORS.amber },
                    { label: "PMI", value: r.later.totalPmi, color: COLORS.red },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the price, your savings and both down payment targets to compare the paths.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
