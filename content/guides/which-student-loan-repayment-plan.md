---
title: "Which student loan repayment plan should you choose?"
slug: which-student-loan-repayment-plan
description: "The plans available to you now depend on when your loans were first disbursed. Here is what RAP actually does, how it differs from IBR, and why the lowest payment and the lowest cost are almost never the same plan."
calculator: student-loan-repayment
category: Debt
reviewed: 2026-09-04
---

Federal student loan repayment was restructured by P.L. 119-21, and the plan
set changed from {{STUDENT_POLICY_AS_OF}}. The first thing to establish is not
which plan is best. It is which plans you are allowed to pick from, because
that now depends on a date.

## The date that decides your options

The dividing line is whether any of your loans was **first disbursed on or after
{{NEW_LOAN_CUTOFF}}**.

- **All loans before that date.** You keep the older set — standard, graduated,
  extended and IBR — and you may also switch to the new Repayment Assistance
  Plan. The income-contingent plans are being wound up by
  {{LEGACY_PLAN_SUNSET}}. SAVE no longer exists.
- **At least one loan on or after it.** Two plans are open to you: the standard
  plan, whose term is set by your balance, or RAP. Extended, ICR and the older
  income-driven plans are not available on those loans.

Note that it is the disbursement date, not when you enrolled or when you
graduated. One new loan taken for a final semester can move you into the second
group.

## What RAP actually does

The Repayment Assistance Plan calculates your payment from **adjusted gross
income**, not from discretionary income above a poverty multiple. That is the
structural break from every income-driven plan before it.

The rate steps up one percentage point per $10,000 of AGI, starting at 1% and
stopping at 10%. Below $10,000 of AGI there is a flat annual amount. Then two
adjustments: **{{RAP_DEPENDENT_DEDUCTION}} a month off for each dependent**
claimed on your federal return, and a floor of **{{RAP_MIN_PAYMENT}} a month**
however low the income.

The bands are written as hard boundaries, so the amount steps at each one —
$20,000 of AGI pays 1% and $20,001 pays 2%. That is the statute as written, not
a rounding artifact, and it means a small raise near a boundary can cost more
than it pays.

Two provisions matter more than the payment formula:

- **The unpaid interest waiver.** If your payment does not cover the month's
  interest, the shortfall is waived rather than added to what you owe.
- **The principal match.** If a full, on-time payment retires less than
  {{RAP_PRINCIPAL_MATCH}} of principal, the Secretary covers the difference, so
  every qualifying month reduces the balance by at least that much.

Together those mean **your balance cannot grow on RAP.** That is the single
biggest practical difference from IBR, where a low payment on a large balance
can leave the balance climbing for years while you pay every month.

Forgiveness comes after **{{RAP_FORGIVE_PAYMENTS}} qualifying monthly payments**
— {{RAP_FORGIVE_YEARS}} years.

## How IBR compares

IBR, where you still have access to it, works the older way: a percentage of
**discretionary** income, meaning income above {{IBR_POVERTY_MULTIPLE}} of the
poverty guideline for your family size.

Which IBR formula applies depends on when you first borrowed. Borrowers who
first borrowed on or after 1 July 2014 pay {{IBR_NEW_PCT}} of discretionary
income with forgiveness at {{IBR_NEW_FORGIVE_YEARS}} years. Borrowers with a
federal balance before that date pay {{IBR_PRIOR_PCT}} with forgiveness at
{{IBR_PRIOR_FORGIVE_YEARS}} years.

IBR often produces a **lower payment** than RAP at modest incomes, because the
poverty-line subtraction shelters more income than RAP's flat percentage of
AGI. It can also let the balance grow, which RAP cannot. Those two facts pull in
opposite directions, and which wins depends on your balance relative to your
income.

The [student loan repayment calculator](/calculators/student-loan-repayment)
runs the plans you are actually eligible for side by side, including what gets
forgiven and what the interest costs along the way.

## The trap in "lowest payment"

The plan with the smallest monthly number is very often the most expensive one
overall, because you pay for longer and interest keeps accruing.

That reverses if you are genuinely heading for forgiveness. If your balance is
large relative to your income and you expect a remaining balance at year
{{RAP_FORGIVE_YEARS}}, then minimizing payments is correct — every extra dollar
you pay is a dollar that would have been forgiven.

So the honest question is: **am I going to pay this off, or is it going to be
forgiven?** Those are two different strategies and picking the wrong one is
expensive either way.

One thing to build into the forgiveness plan: a balance forgiven at the end of
an income-driven plan can be treated as taxable income, and the bill arrives in
one year. That is worth saving for rather than being surprised by.

## What to do with this

- **Find your disbursement dates** before anything else. They decide the menu.
- **Recertify every year.** Income-driven plans require it, and missing it can
  push you to a much larger payment.
- **Decide whether you are on a payoff path or a forgiveness path**, then choose
  the plan that serves that path rather than the one with the smallest number.
- **Check whether Public Service Loan Forgiveness applies to you.** It is a
  different and much shorter clock, and it changes the answer completely.
- **Remember private loans qualify for none of this.** No federal plan, no
  forgiveness.

Sources: RAP payment table, dependent reduction, minimum payment, interest
waiver, principal match and 360-month forgiveness from 20 U.S.C. 1087e(q) as
added by P.L. 119-21; plan availability and the transition deadline from 20
U.S.C. 1087e(d); IBR percentages and forgiveness periods from 20 U.S.C. 1098e.
See also [Federal Student Aid's RAP
summary](https://edfinancial.studentaid.gov/income-driven-repaymentinformation-center/rap).
Every figure above is read from the same constants the calculator uses. Verify
current terms at studentaid.gov before acting — these change with legislation.
