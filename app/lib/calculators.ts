import type { LucideIcon } from "lucide-react";
import {
  Landmark, RefreshCw, Home, Wallet, PlusCircle, Medal, Scale, ClipboardList,
  BarChart3, TrendingUp, Sprout, PiggyBank, Banknote, CalendarDays, Receipt,
  Target, AlertTriangle, Car, CreditCard, Repeat, KeyRound, Calculator,
  FileText, Plug, TrendingDown, Snowflake, LifeBuoy, GraduationCap, Trophy,
  ShieldCheck, Percent, Clock, Coins, ArrowLeftRight, Combine, ShieldAlert, Shuffle,
  Scale3d, Split, HandCoins, CarFront, Merge, Layers, Blend, GitCompareArrows, Signpost, Gauge,
} from "lucide-react";

export type Category = "Home" | "Debt" | "Money" | "Auto";

/**
 * Decision tools ("Should I ...?") versus lookup tools ("What / How ...?").
 * Order on the page comes from CALC_SECTIONS, not from this.
 */
export type CalcKind = "should-i" | "what-how";

export type Calc = {
  slug: string;
  title: string;
  nav: string;
  desc: string;
  /** lucide-react icon component; rendered as <calc.icon className="..." /> */
  icon: LucideIcon;
  kind: CalcKind;
  bg: string;
  category: Category;
  keywords: string[];
  /**
   * The guide that explains this calculator in prose, if one has been written.
   *
   * The pairing lives here rather than being inferred, so both sides read it
   * from one place. `slug` names the file in content/guides; `teaser` is the
   * link text the calculator shows, which is deliberately not the guide's
   * title — the guide is titled as a question a searcher types, the teaser is
   * phrased as depth for someone who has just seen their own numbers.
   *
   * lib/guides.ts checks at build time that the named guide exists and that it
   * points back at this calculator, so the two cannot drift apart silently.
   */
  guide?: { slug: string; teaser: string };
};

export const CALCULATORS: Calc[] = [
  // ---------- Home ----------
  {
    slug: "should-i-refinance",
    title: "Should I refinance?",
    nav: "Should I refinance?",
    desc: "See if refinancing saves money, when you break even, and what it costs to reset the clock.",
    icon: RefreshCw, bg: "bg-purple-50", category: "Home", kind: "should-i",
    keywords: ["refinance calculator", "break even", "refinance savings"],
    guide: {
      slug: "when-refinancing-pays-for-itself",
      teaser: "When a refinance actually pays for itself",
    },
  },
  {
    slug: "refinance-to-pay-off-debt",
    title: "Should I refinance and pay off my debt?",
    nav: "Should I refinance to pay off debt?",
    desc: "Roll high-rate debts into a new mortgage and see the blended rate, the monthly saving, and what it costs over the full term.",
    icon: Merge, bg: "bg-purple-50", category: "Home", kind: "should-i",
    keywords: ["debt consolidation refinance", "cash out refinance to pay off debt", "blended interest rate"],
    guide: {
      slug: "refinance-to-pay-off-credit-cards",
      teaser: "What rolling card balances into a mortgage really costs",
    },
  },
  {
    slug: "home-equity-loan-vs-heloc",
    title: "Should I get a fixed home equity loan or a HELOC?",
    nav: "Home equity loan or HELOC?",
    desc: "Compare a fixed lump-sum loan with a variable line you draw as needed: payments over time, cost over your horizon, and how far rates would have to rise.",
    icon: Scale, bg: "bg-purple-50", category: "Home", kind: "should-i",
    keywords: ["home equity loan vs HELOC", "fixed home equity loan or HELOC", "HELOC or home equity loan", "second mortgage vs HELOC"],
    guide: {
      slug: "fixed-home-equity-loan-or-heloc",
      teaser: "A lump sum at a fixed rate, or a line you draw",
    },
  },
  {
    slug: "heloc-limit",
    title: "How much can I borrow with a HELOC?",
    nav: "How much can I borrow with a HELOC?",
    desc: "See the line your equity supports at different combined loan-to-value caps, and the payment if you draw all of it.",
    icon: Gauge, bg: "bg-purple-50", category: "Home", kind: "what-how",
    keywords: ["how much can I borrow with a HELOC", "HELOC calculator", "combined loan-to-value", "HELOC limit", "home equity line amount"],
    guide: {
      slug: "how-much-can-you-borrow-with-a-heloc",
      teaser: "Why the cap is your lender's, not a rule",
    },
  },
  {
    slug: "heloc-debt-payoff",
    title: "Should I use a HELOC to pay off high-interest debt?",
    nav: "Should I use a HELOC to pay off debt?",
    desc: "Trade a high rate for a lower one — and see the payment jump when the draw period ends.",
    icon: ShieldAlert, bg: "bg-red-50", category: "Home", kind: "should-i",
    keywords: ["HELOC to pay off credit cards", "home equity debt consolidation", "HELOC draw period", "HELOC payment shock"],
    guide: {
      slug: "home-equity-to-pay-off-credit-cards",
      teaser: "What an interest-only draw period really does",
    },
  },
  {
    slug: "heloc-vs-cash-out",
    title: "Should I get a HELOC or a cash-out refinance?",
    nav: "HELOC or cash-out refinance?",
    desc: "Keep your mortgage and add a line, or replace it with one bigger loan. Compare payments, cost over your horizon, and what Fed moves would do.",
    icon: GitCompareArrows, bg: "bg-purple-50", category: "Home", kind: "should-i",
    keywords: ["HELOC vs cash-out refinance", "cash-out refinance or HELOC", "HELOC prime rate", "home equity line vs refinance"],
    guide: {
      slug: "heloc-or-cash-out-refinance",
      teaser: "Why your existing rate decides it",
    },
  },
  {
    slug: "rate-buydown",
    title: "Should I pay points to buy down my rate?",
    nav: "Should I pay points?",
    desc: "Find the month your discount points start paying for themselves.",
    icon: Percent, bg: "bg-purple-50", category: "Home", kind: "should-i",
    keywords: ["mortgage points calculator", "discount points break even", "buy down interest rate"],
    guide: {
      slug: "are-discount-points-worth-it",
      teaser: "How points are priced, and when they pay back",
    },
  },
  {
    slug: "extra-payments",
    title: "Should I make extra mortgage payments?",
    nav: "Should I make extra payments?",
    desc: "See how much time and interest an extra payment each month can save you.",
    icon: PlusCircle, bg: "bg-emerald-50", category: "Home", kind: "should-i",
    keywords: ["extra mortgage payment", "pay off mortgage early", "interest saved"],
    guide: {
      slug: "do-extra-mortgage-payments-save-money",
      teaser: "What an extra $200 a month is actually worth",
    },
  },
  {
    slug: "va-vs-conventional",
    title: "Should I use a VA loan or conventional loan?",
    nav: "Should I use a VA or conventional loan?",
    desc: "Weigh no money down and no PMI against the VA funding fee.",
    icon: ShieldCheck, bg: "bg-blue-50", category: "Home", kind: "should-i",
    keywords: ["VA loan vs conventional", "VA funding fee", "PMI vs funding fee", "no down payment mortgage"],
    guide: {
      slug: "va-loan-vs-conventional",
      teaser: "How the VA funding fee compares with PMI",
    },
  },
  {
    slug: "fha-vs-conventional",
    title: "Should I use an FHA or conventional loan?",
    nav: "Should I use FHA or conventional?",
    desc: "Compare FHA mortgage insurance against PMI, and find the 90% line that decides whether it ever comes off.",
    icon: Layers, bg: "bg-blue-50", category: "Home", kind: "should-i",
    keywords: ["FHA vs conventional", "FHA mortgage insurance", "MIP", "PMI", "90% LTV"],
    guide: {
      slug: "fha-or-conventional",
      teaser: "The rule that decides whether the insurance ever stops",
    },
  },
  {
    slug: "mortgage-payment",
    title: "What's my mortgage payment?",
    nav: "What's my mortgage payment?",
    desc: "Estimate your monthly payment including principal, interest, taxes, insurance, and PMI.",
    icon: Landmark, bg: "bg-blue-50", category: "Home", kind: "what-how",
    keywords: ["mortgage calculator", "monthly payment", "PITI", "PMI"],
    guide: {
      slug: "whats-in-a-mortgage-payment",
      teaser: "Where each part of the payment goes",
    },
  },
  {
    slug: "va-recoup",
    title: "Will my VA refinance meet the recoupment rule?",
    nav: "Will my VA refinance recoup?",
    desc: "Check whether a VA IRRRL meets the 36-month recoupment rule.",
    icon: Medal, bg: "bg-blue-50", category: "Home", kind: "what-how",
    keywords: ["VA IRRRL", "recoupment period", "VA streamline refinance"],
    guide: {
      slug: "va-36-month-recoupment-rule",
      teaser: "How VA recoupment actually works",
    },
  },
  {
    slug: "rent-vs-buy",
    title: "Should I rent or buy?",
    nav: "Should I rent or buy?",
    desc: "Compare the true cost of renting and buying over 5, 10, and 30 years.",
    icon: Home, bg: "bg-green-50", category: "Home", kind: "should-i",
    keywords: ["rent vs buy", "should I buy a house", "break even year"],
    guide: {
      slug: "cheaper-to-rent-or-buy",
      teaser: "Why the rent-versus-buy answer is a year, not a verdict",
    },
  },
  {
    slug: "payoff-house-vs-invest",
    title: "Should I pay off my house early or invest the difference?",
    nav: "Should I pay off the house or invest?",
    desc: "A guaranteed return from prepaying against a riskier one from the market.",
    icon: HandCoins, bg: "bg-emerald-50", category: "Home", kind: "should-i",
    keywords: ["pay off mortgage early or invest", "mortgage payoff vs investing", "guaranteed return"],
    guide: {
      slug: "pay-off-your-house-or-invest",
      teaser: "Why the interest deduction usually saves nothing",
    },
  },
  {
    slug: "pay-off-debt",
    // "a debt" is deliberate: this tool compares one debt at a time.
    title: "Should I pay off a debt or invest?",
    nav: "Should I pay off a debt or invest?",
    desc: "Compare the guaranteed return of paying down debt against investing the same money.",
    icon: Scale, bg: "bg-purple-50", category: "Home", kind: "should-i",
    keywords: ["pay off debt vs invest", "guaranteed return", "mortgage payoff"],
    guide: {
      slug: "pay-off-debt-or-invest",
      teaser: "Why one side of this comparison is a promise and the other a hope",
    },
  },
  {
    slug: "buy-now-or-wait",
    title: "Should I buy now or wait for rates to drop?",
    nav: "Should I buy now or wait?",
    desc: "See how much a home can appreciate before a lower rate stops helping.",
    icon: Clock, bg: "bg-amber-50", category: "Home", kind: "should-i",
    keywords: ["buy now or wait for rates", "wait for mortgage rates to drop", "home price appreciation"],
    guide: {
      slug: "does-waiting-for-rates-to-drop-save-money",
      teaser: "How much a price rise cancels a rate cut",
    },
  },
  {
    slug: "buy-now-or-save",
    title: "Should I buy now or save for a bigger down payment?",
    nav: "Should I buy now or save more?",
    desc: "Compare buying now with PMI against waiting to reach a bigger down payment.",
    icon: Coins, bg: "bg-green-50", category: "Home", kind: "should-i",
    keywords: ["bigger down payment or buy now", "save for down payment", "PMI vs waiting"],
    guide: {
      slug: "bigger-down-payment-or-buy-sooner",
      teaser: "What mortgage insurance really costs, and when it stops",
    },
  },
  {
    slug: "rent-or-sell",
    title: "Should I rent out my house or sell it?",
    nav: "Rent out or sell?",
    desc: "Compare selling now with renting it out and selling later: cash flow, the tax-free window, depreciation recapture, and your VA entitlement.",
    icon: Signpost, bg: "bg-teal-50", category: "Home", kind: "should-i",
    keywords: ["rent out house or sell", "should I rent my house when I move", "section 121 3 year rule", "depreciation recapture rental", "VA entitlement keep house"],
    guide: {
      slug: "rent-out-or-sell-your-house",
      teaser: "The three-year clock, and what renting really pays",
    },
  },
  {
    slug: "sell-first-or-buy-first",
    title: "Should I sell my home before buying the next one?",
    nav: "Should I sell first or buy first?",
    desc: "Compare the cash each path needs, and the risk that comes with it.",
    icon: ArrowLeftRight, bg: "bg-teal-50", category: "Home", kind: "should-i",
    keywords: ["sell before buying", "buy before selling", "bridge loan calculator"],
    guide: {
      slug: "sell-first-or-buy-first",
      teaser: "What each order actually exposes you to",
    },
  },
  {
    slug: "home-affordability",
    title: "How much house can I afford?",
    nav: "How much house can I afford?",
    desc: "Turn your income, debts, and down payment into a realistic price range.",
    icon: Wallet, bg: "bg-amber-50", category: "Home", kind: "what-how",
    keywords: ["home affordability", "how much house can I afford", "debt to income ratio"],
    guide: {
      slug: "how-much-house-can-you-afford",
      teaser: "Why the 43% rule is no longer the test",
    },
  },
  {
    slug: "loan-estimate-comparison",
    title: "Which loan estimate is actually cheapest?",
    nav: "Which lender quote is cheapest?",
    desc: "Put three lender quotes side by side and find the real cost of each.",
    icon: ClipboardList, bg: "bg-teal-50", category: "Home", kind: "what-how",
    keywords: ["loan estimate comparison", "compare lenders", "closing costs"],
    guide: {
      slug: "how-to-compare-two-mortgage-quotes",
      teaser: "Which quoted costs are promises and which are guesses",
    },
  },
  // ---------- Debt ----------
  {
    slug: "debt-payoff",
    title: "Should I use the snowball or avalanche method?",
    nav: "Should I snowball or avalanche?",
    desc: "Compare the snowball and avalanche methods across all your balances.",
    icon: Snowflake, bg: "bg-blue-50", category: "Debt", kind: "should-i",
    keywords: ["debt snowball", "debt avalanche", "debt payoff plan"],
    guide: {
      slug: "snowball-or-avalanche",
      teaser: "Why avalanche always wins on paper, and snowball wins in practice",
    },
  },
  {
    slug: "blended-interest-rate",
    title: "What's my blended interest rate?",
    nav: "What's my blended rate?",
    desc: "Weight every rate by its balance, and see which debts the interest really comes from.",
    icon: Blend, bg: "bg-teal-50", category: "Debt", kind: "what-how",
    keywords: ["blended interest rate", "weighted average interest rate", "average interest rate on debt", "monthly interest on debt"],
    guide: {
      slug: "what-is-your-blended-interest-rate",
      teaser: "Why a large cheap debt hides a small expensive one",
    },
  },
  {
    slug: "student-loan-repayment",
    title: "Which student loan repayment plan should I choose?",
    nav: "Which student loan plan?",
    desc: "Compare the standard, extended, IBR and RAP plans on your balance.",
    icon: GraduationCap, bg: "bg-purple-50", category: "Debt", kind: "should-i",
    keywords: ["student loan repayment", "income driven repayment", "repayment assistance plan", "RAP", "loan forgiveness"],
    guide: {
      slug: "which-student-loan-repayment-plan",
      teaser: "What RAP changed, and which plans you can still pick",
    },
  },
  {
    slug: "debt-consolidation",
    title: "Should I consolidate my debt?",
    nav: "Should I consolidate my debt?",
    desc: "Pick which balances to roll into one loan, and see what each move costs.",
    icon: Combine, bg: "bg-amber-50", category: "Debt", kind: "should-i",
    keywords: ["debt consolidation calculator", "consolidation loan", "combine debts"],
    guide: {
      slug: "does-debt-consolidation-save-money",
      teaser: "Where the savings go when the term gets longer",
    },
  },
  {
    slug: "balance-transfer",
    title: "Should I do a balance transfer?",
    nav: "Should I do a balance transfer?",
    desc: "See what a 0% window saves once the transfer fee is counted.",
    icon: Shuffle, bg: "bg-purple-50", category: "Debt", kind: "should-i",
    keywords: ["balance transfer calculator", "0% APR transfer", "credit card transfer fee"],
    guide: {
      slug: "is-a-balance-transfer-worth-the-fee",
      teaser: "The fee, the deadline, and two rules on your side",
    },
  },
  {
    slug: "effective-interest-rate",
    title: "What interest rate am I really paying?",
    nav: "What rate am I really paying?",
    desc: "Turn a quoted rate plus points and fees into the rate you actually pay.",
    icon: BarChart3, bg: "bg-amber-50", category: "Debt", kind: "what-how",
    keywords: ["effective interest rate", "APR vs interest rate", "points and fees"],
    guide: {
      slug: "what-rate-are-you-really-paying",
      teaser: "What a lender's APR legally leaves out",
    },
  },
  // ---------- Money ----------
  {
    slug: "dividend-reinvestment",
    title: "Should I reinvest my dividends?",
    nav: "Should I reinvest dividends?",
    desc: "Compare taking dividends as cash against reinvesting every one.",
    icon: Banknote, bg: "bg-teal-50", category: "Money", kind: "should-i",
    keywords: ["DRIP calculator", "dividend reinvestment", "dividend growth"],
    guide: {
      slug: "reinvest-dividends-or-take-the-cash",
      teaser: "The tax bill that arrives whether you took the cash or not",
    },
  },
  {
    slug: "dollar-cost-averaging",
    title: "Should I invest all at once or dollar-cost average?",
    nav: "Should I invest all at once?",
    desc: "Invest all at once or spread it out — see how each plays out.",
    icon: CalendarDays, bg: "bg-blue-50", category: "Money", kind: "should-i",
    keywords: ["dollar cost averaging", "DCA vs lump sum", "average share cost"],
    guide: {
      slug: "lump-sum-or-dollar-cost-averaging",
      teaser: "Why lump sum usually wins, and when it does not",
    },
  },
  {
    slug: "early-withdrawal",
    title: "Should I withdraw from my retirement early?",
    nav: "Should I withdraw early?",
    desc: "Count the taxes, the 10% penalty, and the growth you would give up.",
    icon: AlertTriangle, bg: "bg-red-50", category: "Money", kind: "should-i",
    keywords: ["401k early withdrawal", "10% penalty", "IRA withdrawal tax"],
    guide: {
      slug: "what-early-retirement-withdrawal-costs",
      teaser: "Why the 10% penalty is the smallest part of the bill",
    },
  },
  {
    slug: "401k-vs-debt-payoff",
    title: "Should I capture my full 401(k) match or pay down debt?",
    nav: "Should I capture my full match?",
    desc: "Weigh an employer match against the guaranteed return of clearing debt.",
    icon: Scale3d, bg: "bg-green-50", category: "Money", kind: "should-i",
    keywords: ["401k match or pay off debt", "employer match vs debt", "capture full 401k match", "invest or pay down debt"],
    guide: {
      slug: "take-the-401k-match-or-pay-down-debt",
      teaser: "Why this one is not a close call",
    },
  },
  {
    slug: "roth-vs-traditional",
    title: "Should I do Roth or Traditional?",
    nav: "Should I do Roth or Traditional?",
    desc: "Pay tax now or later, decided by the bracket you expect in retirement.",
    icon: Split, bg: "bg-blue-50", category: "Money", kind: "should-i",
    keywords: ["Roth vs traditional 401k", "Roth IRA comparison", "pre-tax vs after-tax retirement"],
    guide: {
      slug: "roth-or-traditional",
      teaser: "The contribution-limit argument most comparisons miss",
    },
  },
  {
    slug: "compound-interest",
    title: "How will compound interest grow my money?",
    nav: "How will my money grow?",
    desc: "See how your money grows when interest starts earning interest.",
    icon: TrendingUp, bg: "bg-emerald-50", category: "Money", kind: "what-how",
    keywords: ["compound interest", "investment growth", "compounding frequency"],
    guide: {
      slug: "how-compound-interest-works",
      teaser: "Why the curve bends late, and the rule of 72",
    },
  },
  {
    slug: "savings-apy",
    title: "What does my savings account really earn?",
    nav: "What does my savings earn?",
    desc: "Turn a quoted savings rate into the yield you actually collect.",
    icon: Percent, bg: "bg-blue-50", category: "Money", kind: "what-how",
    keywords: ["APY calculator", "annual percentage yield", "compounding frequency", "savings account interest"],
    guide: {
      slug: "what-does-a-savings-account-really-earn",
      teaser: "Why APY is the number, and what inflation does to it",
    },
  },
  {
    slug: "investment-growth",
    title: "What will my investments be worth?",
    nav: "What will my portfolio be worth?",
    desc: "Project a portfolio with contributions, fees, taxes, and inflation.",
    icon: Sprout, bg: "bg-green-50", category: "Money", kind: "what-how",
    keywords: ["investment growth", "portfolio projection", "real return"],
    guide: {
      slug: "what-will-your-investments-be-worth",
      teaser: "What one percentage point of fees actually costs",
    },
  },
  {
    slug: "retirement-savings",
    title: "Am I on track for retirement?",
    nav: "Am I on track for retirement?",
    desc: "Find out if you are on track and how long your savings will last.",
    icon: PiggyBank, bg: "bg-orange-50", category: "Money", kind: "what-how",
    keywords: ["retirement calculator", "401k projection", "retirement income"],
    guide: {
      slug: "are-you-on-track-for-retirement",
      teaser: "The four numbers a retirement target is built from",
    },
  },
  {
    slug: "capital-gains",
    title: "What will I owe in capital gains tax?",
    nav: "What will I owe in capital gains?",
    desc: "Estimate what you will owe on a sale, and what waiting for long-term rates saves.",
    icon: Receipt, bg: "bg-amber-50", category: "Money", kind: "what-how",
    keywords: ["capital gains tax", "long term vs short term", "investment taxes"],
    guide: {
      slug: "what-will-you-owe-in-capital-gains-tax",
      teaser: "Why the rate is bracketed, not flat",
    },
  },
  {
    slug: "required-rate-of-return",
    title: "What return do I need to hit my goal?",
    nav: "What return do I need?",
    desc: "Work out the return you would need to hit a savings goal on time.",
    icon: Target, bg: "bg-purple-50", category: "Money", kind: "what-how",
    keywords: ["required rate of return", "savings goal", "target return"],
    guide: {
      slug: "what-return-do-you-need",
      teaser: "What makes a required return reasonable",
    },
  },
  {
    slug: "emergency-fund",
    title: "How big should my emergency fund be?",
    nav: "How big should my emergency fund be?",
    desc: "Size the cushion you need and see how fast you can build it.",
    icon: LifeBuoy, bg: "bg-teal-50", category: "Money", kind: "what-how",
    keywords: ["emergency fund", "months of expenses", "savings cushion"],
    guide: {
      slug: "how-big-should-an-emergency-fund-be",
      teaser: "Three to six months of what, exactly",
    },
  },
  {
    slug: "net-worth",
    title: "What's my net worth?",
    nav: "What's my net worth?",
    desc: "Add up what you own and what you owe, then project it forward.",
    icon: Trophy, bg: "bg-amber-50", category: "Money", kind: "what-how",
    keywords: ["net worth calculator", "assets minus liabilities", "track net worth"],
    guide: {
      slug: "how-to-calculate-your-net-worth",
      teaser: "The four judgment calls inside the number",
    },
  },
  // ---------- Auto ----------
  {
    slug: "lease-vs-buy",
    title: "Should I lease or buy a car?",
    nav: "Should I lease or buy?",
    desc: "Compare the true cost of leasing or buying your next car.",
    icon: Car, bg: "bg-teal-50", category: "Auto", kind: "should-i",
    keywords: ["lease vs buy", "car lease comparison", "cost of ownership"],
    guide: {
      slug: "is-leasing-or-buying-cheaper",
      teaser: "What a lease charges you for, and the maintenance myth",
    },
  },
  {
    slug: "loan-vs-cash",
    title: "Should I finance or pay cash?",
    nav: "Should I finance or pay cash?",
    desc: "Weigh loan interest against what your cash could earn instead.",
    icon: CreditCard, bg: "bg-blue-50", category: "Auto", kind: "should-i",
    keywords: ["pay cash or finance", "opportunity cost", "car loan interest"],
    guide: {
      slug: "finance-a-car-or-pay-cash",
      teaser: "Why the rebate and the promotional rate are usually a choice",
    },
  },
  {
    slug: "auto-loan-refinance",
    title: "Should I refinance my car loan?",
    nav: "Should I refinance my car loan?",
    desc: "See what a lower rate saves on the car loan you already have.",
    icon: Repeat, bg: "bg-purple-50", category: "Auto", kind: "should-i",
    keywords: ["auto refinance", "car loan refinance savings", "lower car payment"],
    guide: {
      slug: "is-refinancing-a-car-loan-worth-it",
      teaser: "What rolled-in fees do to a depreciating asset",
    },
  },
  {
    slug: "ev-savings",
    title: "Should I switch to an electric car?",
    nav: "Should I switch to an EV?",
    desc: "Compare fuel, maintenance, and incentives for electric and gas.",
    icon: Plug, bg: "bg-emerald-50", category: "Auto", kind: "should-i",
    keywords: ["EV savings calculator", "electric vs gas cost", "cost per mile"],
    guide: {
      slug: "do-electric-cars-save-money",
      teaser: "What the comparison looks like now the credit has gone",
    },
  },
  {
    slug: "new-vs-used-car",
    title: "Should I buy new or used?",
    nav: "Should I buy new or used?",
    desc: "Depreciation, interest and repairs over the years you actually keep it.",
    icon: CarFront, bg: "bg-green-50", category: "Auto", kind: "should-i",
    keywords: ["new vs used car calculator", "car depreciation comparison", "total cost of ownership"],
    guide: {
      slug: "new-or-used-which-is-the-better-buy",
      teaser: "Why the price gap is not the saving",
    },
  },
  {
    slug: "auto-affordability",
    title: "How much car can I afford?",
    nav: "How much car can I afford?",
    desc: "Set a price range that fits your income and your other bills.",
    icon: KeyRound, bg: "bg-amber-50", category: "Auto", kind: "what-how",
    keywords: ["car affordability", "how much car can I afford", "20/4/10 rule"],
    guide: {
      slug: "how-much-car-can-you-afford",
      teaser: "What 20/4/10 actually says",
    },
  },
  {
    slug: "total-cost-of-ownership",
    title: "What will this car really cost me?",
    nav: "What will this car really cost?",
    desc: "Add up depreciation, fuel, insurance, and repairs — the real price of a car.",
    icon: Calculator, bg: "bg-green-50", category: "Auto", kind: "what-how",
    keywords: ["total cost of ownership", "cost per mile", "car ownership costs"],
    guide: {
      slug: "what-a-car-really-costs-to-own",
      teaser: "The largest cost is the one that never sends a bill",
    },
  },
  {
    slug: "lease-payment",
    title: "What's my car lease payment?",
    nav: "What's my lease payment?",
    desc: "Build a lease payment from cap cost, residual value, and money factor.",
    icon: FileText, bg: "bg-blue-50", category: "Auto", kind: "what-how",
    keywords: ["lease payment calculator", "money factor", "residual value"],
    guide: {
      slug: "how-is-a-lease-payment-calculated",
      teaser: "The formula, and why rolled-in negative equity costs more",
    },
  },
  {
    slug: "depreciation",
    title: "What will my car be worth later?",
    nav: "What will my car be worth?",
    desc: "Track what a vehicle is worth each year, and when you are underwater.",
    icon: TrendingDown, bg: "bg-red-50", category: "Auto", kind: "what-how",
    keywords: ["car depreciation", "resale value", "underwater on car loan"],
    guide: {
      slug: "how-fast-does-a-car-lose-value",
      teaser: "Where the loan and the value cross, and how long you are underwater",
    },
  },
];

/**
 * Category display data, shared by the homepage nav and the /calculators index
 * so the two can never drift apart. `id` doubles as the anchor on /calculators.
 */
export const CATEGORY_SECTIONS: {
  category: Category;
  icon: LucideIcon;
  blurb: string;
  /**
   * Anchor on /calculators and the tab id in the bottom bar. Deliberately not
   * derived from `category`: the Home category keeps the id "real-estate" so it
   * can never collide with a site-home key, and so the original anchor keeps
   * working. Display name and id are free to differ.
   */
  id: string;
  /**
   * Label for the middle crumb on a calculator page, when the category name
   * alone would be ambiguous there. Optional: omitted means the category name
   * is used, which is right for three of the four.
   *
   * Only Home needs it, for the same reason `id` is "real-estate": a trail
   * reading "Home › Home › …" puts the site root and the category side by side
   * under one word pointing at two different places. That was visible on the
   * page before, and is now also emitted as BreadcrumbList structured data,
   * where it would reach search results.
   */
  crumb?: string;
  /** One accent colour per category. Full class strings — Tailwind only ships
   *  classes it can see written out in source. */
  text: string;
  tint: string;
}[] = [
  { category: "Home",  icon: Home,        id: "real-estate", crumb: "Home calculators", text: "text-green-700", tint: "bg-green-50",
    blurb: "Buying, refinancing, and everything that comes with a mortgage." },
  { category: "Debt",  icon: CreditCard,  id: "debt",  text: "text-amber-700", tint: "bg-amber-50",
    blurb: "Paying down what you owe, and what it is really costing you." },
  { category: "Money", icon: TrendingUp,  id: "money", text: "text-blue-600",  tint: "bg-blue-50",
    blurb: "Growing your savings and planning for what comes next." },
  { category: "Auto",  icon: Car,         id: "auto",  text: "text-teal-600",  tint: "bg-teal-50",
    blurb: "What a car really costs, from the lot to the day you sell it." },
];

/**
 * The middle crumb on a calculator page. Read by CalcShell for the visible
 * trail and by lib/schema.ts for the BreadcrumbList, so the two cannot drift.
 */
export const categoryCrumb = (category: Category): string =>
  CATEGORY_SECTIONS.find((s) => s.category === category)?.crumb ?? category;

export const bySlug = (slug: string): Calc | undefined =>
  CALCULATORS.find((c) => c.slug === slug);

/**
 * Sections within each category, in the order a reader meets the decisions,
 * and the order of calculators inside each. This is the one place order is
 * written down: byCategory, the /calculators and /guides indexes, the sidebar,
 * the homepage doors and the "More in this section" links all read it.
 *
 * `id` is the anchor on /calculators and /guides. `title` is the heading; a
 * category with a single untitled section (Debt) is ordered without headings,
 * because headings over two or three cards add clutter rather than structure.
 *
 * Every calculator must appear in exactly one section of its own category;
 * assertSections() enforces that when this module loads, so the build fails
 * on a calculator left out or listed twice, and lib/calcSections.test.mjs
 * checks it too. Sections change presentation only: no URL, category or
 * structured data depends on them.
 */
export type CalcSection = { id: string; title: string | null; slugs: readonly string[] };

export const CALC_SECTIONS: Record<Category, readonly CalcSection[]> = {
  Home: [
    { id: "buying-a-home", title: "Buying a home", slugs: [
      "rent-vs-buy", "home-affordability", "buy-now-or-save", "buy-now-or-wait",
      "fha-vs-conventional", "va-vs-conventional", "rate-buydown", "loan-estimate-comparison",
    ] },
    { id: "mortgage-payment-and-payoff", title: "Your mortgage payment and payoff", slugs: [
      "mortgage-payment", "extra-payments", "payoff-house-vs-invest", "pay-off-debt",
    ] },
    { id: "refinancing", title: "Refinancing", slugs: ["should-i-refinance", "va-recoup", "refinance-to-pay-off-debt"] },
    { id: "home-equity", title: "Home equity", slugs: ["heloc-vs-cash-out", "heloc-limit", "home-equity-loan-vs-heloc", "heloc-debt-payoff"] },
    { id: "selling-or-moving", title: "Selling or moving", slugs: ["rent-or-sell", "sell-first-or-buy-first"] },
  ],
  Debt: [
    { id: "debt-tools", title: null, slugs: [
      "blended-interest-rate", "debt-payoff", "balance-transfer", "debt-consolidation",
      "effective-interest-rate", "student-loan-repayment",
    ] },
  ],
  Money: [
    { id: "saving", title: "Saving", slugs: ["net-worth", "emergency-fund", "savings-apy", "compound-interest"] },
    { id: "investing", title: "Investing", slugs: [
      "investment-growth", "required-rate-of-return", "dollar-cost-averaging", "dividend-reinvestment", "capital-gains",
    ] },
    { id: "retirement", title: "Retirement", slugs: ["retirement-savings", "401k-vs-debt-payoff", "roth-vs-traditional", "early-withdrawal"] },
  ],
  Auto: [
    { id: "choosing-a-car", title: "Choosing a car", slugs: [
      "auto-affordability", "new-vs-used-car", "ev-savings", "total-cost-of-ownership", "depreciation",
    ] },
    { id: "paying-for-a-car", title: "Paying for it", slugs: ["loan-vs-cash", "lease-vs-buy", "lease-payment"] },
    { id: "after-you-buy", title: "After you buy", slugs: ["auto-loan-refinance"] },
  ],
};

/** Every calculator in exactly one section of its own category, and every section slug a real calculator. */
export function assertSections(calcs: readonly Calc[] = CALCULATORS, sections = CALC_SECTIONS): void {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const [category, list] of Object.entries(sections) as [Category, readonly CalcSection[]][]) {
    for (const section of list) {
      for (const slug of section.slugs) {
        const calc = calcs.find((c) => c.slug === slug);
        if (!calc) problems.push(`section "${section.id}" lists "${slug}", which is not a calculator`);
        else if (calc.category !== category) problems.push(`"${slug}" is in a ${category} section but its category is ${calc.category}`);
        if (seen.has(slug)) problems.push(`"${slug}" is in both "${seen.get(slug)}" and "${section.id}"`);
        seen.set(slug, section.id);
      }
    }
  }
  for (const c of calcs) if (!seen.has(c.slug)) problems.push(`"${c.slug}" (${c.category}) is in no section`);
  const ids = Object.values(sections).flat().map((s) => s.id);
  for (const id of ids) if (ids.filter((x) => x === id).length > 1) problems.push(`section id "${id}" is used twice`);
  if (problems.length) throw new Error(`CALC_SECTIONS:\n  ${[...new Set(problems)].join("\n  ")}`);
}
assertSections();

/** A category's sections with their calculators, in order. */
export const sectionsOf = (category: Category): { section: CalcSection; calcs: Calc[] }[] =>
  CALC_SECTIONS[category].map((section) => ({ section, calcs: section.slugs.map((s) => bySlug(s)!) }));

/** The calculators in a category, in section order. */
export const byCategory = (category: Category): Calc[] => sectionsOf(category).flatMap((s) => s.calcs);

/** The section a calculator sits in, with its siblings in order. */
export function sectionOf(slug: string): { section: CalcSection; calcs: Calc[] } | undefined {
  const calc = bySlug(slug);
  return calc ? sectionsOf(calc.category).find((s) => s.section.slugs.includes(slug)) : undefined;
}

/** Padded up to this many when a page declares fewer, so no page looks bare. */
const RELATED_MIN = 3;
/** The card grid lays out three or four; a fifth would orphan a row. */
export const RELATED_MAX = 4;

/**
 * Sibling calculators for the bottom of a page: everything the page declares,
 * then category siblings to reach RELATED_MIN if it declared fewer.
 *
 * Declared picks used to be capped at three silently, which dropped the fourth
 * on ten pages without a word — the link simply never rendered. Anything past
 * RELATED_MAX is still dropped, because the grid cannot lay it out, but it now
 * says so rather than doing it quietly.
 */
export function related(slug: string, picks: string[] = []): Calc[] {
  const chosen: Calc[] = [];
  for (const p of picks) {
    const c = bySlug(p);
    if (c && c.slug !== slug && !chosen.some((x) => x.slug === c.slug)) chosen.push(c);
  }
  if (chosen.length > RELATED_MAX) {
    console.warn(
      `[calculators] ${slug} declares ${chosen.length} related calculators; ` +
        `only the first ${RELATED_MAX} will render. Dropped: ` +
        chosen.slice(RELATED_MAX).map((c) => c.slug).join(", "),
    );
  }
  const self = bySlug(slug);
  const pool = self ? [...(sectionOf(slug)?.calcs ?? []), ...byCategory(self.category)] : CALCULATORS;
  for (const c of [...pool, ...CALCULATORS]) {
    if (chosen.length >= RELATED_MIN) break;
    if (c.slug === slug || chosen.some((x) => x.slug === c.slug)) continue;
    chosen.push(c);
  }
  return chosen.slice(0, RELATED_MAX);
}

/**
 * Track count for the related-card grid. Three and four need different
 * column counts — four in a three-column grid orphans the last card on a
 * row of its own. Both strings are written out in full because Tailwind
 * scans source text and never sees an interpolated class name.
 */
/**
 * Column counts for the related grid.
 *
 * Both step up at lg, not md, because md is exactly where the 220px sidebar
 * rail appears: the content column loses 220px at the same width the grid was
 * asking for another column, and the cards collapse. Three cards at md used to
 * be 156px wide against 241px for four, which is the wrong way round — the
 * three-card grid went straight from one column to three with nothing in
 * between, while the four-card one had an sm:grid-cols-2 step to land on.
 *
 * Holding at two columns through the md band and taking the third at lg costs
 * a second row between 768px and 1023px and is worth it: 241px reads, 156px
 * does not.
 */
export const relatedGridClass = (count: number): string =>
  count > RELATED_MIN
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";

/**
 * Calculators that have a guide written for them. The homepage guide count is
 * taken from here rather than from a number typed into the copy, and
 * lib/guides.ts fails the build if it does not match the files on disk.
 */
export const GUIDED = CALCULATORS.filter((c) => c.guide);

/** True while every calculator has a guide written for it. */
export const EVERY_CALC_GUIDED = GUIDED.length === CALCULATORS.length;

const GUIDED_NOUN = GUIDED.length === 1 ? "Calculator With a Guide" : "Calculators With a Guide";

/**
 * The guides claim, stated as coverage rather than as a count, in the three
 * places that make it: both homepage stat bars and the 404 page.
 *
 * It reads as one fact instead of two. Every calculator has a guide, so
 * printing the guide count beside the calculator count showed the same number
 * twice — on the homepage, side by side in the same row — and read as a
 * copy-paste slip rather than as two figures.
 *
 * Coverage is also the only guides statement those three can make truthfully.
 * All are client components, and the real guide list in lib/guides.ts reads the
 * filesystem, so none of them can import it. What they CAN see is GUIDED, which
 * is CALCULATORS.filter(c => c.guide) — a count of calculators that have a
 * guide, not a count of guides. The two are equal today and come apart the
 * moment content/guides gains an unpaired guide, which its frontmatter allows
 * (`calculator` is optional). A tile labelled "In-Depth Guides" showing
 * GUIDED.length would then be quietly undercounting, with no way to notice.
 *
 * An unpaired guide cannot falsify "a guide for every tool": the claim is about
 * covering the calculators, so a guide belonging to none of them only adds
 * something never claimed. The claim fails the other way — a calculator shipped
 * before its guide is written — and that direction IS visible from here, as
 * GUIDED.length < CALCULATORS.length. In that state the wording falls back to a
 * figure, which is no longer a repeat of the calculator count because the two
 * numbers now differ, under a label that says exactly what GUIDED counts.
 *
 * Deliberately not a build error, unlike the pairing checks in lib/guides.ts: a
 * calculator landing before its guide is a legitimate intermediate state, and
 * forcing guide-first ordering would buy nothing.
 */
export const GUIDE_COVERAGE = EVERY_CALC_GUIDED
  ? { headline: "A Guide", detail: "For Every Tool", prose: "A guide for every tool" }
  : {
      headline: `${GUIDED.length}`,
      detail: GUIDED_NOUN,
      prose: `${GUIDED.length} ${GUIDED_NOUN.toLowerCase()}`,
    };

export const SITE = "https://shouldifinance.com";

/**
 * The share card, used by every page's Open Graph and Twitter metadata.
 *
 * ONE DEFINITION, IMPORTED EVERYWHERE — not inherited. Next replaces the
 * `openGraph` and `twitter` objects wholesale rather than merging their
 * fields, so a page that sets either one loses whatever the root layout put
 * there. Declaring the image only in the layout left 95 of 97 pages without
 * it while still advertising `card: "summary_large_image"`, which promises an
 * image and gave scrapers nothing to show.
 *
 * The URL is absolute and has to stay that way: a scraper fetches og:image
 * with no page context, so a relative path is simply dropped.
 */
export const OG_IMAGE = {
  url: `${SITE}/og-image.png`,
  width: 1200,
  height: 630,
  alt: "ShouldIFinance — better questions, smarter decisions. Free financial calculators and guides.",
};

/**
 * Shared metadata builder. Title and keywords come from the registry, so a
 * rename in CALCULATORS updates the page <title> without touching 29 files.
 */
/**
 * Google clips a title link around 60 characters, and the site-name suffix the
 * root layout appends is both the least useful part and the first thing cut.
 *
 * So the suffix is conditional rather than global: kept where the whole title
 * fits, dropped where it would not. Dropping it is enough on its own — every
 * over-length title on the site came inside 60 without it, the longest landing
 * exactly on the limit — which is why none of the titles themselves were
 * rewritten. They are question-shaped because that is what someone types into
 * a search box, and compressing them to make room for a suffix would trade the
 * valuable half for the disposable one.
 *
 * Returning `{ absolute }` is how a page opts out of a parent template; see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md.
 * The openGraph and twitter titles keep the suffix unconditionally: a social
 * card is not clipped at the same place, and the brand earns its room there.
 */
const TITLE_LIMIT = 60;
const TITLE_SUFFIX = " | ShouldIFinance";

export function pageTitle(raw: string): string | { absolute: string } {
  return raw.length + TITLE_SUFFIX.length > TITLE_LIMIT ? { absolute: raw } : raw;
}

export function calcMetadata(slug: string, description: string) {
  const calc = bySlug(slug);
  const title = calc?.title ?? slug;
  const keywords = calc?.keywords ?? [];
  const url = `${SITE}/calculators/${slug}`;
  return {
    title: pageTitle(title),
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
    images: [OG_IMAGE],
      title: `${title} | ShouldIFinance`,
      description,
      url,
      siteName: "ShouldIFinance",
      type: "website" as const,
    },
    twitter: {
    images: [OG_IMAGE.url],
      card: "summary_large_image" as const,
      title: `${title} | ShouldIFinance`,
      description,
    },
  };
}
