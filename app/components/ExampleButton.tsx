"use client";
import { useState } from "react";
import { Sparkles, Eraser } from "lucide-react";
import { trackExampleCleared, trackExampleLoaded } from "../lib/analytics";

/**
 * The one control that fills a calculator with example numbers, and empties it
 * again. It is a toggle rather than a pair of buttons: two controls would add
 * permanent weight to all 42 pages for something most people press once, and a
 * single label can always say what pressing it will do next.
 *
 * Once the example is loaded the label stays "Clear all numbers" even if the
 * figures have since been edited. The alternative — flipping back to "See with
 * example numbers" as soon as anything changes — would put the destructive
 * action, overwriting what you just typed, behind the button you are most
 * likely to press by reflex. Clearing stays valid whatever you have edited.
 */
export default function ExampleButton({
  slug,
  onLoad,
  onClear,
}: {
  /** The calculator this sits on — the only thing the event records. */
  slug: string;
  onLoad: () => void;
  /** Resets every field to the page's initial state. */
  onClear?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const canClear = loaded && Boolean(onClear);

  return (
    <button
      onClick={() => {
        if (canClear) {
          onClear?.();
          setLoaded(false);
          trackExampleCleared(slug);
        } else {
          onLoad();
          setLoaded(true);
          trackExampleLoaded(slug);
        }
      }}
      className="inline-flex items-center gap-2 mb-4 text-sm font-semibold border border-green-200 bg-green-50 text-green-800 rounded-xl px-4 py-2.5 hover:bg-green-100 hover:border-green-300 transition-colors"
    >
      {canClear ? (
        <Eraser className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Sparkles className="w-4 h-4" aria-hidden="true" />
      )}
      {canClear ? "Clear all numbers" : "See with example numbers"}
    </button>
  );
}
