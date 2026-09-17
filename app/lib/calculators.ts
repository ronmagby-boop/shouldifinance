import type { LucideIcon } from "lucide-react";
import {
  Landmark, RefreshCw, Home, Wallet, PlusCircle, Medal, Scale, ClipboardList,
  BarChart3, TrendingUp, Sprout, PiggyBank, Banknote, CalendarDays, Receipt,
  Target, AlertTriangle, Car, CreditCard, Repeat, KeyRound, Calculator,
  FileText, Plug, TrendingDown, Snowflake, LifeBuoy, GraduationCap, Trophy,
} from "lucide-react";

/**
 * Personal finance was folded into Investing — debt, savings and net worth sit
 * alongside the growth tools rather than in a category of their own.
 */
export type Category = "Real estate" | "Investing" | "Auto";

export type Calc = {
  slug: string;
  title: string;
  nav: string;
  desc: string;
  /** lucide-react icon component; rendered as <calc.icon className="..." /> */
  icon: LucideIcon;
  bg: string;
  category: Category;
  keywords: string[];
};

export const CALCULATORS: Calc[] = [
  // ---------- Real estate ----------
  {
    slug: "mortgage-payment",
    title: "Mortgage payment calculator",
    nav: "Mortgage payment",
    desc: "Estimate your monthly payment including principal, interest, taxes, insurance, and PMI.",
    icon: Landmark, bg: "bg-blue-50", category: "Real estate",
    keywords: ["mortgage calculator", "monthly payment", "PITI", "PMI"],
  },
  {
    slug: "should-i-refinance",
    title: "Should I refinance?",
    nav: "Should I refinance?",
    desc: "See if refinancing saves money, when you break even, and what it costs to reset the clock.",
    icon: RefreshCw, bg: "bg-purple-50", category: "Real estate",
    keywords: ["refinance calculator", "break even", "refinance savings"],
  },
  {
    slug: "rent-vs-buy",
    title: "Rent vs. buy calculator",
    nav: "Rent vs. buy",
    desc: "Compare the true cost of renting and buying over 5, 10, and 30 years.",
    icon: Home, bg: "bg-green-50", category: "Real estate",
    keywords: ["rent vs buy", "should I buy a house", "break even year"],
  },
  {
    slug: "home-affordability",
    title: "How much house can I afford?",
    nav: "How much can I afford?",
    desc: "Turn your income, debts, and down payment into a realistic price range.",
    icon: Wallet, bg: "bg-amber-50", category: "Real estate",
    keywords: ["home affordability", "how much house can I afford", "debt to income ratio"],
  },
  {
    slug: "extra-payments",
    title: "Extra mortgage payments calculator",
    nav: "Extra payments",
    desc: "See how much time and interest an extra payment each month can save you.",
    icon: PlusCircle, bg: "bg-emerald-50", category: "Real estate",
    keywords: ["extra mortgage payment", "pay off mortgage early", "interest saved"],
  },
  {
    slug: "va-recoup",
    title: "VA loan recoupment calculator",
    nav: "VA recoup",
    desc: "Check whether a VA IRRRL meets the 36-month recoupment rule.",
    icon: Medal, bg: "bg-blue-50", category: "Real estate",
    keywords: ["VA IRRRL", "recoupment period", "VA streamline refinance"],
  },
  {
    slug: "pay-off-debt",
    title: "Pay off debt or invest?",
    nav: "Pay off debt",
    desc: "Compare the guaranteed return of paying down debt against investing the same money.",
    icon: Scale, bg: "bg-purple-50", category: "Real estate",
    keywords: ["pay off debt vs invest", "guaranteed return", "mortgage payoff"],
  },
  {
    slug: "loan-estimate-comparison",
    title: "Loan estimate comparison",
    nav: "Loan estimate compare",
    desc: "Put three lender quotes side by side and find the real cost of each.",
    icon: ClipboardList, bg: "bg-teal-50", category: "Real estate",
    keywords: ["loan estimate comparison", "compare lenders", "closing costs"],
  },
  {
    slug: "effective-interest-rate",
    title: "Effective interest rate calculator",
    nav: "Effective interest rate",
    desc: "Turn a quoted rate plus points and fees into the rate you actually pay.",
    icon: BarChart3, bg: "bg-amber-50", category: "Real estate",
    keywords: ["effective interest rate", "APR vs interest rate", "annual percentage yield"],
  },

  // ---------- Investing ----------
  {
    slug: "compound-interest",
    title: "Compound interest calculator",
    nav: "Compound interest",
    desc: "See how your money grows when interest starts earning interest.",
    icon: TrendingUp, bg: "bg-emerald-50", category: "Investing",
    keywords: ["compound interest", "investment growth", "compounding frequency"],
  },
  {
    slug: "investment-growth",
    title: "Investment growth calculator",
    nav: "Investment growth",
    desc: "Project a portfolio with contributions, fees, taxes, and inflation.",
    icon: Sprout, bg: "bg-green-50", category: "Investing",
    keywords: ["investment growth", "portfolio projection", "real return"],
  },
  {
    slug: "retirement-savings",
    title: "Retirement savings calculator",
    nav: "Retirement savings",
    desc: "Find out if you are on track and how long your savings will last.",
    icon: PiggyBank, bg: "bg-orange-50", category: "Investing",
    keywords: ["retirement calculator", "401k projection", "retirement income"],
  },
  {
    slug: "dividend-reinvestment",
    title: "Dividend reinvestment (DRIP) calculator",
    nav: "Dividend reinvestment",
    desc: "Compare taking dividends as cash against reinvesting every one.",
    icon: Banknote, bg: "bg-teal-50", category: "Investing",
    keywords: ["DRIP calculator", "dividend reinvestment", "dividend growth"],
  },
  {
    slug: "dollar-cost-averaging",
    title: "Dollar-cost averaging calculator",
    nav: "Dollar-cost averaging",
    desc: "Invest all at once or spread it out — see how each plays out.",
    icon: CalendarDays, bg: "bg-blue-50", category: "Investing",
    keywords: ["dollar cost averaging", "DCA vs lump sum", "average share cost"],
  },
  {
    slug: "capital-gains",
    title: "Capital gains tax calculator",
    nav: "Capital gains",
    desc: "Estimate what you will owe on a sale, and what waiting for long-term rates saves.",
    icon: Receipt, bg: "bg-amber-50", category: "Investing",
    keywords: ["capital gains tax", "long term vs short term", "investment taxes"],
  },
  {
    slug: "required-rate-of-return",
    title: "Required rate of return calculator",
    nav: "Required rate of return",
    desc: "Work out the return you would need to hit a savings goal on time.",
    icon: Target, bg: "bg-purple-50", category: "Investing",
    keywords: ["required rate of return", "savings goal", "target return"],
  },
  {
    slug: "early-withdrawal",
    title: "Early withdrawal penalty calculator",
    nav: "Early withdrawal",
    desc: "Count the taxes, the 10% penalty, and the growth you would give up.",
    icon: AlertTriangle, bg: "bg-red-50", category: "Investing",
    keywords: ["401k early withdrawal", "10% penalty", "IRA withdrawal tax"],
  },

  // ---------- Auto ----------
  {
    slug: "lease-vs-buy",
    title: "Lease vs. buy calculator",
    nav: "Lease vs. buy",
    desc: "Compare the true cost of leasing or buying your next car.",
    icon: Car, bg: "bg-teal-50", category: "Auto",
    keywords: ["lease vs buy", "car lease comparison", "cost of ownership"],
  },
  {
    slug: "loan-vs-cash",
    title: "Finance or pay cash?",
    nav: "Loan vs. cash",
    desc: "Weigh loan interest against what your cash could earn instead.",
    icon: CreditCard, bg: "bg-blue-50", category: "Auto",
    keywords: ["pay cash or finance", "opportunity cost", "car loan interest"],
  },
  {
    slug: "auto-loan-refinance",
    title: "Auto loan refinance calculator",
    nav: "Auto refinance",
    desc: "See what a lower rate saves on the car loan you already have.",
    icon: Repeat, bg: "bg-purple-50", category: "Auto",
    keywords: ["auto refinance", "car loan refinance savings", "lower car payment"],
  },
  {
    slug: "auto-affordability",
    title: "How much car can I afford?",
    nav: "Auto affordability",
    desc: "Set a price range that fits your income and your other bills.",
    icon: KeyRound, bg: "bg-amber-50", category: "Auto",
    keywords: ["car affordability", "how much car can I afford", "20/4/10 rule"],
  },
  {
    slug: "total-cost-of-ownership",
    title: "Total cost of ownership calculator",
    nav: "Cost of ownership",
    desc: "Add up depreciation, fuel, insurance, and repairs — the real price of a car.",
    icon: Calculator, bg: "bg-green-50", category: "Auto",
    keywords: ["total cost of ownership", "cost per mile", "car ownership costs"],
  },
  {
    slug: "lease-payment",
    title: "Car lease payment calculator",
    nav: "Lease payment",
    desc: "Build a lease payment from cap cost, residual value, and money factor.",
    icon: FileText, bg: "bg-blue-50", category: "Auto",
    keywords: ["lease payment calculator", "money factor", "residual value"],
  },
  {
    slug: "ev-savings",
    title: "EV vs. gas savings calculator",
    nav: "EV savings",
    desc: "Compare fuel, maintenance, and incentives for electric and gas.",
    icon: Plug, bg: "bg-emerald-50", category: "Auto",
    keywords: ["EV savings calculator", "electric vs gas cost", "cost per mile"],
  },
  {
    slug: "depreciation",
    title: "Car depreciation calculator",
    nav: "Depreciation",
    desc: "Track what a vehicle is worth each year, and when you are underwater.",
    icon: TrendingDown, bg: "bg-red-50", category: "Auto",
    keywords: ["car depreciation", "resale value", "underwater on car loan"],
  },

  // ---------- Personal finance (folded into Investing) ----------
  {
    slug: "debt-payoff",
    title: "Debt payoff calculator",
    nav: "Debt payoff",
    desc: "Compare the snowball and avalanche methods across all your balances.",
    icon: Snowflake, bg: "bg-blue-50", category: "Investing",
    keywords: ["debt snowball", "debt avalanche", "debt payoff plan"],
  },
  {
    slug: "emergency-fund",
    title: "Emergency fund calculator",
    nav: "Emergency fund",
    desc: "Size the cushion you need and see how fast you can build it.",
    icon: LifeBuoy, bg: "bg-teal-50", category: "Investing",
    keywords: ["emergency fund", "months of expenses", "savings cushion"],
  },
  {
    slug: "student-loan-repayment",
    title: "Student loan repayment calculator",
    nav: "Student loans",
    desc: "Compare standard, extended, and income-driven repayment side by side.",
    icon: GraduationCap, bg: "bg-purple-50", category: "Investing",
    keywords: ["student loan repayment", "income driven repayment", "loan forgiveness"],
  },
  {
    slug: "net-worth",
    title: "Net worth calculator",
    nav: "Net worth",
    desc: "Add up what you own and what you owe, then project it forward.",
    icon: Trophy, bg: "bg-amber-50", category: "Investing",
    keywords: ["net worth calculator", "assets minus liabilities", "track net worth"],
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
  id: string;
}[] = [
  { category: "Real estate", icon: Home, blurb: "Buying, refinancing, and everything that comes with a mortgage.", id: "real-estate" },
  { category: "Investing", icon: TrendingUp, blurb: "Growing your money, planning for retirement, and the debt and savings decisions that go with it.", id: "investing" },
  { category: "Auto", icon: Car, blurb: "What a car really costs, from the lot to the day you sell it.", id: "auto" },
];

export const bySlug = (slug: string): Calc | undefined =>
  CALCULATORS.find((c) => c.slug === slug);

export const byCategory = (category: Category): Calc[] =>
  CALCULATORS.filter((c) => c.category === category);

/** Up to three sibling calculators to surface at the bottom of a page. */
export function related(slug: string, picks: string[] = []): Calc[] {
  const chosen: Calc[] = [];
  for (const p of picks) {
    const c = bySlug(p);
    if (c && c.slug !== slug) chosen.push(c);
  }
  const self = bySlug(slug);
  const pool = self ? byCategory(self.category) : CALCULATORS;
  for (const c of [...pool, ...CALCULATORS]) {
    if (chosen.length >= 3) break;
    if (c.slug === slug || chosen.some((x) => x.slug === c.slug)) continue;
    chosen.push(c);
  }
  return chosen.slice(0, 3);
}

export const SITE = "https://shouldifinance.com";

/** Shared metadata builder so every calculator page gets consistent SEO tags. */
export function calcMetadata(
  slug: string,
  title: string,
  description: string,
  keywords: string[],
) {
  const url = `${SITE}/calculators/${slug}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ShouldIFinance`,
      description,
      url,
      siteName: "ShouldIFinance",
      type: "website" as const,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} | ShouldIFinance`,
      description,
    },
  };
}
