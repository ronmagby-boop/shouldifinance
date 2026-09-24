"use client";
import { useEffect, useRef, type ReactNode } from "react";

export const COLORS = {
  green: "#0F6E56",
  blue: "#378ADD",
  amber: "#D97706",
  gray: "#9CA3AF",
  purple: "#7C5CD3",
  teal: "#0D9488",
  red: "#DC2626",
};

const axisLabel = (v: number): string => {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}k`;
  return `${sign}$${Math.round(a)}`;
};

/**
 * Sets up a device-pixel-ratio aware canvas that redraws on resize.
 * The effect deliberately has no dependency array: it re-runs after every
 * render so the draw closure — and the ResizeObserver that calls it — always
 * sees the latest data.
 */
function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const render = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    return () => ro.disconnect();
  });

  return ref;
}

export type Series = {
  label: string;
  color: string;
  data: number[];
  dash?: number[];
  fill?: boolean;
};

/**
 * Multi-series line chart. `periodsPerYear` tells it how to label the x axis
 * (12 for monthly data, 1 for yearly).
 */
export function LineChart({
  series,
  periodsPerYear = 12,
  height = 200,
  ariaLabel,
  xUnit = "Yr",
  yFormat = axisLabel,
  baselineZero = true,
}: {
  series: Series[];
  periodsPerYear?: number;
  height?: number;
  ariaLabel: string;
  xUnit?: string;
  yFormat?: (v: number) => string;
  baselineZero?: boolean;
}) {
  const ref = useCanvas((ctx, w, h) => {
    const visible = series.filter((s) => s.data.length > 1);
    if (visible.length === 0) return;

    const maxLen = Math.max(...visible.map((s) => s.data.length));
    const flat = visible.flatMap((s) => s.data);
    let yMax = Math.max(...flat);
    let yMin = Math.min(...flat);
    if (baselineZero) {
      yMax = Math.max(yMax, 0);
      yMin = Math.min(yMin, 0);
    }
    if (yMax === yMin) yMax = yMin + 1;
    const span = yMax - yMin;
    const hadNegative = yMin < 0;
    yMax += span * 0.05;
    yMin -= span * 0.05;
    // Don't let padding push an all-positive chart below zero.
    if (!hadNegative && yMin < 0) yMin = 0;

    const pad = { top: 14, right: 12, bottom: 30, left: 54 };
    const cw = Math.max(1, w - pad.left - pad.right);
    const ch = Math.max(1, h - pad.top - pad.bottom);
    const xAt = (i: number) => pad.left + (i / Math.max(1, maxLen - 1)) * cw;
    const yAt = (v: number) => pad.top + ch - ((v - yMin) / (yMax - yMin)) * ch;

    // horizontal grid + y labels
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";
    for (let i = 0; i <= 4; i++) {
      const val = yMax - ((yMax - yMin) / 4) * i;
      const y = yAt(val);
      ctx.strokeStyle = "#f0f0f0";
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();
      ctx.fillStyle = "#aaa";
      ctx.textAlign = "right";
      ctx.fillText(yFormat(val), pad.left - 5, y + 3);
    }

    // zero line when the chart crosses it
    if (yMin < 0 && yMax > 0) {
      ctx.strokeStyle = "#d4d4d4";
      ctx.beginPath();
      ctx.moveTo(pad.left, yAt(0));
      ctx.lineTo(pad.left + cw, yAt(0));
      ctx.stroke();
    }

    // x labels
    const totalYears = Math.max(1, Math.round((maxLen - 1) / periodsPerYear));
    const step = Math.max(1, Math.ceil(totalYears / 6));
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "center";
    for (let y = 0; y <= totalYears; y += step) {
      const idx = Math.min(maxLen - 1, y * periodsPerYear);
      ctx.fillText(`${xUnit} ${y}`, xAt(idx), h - pad.bottom + 14);
    }

    // series
    for (const s of visible) {
      if (s.fill) {
        ctx.beginPath();
        s.data.forEach((v, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(v)) : ctx.lineTo(xAt(i), yAt(v))));
        ctx.lineTo(xAt(s.data.length - 1), yAt(Math.max(yMin, 0)));
        ctx.lineTo(xAt(0), yAt(Math.max(yMin, 0)));
        ctx.closePath();
        ctx.fillStyle = `${s.color}14`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.setLineDash(s.dash ?? []);
      s.data.forEach((v, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(v)) : ctx.lineTo(xAt(i), yAt(v))));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  return (
    <>
      <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
        <canvas ref={ref} style={{ width: "100%", height: "100%" }} role="img" aria-label={ariaLabel} />
      </div>
      <Legend
        items={series.map((s) => ({ label: s.label, color: s.color, dashed: Boolean(s.dash) }))}
      />
    </>
  );
}

export type Bar = {
  label: string;
  segments: { label: string; value: number; color: string }[];
};

/** Vertical bars, stacked when a bar has more than one segment. */
export function BarChart({
  bars,
  height = 220,
  ariaLabel,
  valueFormat = axisLabel,
}: {
  bars: Bar[];
  height?: number;
  ariaLabel: string;
  valueFormat?: (v: number) => string;
}) {
  const ref = useCanvas((ctx, w, h) => {
    if (bars.length === 0) return;
    const totals = bars.map((b) => b.segments.reduce((a, s) => a + Math.max(0, s.value), 0));
    const max = Math.max(...totals, 1);
    const pad = { top: 26, right: 8, bottom: 34, left: 8 };
    const ch = Math.max(1, h - pad.top - pad.bottom);
    // Cap the slot width so two or three bars sit together rather than
    // drifting to opposite edges of a wide card.
    const slot = Math.min(170, (w - pad.left - pad.right) / bars.length);
    const barW = Math.min(76, slot * 0.6);
    const startX = (w - slot * bars.length) / 2;

    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";

    bars.forEach((b, i) => {
      const cx = startX + slot * i + slot / 2;
      let y = pad.top + ch;
      b.segments.forEach((s) => {
        const sh = (Math.max(0, s.value) / max) * ch;
        if (sh <= 0) return;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.rect(cx - barW / 2, y - sh, barW, sh);
        ctx.fill();
        y -= sh;
      });
      // total above the bar
      ctx.fillStyle = "#374151";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(valueFormat(totals[i]), cx, pad.top + ch - (totals[i] / max) * ch - 8);
      // label below
      ctx.fillStyle = "#9ca3af";
      ctx.font = "10px sans-serif";
      const words = b.label.split(" ");
      const line1 = words.length > 2 ? words.slice(0, 2).join(" ") : b.label;
      const line2 = words.length > 2 ? words.slice(2).join(" ") : "";
      ctx.fillText(line1, cx, h - pad.bottom + 14);
      if (line2) ctx.fillText(line2, cx, h - pad.bottom + 26);
    });
  });

  // Union across every bar, not just the first: bars do not have to share a
  // segment list, and a segment that only appears on one of them still needs a
  // key. First appearance sets the order and the colour.
  const seen = new Set<string>();
  const legendItems: { label: string; color: string; dashed: boolean }[] = [];
  for (const bar of bars) {
    for (const seg of bar.segments) {
      if (seen.has(seg.label)) continue;
      seen.add(seg.label);
      legendItems.push({ label: seg.label, color: seg.color, dashed: false });
    }
  }
  const showLegend = bars.some((b) => b.segments.length > 1);

  return (
    <>
      <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
        <canvas ref={ref} style={{ width: "100%", height: "100%" }} role="img" aria-label={ariaLabel} />
      </div>
      {showLegend && legendItems.length > 0 && <Legend items={legendItems} />}
    </>
  );
}

/** Donut for composition — e.g. principal vs interest. */
export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  size = 180,
  ariaLabel,
}: {
  slices: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  ariaLabel: string;
}) {
  const ref = useCanvas((ctx, w, h) => {
    const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
    if (total <= 0) return;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 4;
    const inner = r * 0.62;
    let start = -Math.PI / 2;
    for (const s of slices) {
      const angle = (Math.max(0, s.value) / total) * Math.PI * 2;
      if (angle <= 0) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.arc(cx, cy, inner, start + angle, start, true);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      start += angle;
    }
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <canvas ref={ref} style={{ width: "100%", height: "100%" }} role="img" aria-label={ariaLabel} />
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && <span className="text-base font-medium text-gray-900">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-gray-400">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 w-full">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-gray-500">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="text-gray-900 font-medium">{axisLabel(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-xs text-gray-500">
          {i.dashed ? (
            <span className="w-5 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="w-5 h-0.5" style={{ background: i.color }} />
          )}
          {i.label}
        </div>
      ))}
    </div>
  );
}

/** Bordered card wrapper for a chart plus optional footnote. */
export function ChartCard({
  title,
  children,
  footnote,
}: {
  title: string;
  children: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    /* data-x-chart lets the print sheet find the FIRST chart on the page and
       snapshot its canvas. Canvas is a bitmap drawn on mount, so a print-only
       copy would be blank — lib/export grabs toDataURL() at beforeprint
       instead. Secondary charts are skipped by taking only the first. */
    <div className="border border-gray-200 rounded-2xl p-5 mb-4" data-x-chart={title}>
      <h2 className="text-sm font-medium text-gray-900 mb-4">{title}</h2>
      {children}
      {footnote && <div className="mt-4">{footnote}</div>}
    </div>
  );
}
