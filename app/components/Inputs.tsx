"use client";
import type { FocusEvent, MouseEvent, ReactNode } from "react";

/** Inputs stay blank until the user types — never a sticky zero. */
export type Num = number | "";

export const n = (v: Num): number => (v === "" || Number.isNaN(Number(v)) ? 0 : Number(v));
export const has = (v: Num): boolean => v !== "" && !Number.isNaN(Number(v));

export const fmt = (v: number): string =>
  (v < 0 ? "-$" : "$") + Math.round(Math.abs(v)).toLocaleString();

/* Each entry is [roll-over point, divisor, suffix]. The roll-over points for
 * B and T sit half a display unit below the round number so a figure that
 * would print as 1000.00 of the smaller suffix moves up instead — $999,999,999
 * reads $1.00B, not $1000.00M. Entry into M stays at a clean $1,000,000, so
 * everything below a million prints exactly as it always has. */
const SCALES: ReadonlyArray<readonly [number, number, string]> = [
  [999_995_000_000, 1_000_000_000_000, "T"],
  [999_995_000, 1_000_000_000, "B"],
  [1_000_000, 1_000_000, "M"],
];

export const fmtK = (v: number): string => {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  for (const [floor, size, suffix] of SCALES) {
    if (a >= floor) return `${sign}$${(a / size).toFixed(2)}${suffix}`;
  }
  return `${sign}$${Math.round(a).toLocaleString()}`;
};

export const pct = (v: number, digits = 1): string => `${v.toFixed(digits)}%`;

export const months = (m: number): string => {
  const total = Math.max(0, Math.round(m));
  const y = Math.floor(total / 12);
  const mo = total % 12;
  if (y === 0) return `${mo} mo`;
  if (mo === 0) return `${y} yr${y === 1 ? "" : "s"}`;
  return `${y} yr${y === 1 ? "" : "s"} ${mo} mo`;
};

// text-gray-900 is explicit rather than inherited: the field background is a
// hardcoded white, so the text on it must not depend on whatever an ancestor
// happens to set. placeholder:text-gray-400 keeps a real entered value visibly
// darker than a hint, which is the whole point of the distinction.
//
// text-base below sm, text-sm above it. iOS Safari zooms the page when a
// control smaller than 16px takes focus, and the zoomed page can then be
// panned sideways — which reads as the whole site wobbling. 14px is the design
// size and it is kept everywhere the zoom cannot happen. Do not "simplify"
// this back to a bare text-sm, and do not fix it with maximum-scale on the
// viewport: that disables pinch-zoom for everyone.
const baseInput =
  "w-full py-3 border border-gray-200 rounded-xl text-base sm:text-sm text-gray-900 placeholder:text-gray-400 " +
  "focus:outline-none focus:border-green-400 bg-white";

/**
 * Highlights the whole value when a field is entered, so the first keystroke
 * replaces it instead of appending to it. Spread onto every numeric input on
 * the site.
 *
 * Two wrinkles are handled here:
 *  - On a pointer device the mouseup that follows the focusing click would
 *    collapse the selection to a caret, so that one mouseup is suppressed. A
 *    drag is left alone, since the user was deliberately picking a sub-range.
 *  - iOS Safari re-places the caret on the frame after focus, undoing the
 *    select() above, so the selection is re-asserted once on the next frame.
 *
 * Tapping an already-focused field never re-fires focus, so a second tap still
 * places a cursor for editing a single digit.
 */
let pendingSelect: HTMLInputElement | null = null;
let downX = 0;
let downY = 0;

export const selectOnFocus = {
  onMouseDown: (e: MouseEvent<HTMLInputElement>) => {
    downX = e.clientX;
    downY = e.clientY;
  },
  onFocus: (e: FocusEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    pendingSelect = el;
    el.select();
    requestAnimationFrame(() => {
      if (pendingSelect === el && el.ownerDocument.activeElement === el) el.select();
    });
  },
  onMouseUp: (e: MouseEvent<HTMLInputElement>) => {
    if (pendingSelect !== e.currentTarget) return;
    pendingSelect = null;
    if (Math.abs(e.clientX - downX) > 3 || Math.abs(e.clientY - downY) > 3) return;
    e.preventDefault();
  },
  onBlur: () => {
    pendingSelect = null;
  },
};

/** Parses a raw field value and holds it inside any bounds the field declares. */
const clamp = (raw: string, min?: number, max?: number): Num => {
  if (raw === "") return "";
  let v = +raw;
  if (Number.isNaN(v)) return "";
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
};

export function NumField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  step,
  min,
  max,
  hint,
  action,
  labelClass = "",
  disabled = false,
}: {
  label: string;
  value: Num;
  onChange: (v: Num) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  /**
   * Bounds, enforced on every keystroke rather than on blur. The native
   * min/max attributes only gate the spinners and form validation — a typed
   * value sails past them — so an out-of-range figure would reach the results
   * and be read before the field corrected itself.
   *
   * Opt-in. Plenty of fields take a genuinely negative value (a net worth, a
   * monthly surplus, an annual change) and must not be clamped.
   */
  min?: number;
  max?: number;
  hint?: ReactNode;
  action?: ReactNode;
  /** Extra classes on the label — e.g. "md:sr-only" for an inline table row
   *  whose column headings already name the field. */
  labelClass?: string;
  /** Dimmed and non-interactive — for a field the current mode does not use. */
  disabled?: boolean;
}) {
  const pad = `${prefix ? "pl-7" : "pl-3"} ${suffix ? (suffix.length > 2 ? "pr-12" : "pr-8") : "pr-3"}`;
  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <label className={`block text-xs font-medium text-gray-500 mb-1.5 ${labelClass}`}>
        {label}
        {action}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          /* Harvested by lib/export for copy, share links, mailto and the print
             sheet. Tagging the shared field once is what keeps the export
             feature out of all 43 calculators. See app/lib/export.ts. */
          data-x-field={label}
          data-x-kind="num"
          data-x-unit={prefix === "$" ? "$" : suffix || ""}
          onChange={(e) => onChange(clamp(e.target.value, min, max))}
          {...selectOnFocus}
          className={`${baseInput} ${pad} ${disabled ? "cursor-not-allowed bg-gray-50" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

/**
 * A free-text field, styled to match NumField so a form can mix the two.
 *
 * It exists because free text was the one input kind the export feature could
 * not see. Every other control on the site runs through this file and carries
 * data-x-field, so copy, share links, mailto and the print sheet pick it up for
 * free; a debt called "Chase card" or a lender called "Third Federal" was typed
 * into a raw <input> and vanished from all four. A shared text field means a
 * name now serializes exactly the way the number beside it does, and any future
 * text input gets that by using this rather than rolling its own.
 *
 * `labelClass="xl:sr-only"` is the inline-table case: the grid already has a
 * column heading, so the per-row label is for screen readers only.
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  labelClass = "",
  maxLength = 60,
  inputClass,
}: {
  /** Also the export key — see data-x-field below. */
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  labelClass?: string;
  /** A name, not an essay. Also keeps a share link from growing without limit. */
  maxLength?: number;
  /**
   * Replaces the default field styling.
   *
   * For the one place that needs a text field which does not look like a text
   * field — the lender headings on loan-estimate-comparison, which are
   * borderless and sit inline with a colour swatch. The point of the escape
   * hatch is that the styling can differ while the export plumbing cannot:
   * data-x-field is emitted here and nowhere else, so a bespoke look does not
   * mean a bespoke, and silently unserialized, input.
   */
  inputClass?: string;
}) {
  return (
    <div>
      <label className={`block text-xs font-medium text-gray-500 mb-1.5 ${labelClass}`}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        /* Harvested by lib/export, exactly as NumField is. */
        data-x-field={label}
        data-x-kind="text"
        onChange={(e) => onChange(e.target.value)}
        className={inputClass ?? `${baseInput} px-3`}
      />
      {hint && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

/** A date, styled to match NumField so a form can mix the two. */
export function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-x-field={label}
        data-x-kind="date"
        className={`${baseInput} px-3`}
      />
      {hint && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-x-field={label}
        data-x-kind="select"
        className={`${baseInput} px-3`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  children,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  /** Short name for exports. Falls back to the visible text, which is long. */
  label?: string;
}) {
  return (
    // min-h-11 keeps the whole label a >=44px touch target even when the text is
    // short enough to fit on one or two lines.
    <label className="flex items-start gap-2 cursor-pointer min-h-11">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-x-field={label}
        data-x-kind="bool"
        className="mt-0.5 w-4 h-4 accent-green-700 flex-shrink-0"
      />
      <span className="text-xs text-gray-500 leading-relaxed">{children}</span>
    </label>
  );
}

/** Bordered white card used for every input group and results panel. */
export function Card({
  title,
  badge,
  badgeTone = "gray",
  children,
  className = "",
}: {
  title?: string;
  badge?: string;
  badgeTone?: "gray" | "green" | "blue" | "amber";
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-500",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`border border-gray-200 rounded-2xl p-5 ${className}`}>
      {(title || badge) && (
        <div className="flex items-center justify-between gap-2 mb-5">
          {title && <p className="text-sm font-medium text-gray-900">{title}</p>}
          {badge && <span className={`text-xs rounded-full px-3 py-1 whitespace-nowrap ${tones[badgeTone]}`}>{badge}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Small label/value tile used inside results panels. */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "amber" | "red";
}) {
  const tones = {
    default: "text-gray-900",
    green: "text-green-700",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3" data-x-stat={label}>
      <p className="text-xs text-gray-400 mb-0.5 leading-snug">{label}</p>
      <p className={`text-sm font-medium ${tones[tone]}`} data-x-value>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}

/** The big headline number at the top of a results panel. */
export function Headline({
  label,
  value,
  unit,
  tone = "green",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "green" | "red" | "gray";
}) {
  const tones = { green: "text-green-700", red: "text-red-600", gray: "text-gray-900" };
  return (
    <>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p
        className={`text-3xl font-medium mb-5 tracking-tight break-words ${tones[tone]}`}
        data-x-headline={label}
      >
        {value}
        {unit && <span className="text-sm text-gray-400 font-normal">{unit}</span>}
      </p>
    </>
  );
}

/** Coloured takeaway box under the results. */
export function Takeaway({
  tone = "green",
  children,
}: {
  tone?: "green" | "amber" | "blue" | "red";
  children: ReactNode;
}) {
  const tones = {
    green: "bg-green-50 border-green-100 text-green-800",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    blue: "bg-blue-50 border-blue-100 text-blue-800",
    red: "bg-red-50 border-red-100 text-red-700",
  };
  return (
    <div className={`border rounded-xl p-3 text-xs leading-relaxed ${tones[tone]}`}>{children}</div>
  );
}

/** Placeholder shown before the user has entered enough to calculate. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-base mb-3">
        🧮
      </div>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs">{children}</p>
    </div>
  );
}
