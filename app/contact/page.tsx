import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "../components/GuideShell";
import { CALCULATORS, SITE, OG_IMAGE } from "../lib/calculators";
import { LEGAL_CONTACT_EMAIL } from "../lib/legal";
import { FEEDBACK_ENABLED } from "../lib/feedback";
import FeedbackForm from "../components/FeedbackForm";
import { GUIDES } from "../lib/guides";

const DESCRIPTION =
  "How to reach ShouldIFinance — one email address, what it is good for, and what it is not.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/contact` },
  openGraph: {
    images: [OG_IMAGE],
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/contact`,
    title: "Contact | ShouldIFinance",
    description: DESCRIPTION,
  },
  twitter: {
    images: [OG_IMAGE.url],
    card: "summary_large_image",
    title: "Contact | ShouldIFinance",
    description: DESCRIPTION,
  },
};

/**
 * There is a form now, and it does not contradict anything the site claims.
 *
 * The old reasoning — "a form needs a server and this site is static" — was
 * true of a self-hosted form and stopped being the whole story once a form
 * service could receive the post instead. What has not changed is the part that
 * actually matters and that the old comment was careful to separate: the
 * no-transmission promise is about figures typed into a CALCULATOR. This form
 * touches none of them. It exists on this page only, it sends three fields, and
 * a visitor chooses to write every one of them.
 *
 * It renders only when NEXT_PUBLIC_WEB3FORMS_KEY is set. Without it the page
 * falls back to the email address and copy that says exactly that, because a
 * form that silently drops what you typed is worse than no form.
 */
export default function Contact() {
  const mailto = `mailto:${LEGAL_CONTACT_EMAIL}`;

  return (
    <GuideShell
      eyebrow="Contact"
      title="Get in touch"
      intro="One address, read by one person. It is the right place for a correction, a question about how something is calculated, or anything to do with your data."
      back={{ href: "/", label: "Back to home" }}
    >
      <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 mb-8">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Email</p>
        <a
          href={mailto}
          className="inline-flex items-center min-h-[44px] text-lg md:text-xl font-bold text-green-700 hover:underline break-all"
        >
          {LEGAL_CONTACT_EMAIL}
        </a>
        <p className="text-xs text-gray-500 leading-relaxed mt-1">
          {FEEDBACK_ENABLED
            ? "Or use the form below, which reaches the same inbox."
            : "There is no contact form here — see below."}
        </p>
      </div>

      {FEEDBACK_ENABLED && <FeedbackForm />}

      <div className="text-sm text-gray-700 leading-relaxed space-y-8">
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">What this address is good for</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="font-semibold text-gray-900">Corrections.</strong> If a calculator
              is wrong, or a guide cites a figure that has moved, this is the most useful thing you
              can send. Include the page and, if you can, the numbers you entered.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">Questions about method.</strong> How a
              result is worked out, what a calculator assumes, where a figure came from.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">Privacy requests.</strong> Anything
              under the{" "}
              <Link href="/privacy" className="text-green-700 underline">
                Privacy Policy
              </Link>
              , which is the same address for a reason.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">Suggestions.</strong> A calculator
              that should exist, or a guide that should cover something it does not.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">What it is not</h2>
          <p>
            This is an independent educational project, not a financial service. Mail to this
            address cannot be a substitute for advice from someone who knows your situation and is
            licensed to give it.
          </p>
          <p className="mt-3">
            So: no recommendations on a specific loan, no review of documents you have been sent, no
            opinion on whether to take a particular offer, and nothing that would amount to
            personalized financial, tax or legal advice. The{" "}
            <Link href="/disclaimer" className="text-green-700 underline">
              Disclaimer
            </Link>{" "}
            sets out the full position and it is worth reading before writing.
          </p>
          <p className="mt-3">
            Please do not send account numbers, Social Security numbers, statements, or anything
            else you would not want sitting in an ordinary mailbox. Nothing here needs them, and
            email is not a secure channel.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">
            {FEEDBACK_ENABLED ? "What the form does" : "Why there is no form"}
          </h2>
          {FEEDBACK_ENABLED ? (
            <>
              <p>
                The form posts to Web3Forms, which turns it into an email and sends it to the
                address above. It is the only thing on this Site that transmits anything you
                typed, it is on this page alone, and it sends three fields: your message, the
                reply address if you gave one, and whether you ticked the opt-in box. Nothing
                else — no page history, no identifier, nothing gathered in the background.
              </p>
              <p className="mt-3">
                Worth separating from that, because the two get confused: the figures you type
                into any of the {CALCULATORS.length} calculators are computed in your browser and
                are never transmitted or stored. That was true before this form existed and is
                untouched by it — there is no path from a calculator to this page, and the form
                has no field that could carry one. The{" "}
                <Link href="/privacy" className="text-green-700 underline">
                  Privacy Policy
                </Link>{" "}
                sets out both, separately and in that order.
              </p>
              <p className="mt-3">
                The email address is still there and still works. Your mail client keeps you a
                copy, which the form cannot, so for anything you want a record of it remains the
                better route.
              </p>
            </>
          ) : (
            <>
              <p>
                A contact form has to post somewhere, which means a server that receives and
                stores what you typed. This site is static and has no such server, so there is
                nothing for a form to submit to.
              </p>
              <p className="mt-3">
                Your mail client is a better place for the message anyway: you keep a copy, and
                you can see exactly what you sent and to whom.
              </p>
              <p className="mt-3">
                Worth separating from that, because the two get confused: the figures you type
                into any of the {CALCULATORS.length} calculators are computed in your browser and
                are never transmitted or stored. That holds whatever else the Site loads, and it
                is set out in the{" "}
                <Link href="/privacy" className="text-green-700 underline">
                  Privacy Policy
                </Link>
                . A contact form would not have changed it — an email is simply the honest way to
                reach one person.
              </p>
            </>
          )}
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">Before you write</h2>
          <p>
            Two things answer most questions faster than a reply would. Every calculator has a
            disclaimer at the bottom saying what it assumes and what it leaves out. And most now
            have a written guide —{" "}
            <Link href="/guides" className="text-green-700 underline">
              {GUIDES.length} of them
            </Link>{" "}
            — explaining the rules behind the arithmetic, with sources.
          </p>
          <p className="mt-3">
            This is a one-person project, so replies are not instant. Anything about privacy or a
            factual error gets looked at first.
          </p>
        </section>
      </div>

      <div className="border-t border-gray-100 mt-12 pt-4 flex flex-wrap gap-x-4">
        {[
          { href: "/privacy", label: "Privacy Policy" },
          { href: "/terms", label: "Terms of Use" },
          { href: "/disclaimer", label: "Disclaimer" },
        ].map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="inline-flex items-center min-h-[44px] py-2 text-xs font-semibold text-green-700 hover:underline"
          >
            {p.label} →
          </Link>
        ))}
      </div>
    </GuideShell>
  );
}
