import type { LucideIcon } from "lucide-react";
import {
  Landmark, RefreshCw, Home, Wallet, PlusCircle, Medal, Scale, ClipboardList,
  BarChart3, TrendingUp, Sprout, PiggyBank, Banknote, CalendarDays, Receipt,
  Target, AlertTriangle, Car, CreditCard, Repeat, KeyRound, Calculator,
  FileText, Plug, TrendingDown, Snowflake, LifeBuoy, GraduationCap, Trophy,
  ShieldCheck, Percent, Clock, Coins, ArrowLeftRight, Combine, ShieldAlert, Shuffle,
  Scale3d, Split, HandCoins, CarFront, Merge,
} from "lucide-react";

export type Category = "Home" | "Debt" | "Money" | "Auto";

/**
 * Decision tools ("Should I ...?") versus lookup tools ("What / How ...?").
 * byCategory sorts decisions first, so the ordering is the same on the
 * homepage, the /calculators index and the sidebar without anyone repeating it.
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
  {
    slug: "effective-interest-rate",
    title: "What interest rate am I really paying?",
    nav: "What rate am I really paying?",
    desc: "Turn a quoted rate plus points and fees into the rate you actually pay.",
    icon: BarChart3, bg: "bg-amber-50", category: "Debt", kind: "what-how",
    keywords: ["effective interest rate", "APR vs interest rate", "annual percentage yield"],
    guide: {
      slug: "what-rate-are-you-really-paying",
      teaser: "What a lender's APR legally leaves out",
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

  // ---------- Money ----------
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
  // ---------- Debt / Money ----------
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
  // ---------- Debt ----------
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
    slug: "heloc-debt-payoff",
    title: "Should I use a HELOC to pay off high-interest debt?",
    nav: "Should I use a HELOC to pay off debt?",
    desc: "Trade a high rate for a lower one — and see the payment jump when the draw period ends.",
    icon: ShieldAlert, bg: "bg-red-50", category: "Debt", kind: "should-i",
    keywords: ["HELOC to pay off credit cards", "home equity debt consolidation", "HELOC draw period", "HELOC payment shock"],
    guide: {
      slug: "home-equity-to-pay-off-credit-cards",
      teaser: "What an interest-only draw period really does",
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
  /** One accent colour per category. Full class strings — Tailwind only ships
   *  classes it can see written out in source. */
  text: string;
  tint: string;
}[] = [
  { category: "Home",  icon: Home,        id: "real-estate", text: "text-green-700", tint: "bg-green-50",
    blurb: "Buying, refinancing, and everything that comes with a mortgage." },
  { category: "Debt",  icon: CreditCard,  id: "debt",  text: "text-amber-700", tint: "bg-amber-50",
    blurb: "Paying down what you owe, and what it is really costing you." },
  { category: "Money", icon: TrendingUp,  id: "money", text: "text-blue-600",  tint: "bg-blue-50",
    blurb: "Growing your savings and planning for what comes next." },
  { category: "Auto",  icon: Car,         id: "auto",  text: "text-teal-600",  tint: "bg-teal-50",
    blurb: "What a car really costs, from the lot to the day you sell it." },
];

export const bySlug = (slug: string): Calc | undefined =>
  CALCULATORS.find((c) => c.slug === slug);

/** Decision tools first, then lookups; registry order is kept within each group. */
export const byCategory = (category: Category): Calc[] =>
  CALCULATORS.filter((c) => c.category === category).sort(
    (a, b) => (a.kind === b.kind ? 0 : a.kind === "should-i" ? -1 : 1),
  );

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
  const pool = self ? byCategory(self.category) : CALCULATORS;
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
export function calcMetadata(slug: string, description: string) {
  const calc = bySlug(slug);
  const title = calc?.title ?? slug;
  const keywords = calc?.keywords ?? [];
  const url = `${SITE}/calculators/${slug}`;
  return {
    title,
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
