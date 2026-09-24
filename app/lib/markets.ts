/**
 * Market figures the calculators judge results against.
 *
 * These are measurements, not assumptions, and they are cited wherever they
 * appear. They live here rather than inside a calculator because the guides
 * quote them too, and a guide and its calculator disagreeing about what the
 * S&P 500 has returned would be worse than either being slightly out of date.
 *
 * Update them together, and bump the "as of" note.
 */

/**
 * Long-run US returns, 1928-2025, as geometric averages over 98 years of
 * annual returns. From Aswath Damodaran's dataset at NYU Stern: $100 invested
 * at the start of 1928 ended 2025 at $1,157,598.95 in the S&P 500 with
 * dividends reinvested, $7,752.88 in 10-year Treasuries and $2,578.30 in
 * 3-month bills.
 *
 * Verdict bands hang off these rather than off round numbers, because the
 * useful fact about a required return is where it sits against what the broad
 * asset classes have actually delivered. Any mix of stocks and bonds has a
 * long-run return somewhere between the bond and stock figures, so a required
 * return above the stock figure is a bet on beating the best of them.
 */
export const LONG_RUN = { stocks: 10.02, bonds: 4.54, bills: 3.37 };

/** The window the figures above are measured over. */
export const LONG_RUN_PERIOD = "1928 to 2025";

/**
 * The top of "aggressive". Unlike the three above this is a judgement, not a
 * measurement — it marks where a required return stops describing a portfolio
 * and starts describing a hope.
 */
export const FANCIFUL_RETURN = 15;

/** Sits between the long-run bond and stock figures — a mixed portfolio. */
export const BENCHMARK_RETURN = 7;

/**
 * Asset-weighted average expense ratios for equity mutual funds in 2025.
 * ICI Research Perspective 32, no. 1 (March 2026), "Trends in the Expenses
 * and Fees of Funds, 2025", Figure 6.
 */
export const FUND_FEES = { index: 0.05, active: 0.64 };
export const FUND_FEES_YEAR = 2025;

/**
 * Five-year vehicle depreciation, from iSeeCars' study of 950,000
 * five-year-old used cars sold March 2025 to February 2026, published
 * 24 March 2026: 57.2% for electric vehicles against a 41.8% average across
 * all vehicles.
 *
 * The all-vehicle figure blends in cars bought further down the curve, which
 * is exactly why it works as the used-car comparator and not as a new-car
 * rate — a new car's first year is much steeper than its average year.
 */
export const DEPRECIATION_5YR = { ev: 0.572, allVehicles: 0.418 };
export const DEPRECIATION_SOURCE = "iSeeCars, March 2026";
