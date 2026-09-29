"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  FEEDBACK_ENDPOINT,
  OPT_IN_FIELD,
  OPT_IN_LABEL,
  WEB3FORMS_KEY,
} from "../lib/feedback";

type State = "idle" | "sending" | "sent" | "error";

/**
 * The contact form.
 *
 * Submits with fetch rather than a navigation, so the reader stays on the page
 * and gets a real answer — sent, or failed and why. That is the whole point
 * after the homepage box that accepted an address and said nothing: every
 * outcome here is visible, including the failures.
 *
 * The form still carries a real action and method. With JavaScript off, the
 * submit is a plain POST to the same endpoint rather than a button that does
 * nothing, which is the honest degradation. The email address above the form
 * remains the primary route either way.
 *
 * NOTHING HERE TOUCHES A CALCULATOR. This is the only place on the site that
 * transmits anything a visitor typed, it exists on one page, and it sends
 * exactly the three fields below — a message, an optional reply address, and
 * the opt-in state. Calculator figures are computed in the browser and have no
 * path to it; see lib/export.ts, which harvests only [data-x-field] elements
 * within a calculator, none of which exist on this page.
 */
export default function FeedbackForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [optIn, setOptIn] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    /* Set explicitly rather than relying on the checkbox: an unticked box sends
       no field at all, and a missing consent field reads the same as a bug. */
    data.set(OPT_IN_FIELD, optIn ? "Yes" : "No");

    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        body: data,
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setState("sent");
        form.reset();
        setOptIn(false);
      } else {
        setState("error");
        setError(json?.message || `The form service returned ${res.status}.`);
      }
    } catch {
      setState("error");
      setError("The message could not be sent — you may be offline.");
    }
  }

  if (state === "sent") {
    return (
      <div className="border border-green-200 bg-green-50 rounded-2xl p-5 mb-8">
        <p className="flex items-start gap-2 text-sm font-semibold text-green-900">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-700" aria-hidden="true" />
          Sent. Thank you.
        </p>
        <button
          onClick={() => setState("idle")}
          className="inline-flex items-center min-h-11 mt-1 pl-7 text-xs font-semibold text-green-800 hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      action={FEEDBACK_ENDPOINT}
      method="POST"
      className="border border-gray-200 rounded-2xl p-5 bg-white mb-8"
    >
      <input type="hidden" name="access_key" value={WEB3FORMS_KEY} />
      <input type="hidden" name="subject" value="ShouldIFinance — message from the contact form" />
      <input type="hidden" name="from_name" value="ShouldIFinance contact form" />
      {/* Honeypot. Hidden from people, filled in by bots, rejected by the
          endpoint. No captcha, so nothing third-party loads on the page. */}
      <input
        type="checkbox"
        name="botcheck"
        className="hidden"
        style={{ display: "none" }}
        tabIndex={-1}
        aria-hidden="true"
      />
      {/* Sends "No" when the box below is unticked and JavaScript is off. If
          both values reach the endpoint the first one wins, so a fallback
          submission can only ever under-record consent, never invent it. */}
      <input type="hidden" name={OPT_IN_FIELD} value="No" />

      <label htmlFor="feedback-message" className="block text-sm font-semibold text-gray-900 mb-1.5">
        Message
      </label>
      <textarea
        id="feedback-message"
        name="message"
        required
        rows={5}
        placeholder="A correction, a question about how something is calculated, or a calculator that should exist."
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400 bg-white resize-y"
      />

      <label htmlFor="feedback-email" className="block text-sm font-semibold text-gray-900 mt-4 mb-1.5">
        Your email <span className="font-normal text-gray-400">— optional</span>
      </label>
      <input
        id="feedback-email"
        name="email"
        type="email"
        placeholder="Only if you would like a reply"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400 bg-white"
      />
      <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
        Leave it blank and the message arrives with no way to answer it, which is fine if you do
        not want one.
      </p>

      <label className="flex items-start gap-2.5 mt-4 min-h-11 py-1 cursor-pointer">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-0.5 w-4 h-4 flex-shrink-0 accent-green-700"
        />
        <span className="text-sm text-gray-700 leading-relaxed">{OPT_IN_LABEL}</span>
      </label>
      <p className="text-xs text-gray-500 leading-relaxed mt-1 pl-7">
        Unticked by default, and there is no list yet — ticking it records that you would like to
        be on one if there ever is.
      </p>

      {state === "error" && (
        <p
          role="alert"
          className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mt-4 leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
          <span>
            {error} Nothing was sent — you can try again, or email the address above, which always
            works.
          </span>
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-5 inline-flex items-center justify-center bg-green-700 text-white text-sm font-bold rounded-full px-6 py-3 min-h-11 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
