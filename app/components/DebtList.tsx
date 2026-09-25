"use client";
import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { NumField, TextField, type Num } from "./Inputs";

export type DebtRow = {
  name: string;
  balance: Num;
  rate: Num;
  /** The monthly payment, or the minimum — the label is the caller's choice. */
  pmt: Num;
  /** Whether this debt is rolled into the new loan. */
  payoff: boolean;
};

export const BLANK_DEBT: DebtRow = { name: "", balance: "", rate: "", pmt: "", payoff: true };

/**
 * The editable debt list shared by the two "roll these debts into one loan"
 * calculators — one using a mortgage, one using a personal loan.
 *
 * It lived inside refinance-to-pay-off-debt first. It is here so the two pages
 * cannot drift: the column widths, the sr-only label trick and the tap targets
 * are fiddly enough that a second copy would have diverged within a release.
 *
 * Everything breaks at xl rather than md because a row puts five controls
 * across; below that it becomes a stacked card with visible labels.
 */
export default function DebtList({
  debts,
  onUpdate,
  onAdd,
  onRemove,
  paymentLabel = "Payment",
  paymentPlaceholder = "430",
  balancePlaceholder = "14200",
  ratePlaceholder = "24.9",
  checkboxAction = "Pay off",
  addLabel = "Add a debt",
  rowNote,
}: {
  debts: DebtRow[];
  onUpdate: (i: number, patch: Partial<DebtRow>) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  paymentLabel?: string;
  paymentPlaceholder?: string;
  balancePlaceholder?: string;
  ratePlaceholder?: string;
  /** Verb for the checkbox's accessible name, e.g. "Consolidate". */
  checkboxAction?: string;
  addLabel?: string;
  /** Optional line under a row — a warning, a figure, anything per-debt. */
  rowNote?: (debt: DebtRow, index: number) => ReactNode;
}) {
  const headCell = "text-xs font-medium text-gray-400";
  const cols =
    "xl:grid-cols-[auto_minmax(120px,1.6fr)_minmax(112px,1fr)_minmax(100px,0.92fr)_minmax(96px,0.86fr)_auto]";

  return (
    <div className="space-y-2">
      {/* Column headings from xl up; each row repeats them for screen readers
          only, so the rows themselves stay one line tall. */}
      <div className={`hidden xl:grid ${cols} xl:gap-2 xl:items-end xl:px-0.5`}>
        <span className="w-8" aria-hidden="true" />
        <span className={headCell}>Debt</span>
        <span className={headCell}>Balance</span>
        <span className={headCell}>Rate</span>
        <span className={headCell}>{paymentLabel}</span>
        <span className="w-7" aria-hidden="true" />
      </div>

      {debts.map((d, i) => {
        const label = d.name.trim() || `debt ${i + 1}`;
        const note = rowNote?.(d, i);
        return (
          <div key={i} className="border-b border-gray-100 xl:border-0 pb-2 xl:pb-0">
            <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] ${cols} gap-2 items-center`}>
              <label className="flex items-center justify-center w-8 h-11 cursor-pointer xl:order-1">
                {/* Tagged for export too. This was missing alongside the name
                    and is the worse of the two: a blank name is visibly blank,
                    whereas a payoff flag that silently reverts to its default
                    changes the totals on the restored page without anything
                    looking wrong. */}
                <input
                  type="checkbox"
                  checked={d.payoff}
                  onChange={(e) => onUpdate(i, { payoff: e.target.checked })}
                  data-x-field={`${checkboxAction} debt`}
                  data-x-kind="bool"
                  className="w-4 h-4 accent-green-700"
                  aria-label={`${checkboxAction} ${label}`}
                />
              </label>
              <div className="xl:order-2">
                <TextField
                  label="Debt"
                  labelClass="sr-only"
                  value={d.name}
                  onChange={(v) => onUpdate(i, { name: v })}
                  placeholder={`Debt ${i + 1}`}
                />
              </div>
              <button
                onClick={() => onRemove(i)}
                disabled={debts.length <= 1}
                aria-label={`Remove ${label}`}
                className="w-7 h-11 flex items-center justify-center text-gray-300 hover:text-red-600 disabled:opacity-0 xl:order-6"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
              {/* xl:contents lets these three join the row grid directly. */}
              <div className="col-span-3 grid grid-cols-2 sm:grid-cols-[minmax(0,1.12fr)_minmax(0,0.92fr)_minmax(0,0.96fr)] gap-2 xl:contents">
                <div className="col-span-2 sm:col-span-1 xl:order-3">
                  <NumField
                    label="Balance"
                    labelClass="xl:sr-only"
                    min={0}
                    value={d.balance}
                    onChange={(v) => onUpdate(i, { balance: v })}
                    placeholder={balancePlaceholder}
                    prefix="$"
                  />
                </div>
                <div className="xl:order-4">
                  <NumField
                    label="Rate"
                    labelClass="xl:sr-only"
                    min={0}
                    value={d.rate}
                    onChange={(v) => onUpdate(i, { rate: v })}
                    placeholder={ratePlaceholder}
                    suffix="%"
                    step={0.1}
                  />
                </div>
                <div className="xl:order-5">
                  <NumField
                    label={paymentLabel}
                    labelClass="xl:sr-only"
                    min={0}
                    value={d.pmt}
                    onChange={(v) => onUpdate(i, { pmt: v })}
                    placeholder={paymentPlaceholder}
                    prefix="$"
                  />
                </div>
              </div>
            </div>
            {note}
          </div>
        );
      })}

      {/* data-x-add-row lets a share link rebuild rows that do not exist yet.
          Without it a link carrying four debts, opened on a page that starts
          with one, restored the first and dropped the rest in silence. */}
      <button
        onClick={onAdd}
        data-x-add-row="Debt"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 min-h-11 px-1 -mx-1"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}
