import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "../components/GuideShell";
import { CALCULATORS, SITE } from "../lib/calculators";
import { LEGAL_CONTACT_EMAIL } from "../lib/legal";
import { GUIDES } from "../lib/guides";

const DESCRIPTION =
  "How to reach ShouldIFinance — one email address, what it is good for, and what it is not.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/contact` },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/contact`,
    title: "Contact | ShouldIFinance",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | ShouldIFinance",
    description: DESCRIPTION,
  },
};

/**
 * Deliberately not a form.
 *
 * A form needs a server to post to and this site is static, so there is nothing
 * to receive one. That is the whole reason — note that it is NOT "a form would
 * break the no-transmission promise". The promise is about figures entered into
 * a calculator, which a contact form would never touch. Keep the two apart.
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
          There is no contact form here on purpose — see below.
        </p>
      </div>

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
          <h2 className="text-base font-bold text-gray-900 mb-2">Why there is no form</h2>
          <p>
            A contact form has to post somewhere, which means a server that receives and stores what
            you typed. This site is static and has no such server, so there is nothing for a form to
            submit to.
          </p>
          <p className="mt-3">
            Your mail client is a better place for the message anyway: you keep a copy, and you can
            see exactly what you sent and to whom.
          </p>
          <p className="mt-3">
            Worth separating from that, because the two get confused: the figures you type into any
            of the {CALCULATORS.length} calculators are computed in your browser and are never
            transmitted or stored. That holds whatever else the Site loads, and it is set out in the{" "}
            <Link href="/privacy" className="text-green-700 underline">
              Privacy Policy
            </Link>
            . A contact form would not have changed it — an email is simply the honest way to reach
            one person.
          </p>
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
