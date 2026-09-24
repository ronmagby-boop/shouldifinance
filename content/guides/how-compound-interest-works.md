---
title: "How does compound interest actually work?"
slug: how-compound-interest-works
description: "Interest on interest, and why the curve bends late. The short version of a short subject, with the one number that shows why starting early beats saving more."
calculator: compound-interest
category: Money
reviewed: 2026-06-02
---

Compound interest is a small idea with a large consequence. You earn a return,
the return joins the balance, and next period you earn a return on that too.
That is the whole mechanism.

What makes it worth a page is that people consistently underestimate what it
does over long periods, because the shape of the growth is not the shape our
intuition expects.

## Simple versus compound

Put $10,000 somewhere paying 7% a year.

- **Simple interest** pays $700 every year, forever, on the original $10,000.
  After 30 years you have $31,000.
- **Compound interest** pays 7% of whatever the balance is. Year one is still
  $700. Year thirty is about $5,000. After 30 years you have roughly $76,000.

Same rate, same deposit, more than double the result. The extra $45,000 is
entirely interest that earned interest.

## The curve bends late, which is why people quit early

Growth is exponential, so almost nothing appears to happen for a long time and
then a great deal happens at once.

On that same $10,000 at 7%:

- After 10 years: about $19,700
- After 20 years: about $38,700
- After 30 years: about $76,100

The third decade adds $37,400 — more than the first two decades combined. You
cannot get to the third decade without sitting through the first, and the first
is the one that feels like it is not working.

## The rule of 72

A useful shortcut: divide 72 by the annual rate and you get roughly the number
of years for money to double.

- At 3%, money doubles in about 24 years
- At 6%, about 12 years
- At 9%, about 8 years
- At 12%, about 6 years

It is an approximation, and it drifts at high rates, but it is close enough to
do in your head and it makes the point that rate and time are interchangeable in
a way people do not expect. Double the rate and you halve the waiting.

## What it looks like over a really long period

The clearest illustration is not a hypothetical. $100 invested in the S&P 500 at
the start of 1928, with dividends reinvested, was worth $1,157,598.95 at the end
of 2025. That is a geometric average of **{{LONG_RUN_STOCKS}}** a year over 98
years.

The same $100 in 3-month Treasury bills came to $2,578.30, a
**{{LONG_RUN_BILLS}}** average.

A 6.65-point difference in annual return, compounded across 98 years, is the
difference between $2,578 and $1.16 million. That is what the word "compounding"
is doing.

## Compounding frequency matters less than people think

Interest can be credited yearly, monthly, daily or continuously. More frequent
compounding produces a slightly higher effective yield for the same nominal
rate — 5% compounded monthly gives an annual percentage yield of about 5.12%.

It is real, and it is small. The difference between monthly and daily
compounding on a savings account is a rounding error next to the difference
between a 0.5% account and a 4.5% one. Compare **APY**, which already includes
the compounding effect, and stop worrying about the frequency.

## What to do with this

1. **Start now rather than starting bigger.** Time enters the formula as an
   exponent and contributions do not. Ten years of a small amount usually beats
   five years of a large one.
2. **Do not interrupt it.** Withdrawing the growth is what turns compound
   interest back into simple interest.
3. **Watch what is subtracted.** Fees compound against you in exactly the same
   shape, which is why a percentage point of annual cost matters far more than
   it sounds.
4. **Compare APY, not rate**, for anything paying you interest.

Run your own figures on the
[compound interest calculator](/calculators/compound-interest) — the thing worth
looking at is not the final number but where on the curve it starts bending, and
how much of the total arrives in the last third of the period.

Sources: long-run return figures from Aswath Damodaran's annual returns dataset
at NYU Stern, {{LONG_RUN_PERIOD}}, read from the same constants the calculators
use. Growth figures computed with this site's own code.
