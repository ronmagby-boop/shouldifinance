---
title: "What return do you need to hit your goal?"
slug: what-return-do-you-need
description: "Work backwards from the goal and you get a required return. Whether that number is reasonable depends entirely on what the asset classes have actually delivered — which is a measurement, not an opinion."
calculator: required-rate-of-return
category: Money
reviewed: 2026-06-23
---

Most investment planning runs forwards: here is what I save, here is a return I
hope for, here is where I end up. Running it backwards is more useful. Start
with the number you need and the date you need it, and solve for the return that
gets you there.

The answer is a single percentage, and it tells you something the forward
version does not: **whether the plan is reasonable at all.**

## What makes a required return "reasonable"

A required return only means something against a reference. The natural one is
what the broad asset classes have actually produced over long periods.

Over {{LONG_RUN_PERIOD}}, as geometric averages of annual US returns:

| Asset | Long-run annual return |
|---|---|
| S&P 500, dividends reinvested | {{LONG_RUN_STOCKS}} |
| 10-year Treasuries | {{LONG_RUN_BONDS}} |
| 3-month Treasury bills | {{LONG_RUN_BILLS}} |

Those are measurements over 98 years, not forecasts. They give the bands their
meaning:

- **Below {{LONG_RUN_BILLS}}** — achievable without taking market risk at all.
  If this is your required return, the question is not how to invest, it is
  whether you need to.
- **Between {{LONG_RUN_BILLS}} and {{LONG_RUN_BONDS}}** — conservative. A bond-
  heavy portfolio has historically covered this.
- **Between {{LONG_RUN_BONDS}} and {{LONG_RUN_STOCKS}}** — the range a mixed
  portfolio has historically produced. Any blend of stocks and bonds sits
  somewhere in here, so a required return in this band describes an allocation
  rather than a gamble.
- **Above {{LONG_RUN_STOCKS}}** — you are requiring more than the best-performing
  broad asset class has delivered over nearly a century. That is not a portfolio
  decision; it is a bet on beating it.
- **Above {{FANCIFUL_RETURN}}** — this is where a required return stops
  describing a portfolio and starts describing a hope.

The [required return calculator](/calculators/required-rate-of-return) solves for
your number and places it against these bands, alongside a
{{BENCHMARK_RETURN}} reference that sits between the long-run bond and stock
figures.

## What to do when the number comes back too high

This is the useful part, because a required return above
{{LONG_RUN_STOCKS}} is not a signal to find a riskier investment. It is a signal
that one of the other three inputs has to move. There are exactly four:

1. **Save more each month.** The most reliable lever and the one fully under
   your control.
2. **Extend the timeline.** Adding years reduces the required return sharply,
   because time enters as an exponent. Retiring at 67 instead of 65 can move a
   required return by more than a percentage point.
3. **Lower the target.** Sometimes the goal was a round number rather than a
   calculation.
4. **Start with more**, if a windfall or a transfer from elsewhere is available.

Reaching for a higher return is the one option that does not belong on the list,
because it is not actually available. You cannot choose a return. You can only
choose an allocation, and the return arrives on its own terms.

## Three things the required return does not include

**It is nominal.** A required return of 8% with 2.5% inflation is a real
requirement of about 5.5%. If your goal is expressed in today's dollars — most
goals are — you need the nominal figure, which is higher than it looks.

**It is before fees.** A portfolio returning 8% in a fund charging 1% delivers
7% to you. The required return has to be met **after** costs, so subtract your
expense ratio from whatever the market gives you.

**It is before tax**, in a taxable account. Gains realized along the way are
taxed, which raises the gross return needed to hit a net target.

Stack all three and a required return of 7% quietly becomes a gross requirement
closer to 10%, which lands in a different band than the one you started in.

## What to do with this

1. **Solve for the number before choosing investments.** The required return
   tells you which conversation you are having.
2. **Compare it against the table above**, not against what a fund returned last
   year.
3. **Add inflation, fees and tax** before judging whether it is achievable.
4. **If it comes back above {{LONG_RUN_STOCKS}}, change an input.** Do not go
   looking for a higher-returning asset — that search has a well-documented
   ending.
5. **Re-run it annually.** Contributions, markets and timelines all move, and
   the required return moves with them.

A required return is a diagnostic, not a target. Its job is to tell you whether
the plan needs a different portfolio or a different plan.

Sources: long-run returns from Aswath Damodaran's annual returns dataset at NYU
Stern, {{LONG_RUN_PERIOD}} — $100 invested at the start of 1928 ended 2025 at
$1,157,598.95 in the S&P 500 with dividends reinvested, $7,752.88 in 10-year
Treasuries and $2,578.30 in 3-month bills. Read from the same constants the
calculator uses.
