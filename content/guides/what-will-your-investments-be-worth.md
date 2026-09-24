---
title: "What will your investments actually be worth?"
slug: what-will-your-investments-be-worth
description: "A projection is an assumption with a calculator attached. Here is what the assumptions do, why a single percentage point of fees costs so much more than it sounds, and the risk that averages hide."
calculator: investment-growth
category: Money
reviewed: 2026-06-09
---

Every growth projection you have ever seen has the same structure: a starting
balance, a contribution, a rate, a number of years. Three of those you know. The
rate you do not, and it is the one doing all the work.

That does not make projections useless. It makes them useful in a specific way —
for understanding *sensitivity*, not for predicting a balance.

## What the assumptions actually do

Run $25,000, plus $500 a month, for 25 years, and change only the return:

- At 5%: about **$386,000**
- At 7%: about **$551,000**
- At 9%: about **$800,000**

A four-point spread in the assumption doubles the answer. Nobody can tell you
which of those three is right. The long-run US figures give you a reference
point — {{LONG_RUN_STOCKS}} a year for the S&P 500 with dividends reinvested
over {{LONG_RUN_PERIOD}}, and {{LONG_RUN_BONDS}} for 10-year Treasuries — but
your 25 years are one sample from that distribution, not the average of it.

So the honest use of a projection is: **run it three times.** Pessimistic,
central, optimistic. If your plan works in all three, it is a plan. If it only
works in the optimistic one, it is a hope with a spreadsheet.

## Fees, and why the number is bigger than it looks

A 1% annual fee sounds like it costs 1%. It does not. It costs 1% of the balance
every year, and the balance it is taken from is the balance that would otherwise
have been compounding.

On the $25,000-plus-$500-a-month example over 25 years at 7%, moving from a
0.05% fund to a 1.00% fund costs roughly **$86,000** — not because the fees
themselves totalled that, but because the fees plus everything those fees would
have earned did.

The comparison worth knowing: in {{FUND_FEES_YEAR}}, actively managed equity
mutual funds averaged **{{ACTIVE_FUND_FEE}}** on an asset-weighted basis, while
index equity funds averaged **{{INDEX_FUND_FEE}}**.

> That gap is not a rounding difference. Over a long horizon it is frequently
> the largest single controllable factor in the outcome — larger than the
> contribution increases most people agonize over, and unlike the market, it is
> entirely within your control.

The [investment growth calculator](/calculators/investment-growth) shows the fee
drag as its own line, which is the only way to see it, because it never appears
as a charge you notice.

## The risk that averages hide

An average return says nothing about the order the returns arrive in, and the
order matters enormously once you are withdrawing.

Two retirees each average 7% over 20 years. One gets the bad years early and the
good years late; the other gets the reverse. While they are only contributing,
they end up in the same place. Once they are drawing an income, the first one can
run out and the second one does not — because selling assets into a falling
market locks in the loss permanently.

This is called **sequence-of-returns risk**, and it is why "the market averages
X%" is a much weaker statement than it sounds when applied to a decumulation
plan. A projection that shows a smooth curve is showing you the average, not the
experience.

## Nominal versus real

A projection showing $551,000 in 25 years is showing you 25-years-from-now
dollars. At 2.5% inflation, those dollars buy what about $297,000 buys today.

Neither number is wrong. But the retirement income you are planning has to be
spent in future dollars, so compare like with like: either inflate your spending
target, or deflate the projection. Doing neither is how people arrive at a
number that looks sufficient and is not.

## What to do with this

1. **Run three scenarios**, not one. The spread is the information.
2. **Check what you are paying** in fund expenses. It is on the fund page, it
   takes a minute, and it is the highest-leverage change available to most
   investors.
3. **Look at the inflation-adjusted line**, not the nominal one, for anything
   more than a few years out.
4. **Do not change the plan because of the projection.** Change the inputs you
   control — the contribution and the cost. The return is not an input you
   control, however precisely the calculator lets you type it.

A projection is a sensitivity analysis wearing the clothes of a forecast. Used
as the first, it is one of the most useful tools available. Used as the second,
it is a way of being confidently wrong about a large number.

Sources: long-run returns from Aswath Damodaran's dataset at NYU Stern,
{{LONG_RUN_PERIOD}}; fund expense ratios from ICI Research Perspective 32, no. 1
(March 2026), "Trends in the Expenses and Fees of Funds, {{FUND_FEES_YEAR}}",
Figure 6. Both read from the same constants the calculators use. Growth figures
computed with this site's own code.
