---
title: "What will you owe in capital gains tax?"
slug: what-will-you-owe-in-capital-gains-tax
description: "Long-term capital gains rates are bracketed, not flat — and the gain itself decides which bracket it lands in. Here are the bands, the surtax that sits on top, and the holding period that changes everything."
calculator: capital-gains
category: Money
reviewed: 2026-06-19
---

Almost every explanation of capital gains tax says "long-term gains are taxed at
15%". That is the most common rate, and it is not a rule. The rate is bracketed
the same way ordinary income is, and the bracket depends on your total taxable
income **including the gain you are asking about**.

## The holding period comes first

One year and one day. That is the line.

- **Short-term** — held one year or less. Taxed as **ordinary income**, at your
  marginal rate, which for many people is 22%, 24% or higher.
- **Long-term** — held more than one year. Taxed at the preferential rates
  below.

Nothing else in this guide matters as much as that date. For a large gain the
difference between selling on day 364 and day 366 is frequently a five-figure
sum, and it is entirely within your control.

## The long-term brackets

For {{TAX_YEAR}}, the long-term capital gains rate depends on taxable income:

| Rate | Single, taxable income up to | Married filing jointly, up to |
|---|---|---|
| 0% | {{LTCG_ZERO_TOP_SINGLE}} | {{LTCG_ZERO_TOP_MARRIED}} |
| 15% | {{LTCG_FIFTEEN_TOP_SINGLE}} | {{LTCG_FIFTEEN_TOP_MARRIED}} |
| 20% | above that | above that |

Two things follow from this that a flat-rate explanation hides.

**There is a 0% band, and it is not small.** A single filer with modest taxable
income can realize a long-term gain and owe nothing federally on part or all of
it. This is the basis of deliberate gain harvesting in low-income years — a gap
year, a sabbatical, the years between retiring and claiming Social Security.

**The gain stacks on top of your other income.** The gain is not taxed in
isolation; it is added to your taxable income and the bands are applied to the
total. So a large gain can start in the 0% band, cross into 15%, and finish in
20% — all within a single sale. The
[capital gains calculator](/calculators/capital-gains) applies the bands to the
stacked total rather than picking one rate, which is why its answer sometimes
differs from a flat-rate estimate.

## The surtax on top

Above certain income levels a further **{{NIIT_RATE}}** net investment income
tax applies. The formula is specific and worth getting right:

> You owe {{NIIT_RATE}} on the **lesser** of your net investment income, or the
> amount by which your modified adjusted gross income exceeds the threshold.

The thresholds are **{{NIIT_THRESHOLD_SINGLE}}** for single and head of
household filers and **{{NIIT_THRESHOLD_MARRIED}}** for married filing jointly.
Unlike almost every other figure in the tax code, these are written into the
statute and **are not adjusted for inflation** — they have been the same since
the tax took effect, which means more households cross them every year without
anything changing in their own circumstances.

Net investment income includes interest, dividends, capital gains, rental and
royalty income and non-qualified annuities. It does not include wages,
unemployment compensation, Social Security benefits, alimony or most
self-employment income.

One useful exclusion: gain on the sale of a main home that is excluded from
gross income under Section 121 is also excluded from net investment income. That
exclusion is covered in the guide on
[renting versus buying](/guides/cheaper-to-rent-or-buy).

## What is actually taxed

Not the sale price — the **gain**, which is proceeds minus your cost basis. Basis
is what you paid plus commissions, plus reinvested dividends you already paid
tax on, plus capital improvements for property.

Getting basis wrong is the most common and most expensive error here, and it
almost always runs in the direction of overstating the gain. Before computing
anything, make sure the basis figure is complete.

Losses offset gains, and net losses can offset up to $3,000 of ordinary income
per year, with the remainder carried forward.

## State tax

None of the above includes state tax. Most states tax capital gains as ordinary
income with no preferential rate at all, which means the state bill can exceed
the federal one for someone sitting in the federal 0% band. A few states have no
income tax. This varies enough that a national figure is meaningless — check
your own.

## What to do with this

1. **Check the holding period before selling anything.** It is the largest
   single lever and it costs nothing to wait.
2. **Work out the bracket including the gain**, not your current bracket.
3. **Find your true basis.** Reinvested dividends and improvements count.
4. **Check whether you cross a NIIT threshold**, and remember the calculation is
   the lesser of two amounts, not {{NIIT_RATE}} of everything.
5. **Consider harvesting in low-income years** if you have appreciated holdings
   and a year where the 0% band has room in it.
6. **Add your state.** The federal answer is frequently not the whole bill.

Sources: long-term capital gains brackets from [IRS Revenue Procedure
2025-32](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026),
section 3.03, for taxable years beginning in {{TAX_YEAR}}; net investment income
tax rate, formula and thresholds from [IRS, net investment income
tax](https://www.irs.gov/individuals/net-investment-income-tax). Both read from
the same constants the calculator uses.
