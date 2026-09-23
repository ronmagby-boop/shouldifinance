import {
  CLEAN_VEHICLE_CREDITS,
  LT_GAINS_BRACKETS,
  NIIT_RATE,
  NIIT_THRESHOLDS,
  RETIREMENT_LIMITS,
  STANDARD_DEDUCTION,
  STUDENT_LOAN_INTEREST_CAP,
  TAX_YEAR,
} from "./tax";
import { PMI_TERMINATION_LTV } from "./finance";
import {
  IBR_NEW_FORGIVE_MONTHS,
  IBR_NEW_PCT,
  IBR_POVERTY_MULTIPLE,
  IBR_PRIOR_FORGIVE_MONTHS,
  IBR_PRIOR_PCT,
  LEGACY_PLAN_SUNSET,
  NEW_LOAN_CUTOFF,
  POLICY_AS_OF,
  RAP_DEPENDENT_DEDUCTION,
  RAP_FORGIVE_MONTHS,
  RAP_MIN_PAYMENT,
  RAP_PRINCIPAL_MATCH,
} from "./studentLoans";

/**
 * Figures a guide may cite, resolved at build time from the constants the
 * calculators use.
 *
 * A guide writes `{{TAX_YEAR}}` or `{{IRA_LIMIT}}` rather than the number. The
 * point is that a guide and the calculator it explains can never quote
 * different figures: when lib/tax.ts is updated for a new year, every guide
 * that cites one of these updates with it, and a guide citing something that
 * does not exist here fails the build rather than going quietly stale.
 *
 * Only figures that actually move belong here. A rule fixed in statute — the
 * 36-month VA ceiling, the $250,000 home-sale exclusion, the 210-day seasoning
 * clock — is written in the prose, because there is no constant for it to
 * drift away from.
 */
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export const GUIDE_TOKENS: Record<string, string> = {
  TAX_YEAR: String(TAX_YEAR),

  STANDARD_DEDUCTION_SINGLE: money(STANDARD_DEDUCTION.single),
  STANDARD_DEDUCTION_MARRIED: money(STANDARD_DEDUCTION.marriedFilingJointly),
  STANDARD_DEDUCTION_HEAD: money(STANDARD_DEDUCTION.headOfHousehold),

  STUDENT_LOAN_INTEREST_CAP: money(STUDENT_LOAN_INTEREST_CAP),

  ELECTIVE_DEFERRAL: money(RETIREMENT_LIMITS.electiveDeferral),
  CATCH_UP_50: money(RETIREMENT_LIMITS.catchUp50),
  CATCH_UP_60_TO_63: money(RETIREMENT_LIMITS.catchUp60to63),
  IRA_LIMIT: money(RETIREMENT_LIMITS.ira),

  LTCG_ZERO_TOP_SINGLE: money(LT_GAINS_BRACKETS.single.zeroUpTo),
  LTCG_ZERO_TOP_MARRIED: money(LT_GAINS_BRACKETS.married.zeroUpTo),
  LTCG_FIFTEEN_TOP_SINGLE: money(LT_GAINS_BRACKETS.single.fifteenUpTo),
  LTCG_FIFTEEN_TOP_MARRIED: money(LT_GAINS_BRACKETS.married.fifteenUpTo),

  NIIT_RATE: `${NIIT_RATE}%`,
  NIIT_THRESHOLD_SINGLE: money(NIIT_THRESHOLDS.single),
  NIIT_THRESHOLD_MARRIED: money(NIIT_THRESHOLDS.married),

  EV_NEW_CREDIT_CUTOFF: CLEAN_VEHICLE_CREDITS.newVehicleCutoff,
  EV_USED_CREDIT_CUTOFF: CLEAN_VEHICLE_CREDITS.usedVehicleCutoff,
  EV_CHARGER_CUTOFF: CLEAN_VEHICLE_CREDITS.chargerCutoff,
  EV_FORMER_CREDIT_MAX: money(CLEAN_VEHICLE_CREDITS.formerNewVehicleMax),

  PMI_TERMINATION_LTV: `${Math.round(PMI_TERMINATION_LTV * 100)}%`,

  STUDENT_POLICY_AS_OF: POLICY_AS_OF,
  NEW_LOAN_CUTOFF,
  LEGACY_PLAN_SUNSET,
  RAP_MIN_PAYMENT: money(RAP_MIN_PAYMENT),
  RAP_DEPENDENT_DEDUCTION: money(RAP_DEPENDENT_DEDUCTION),
  RAP_PRINCIPAL_MATCH: money(RAP_PRINCIPAL_MATCH),
  RAP_FORGIVE_YEARS: String(RAP_FORGIVE_MONTHS / 12),
  RAP_FORGIVE_PAYMENTS: RAP_FORGIVE_MONTHS.toLocaleString("en-US"),
  IBR_NEW_PCT: `${IBR_NEW_PCT}%`,
  IBR_NEW_FORGIVE_YEARS: String(IBR_NEW_FORGIVE_MONTHS / 12),
  IBR_PRIOR_PCT: `${IBR_PRIOR_PCT}%`,
  IBR_PRIOR_FORGIVE_YEARS: String(IBR_PRIOR_FORGIVE_MONTHS / 12),
  IBR_POVERTY_MULTIPLE: `${Math.round(IBR_POVERTY_MULTIPLE * 100)}%`,
};

const TOKEN = /\{\{([A-Z0-9_]+)\}\}/g;

/** Substitutes every {{TOKEN}} in a guide body, or names the ones it cannot. */
export function resolveTokens(body: string, file: string): string {
  const unknown = new Set<string>();
  const out = body.replace(TOKEN, (whole, key: string) => {
    if (key in GUIDE_TOKENS) return GUIDE_TOKENS[key];
    unknown.add(key);
    return whole;
  });
  if (unknown.size) {
    throw new Error(
      `content/guides/${file} cites unknown figure${unknown.size > 1 ? "s" : ""} ` +
        `${[...unknown].map((k) => `{{${k}}}`).join(", ")}. ` +
        `Add it to app/lib/guide-tokens.ts, sourced from the constants the calculators use.`,
    );
  }
  return out;
}
