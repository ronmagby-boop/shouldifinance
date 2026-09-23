import type { Metadata } from "next";
import Link from "next/link";
import LegalShell, { Note, Section } from "../components/LegalShell";
import { CALCULATORS, SITE } from "../lib/calculators";
import { GOVERNING_STATE, LEGAL_CONTACT_EMAIL } from "../lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms governing use of ShouldIFinance — an educational site offering free financial calculators. No warranty of accuracy, no advice, no professional relationship.",
  alternates: { canonical: `${SITE}/terms` },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/terms`,
    title: "Terms of Use | ShouldIFinance",
    description: "The terms governing use of ShouldIFinance.",
  },
};

export default function TermsOfUse() {
  return (
    <LegalShell
      eyebrow="Terms"
      title="Terms of Use"
      intro="These terms govern your use of shouldifinance.com. They are short and they matter, particularly the parts about accuracy and liability — this is a free educational tool, not a professional service, and it is offered on that basis."
      current="/terms"
    >
      <Section id="acceptance" heading="1. Acceptance">
        <p>
          By accessing or using shouldifinance.com (the &ldquo;Site&rdquo;) you agree to these Terms
          of Use. If you do not agree with them, do not use the Site. Your continued use after these
          terms are revised constitutes acceptance of the revised terms.
        </p>
      </Section>

      <Section id="purpose" heading="2. What the Site is for">
        <p>
          The Site is an independent educational project. It publishes free calculators and written
          explanations covering mortgages, refinancing, auto loans, debt, investing, retirement and
          related subjects. Its purpose is to help you understand how these calculations work and
          what drives the answers.
        </p>
        <p>
          The Site is informational and educational only. It is not a financial, lending, brokerage,
          tax, legal, accounting or investment advisory service, and using it creates no professional
          relationship of any kind. The{" "}
          <Link href="/disclaimer" className="text-green-700 underline">
            Disclaimer
          </Link>{" "}
          sets this out in full and forms part of these terms.
        </p>
      </Section>

      <Section id="no-warranty" heading="3. No warranty as to accuracy or results">
        <p>
          The Site and everything on it are provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
          <strong>&ldquo;as available&rdquo;</strong>, without warranties of any kind, express or
          implied. To the fullest extent permitted by law, all warranties are disclaimed, including
          the implied warranties of merchantability, fitness for a particular purpose,
          non-infringement, accuracy and reliability.
        </p>
        <p>Specifically, no warranty is given that:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            any calculation, figure, projection, rate, tax treatment or result is accurate, complete,
            current or applicable to your circumstances;
          </li>
          <li>
            the assumptions built into a calculator match your situation, your lender&apos;s method,
            your state&apos;s rules or your tax position;
          </li>
          <li>
            published figures the Site relies on — tax brackets, contribution limits, credit
            eligibility, typical rates, depreciation data and similar — remain current after
            publication;
          </li>
          <li>the Site will be available without interruption, or free of errors or defects.</li>
        </ul>
        <p>
          The {CALCULATORS.length} calculators produce estimates from the assumptions you enter.
          Different assumptions produce different answers. Treat every output as a starting point for
          a conversation with a qualified professional, not as a conclusion.
        </p>
      </Section>

      <Section id="liability" heading="4. Limitation of liability">
        <p>
          To the fullest extent permitted by law, neither the Site&apos;s owner nor any contributor
          shall be liable for any direct, indirect, incidental, consequential, special, exemplary or
          punitive damages, or for any loss of profits, savings, data, goodwill or opportunity,
          arising out of or connected with your use of, or inability to use, the Site — including any
          decision made or action taken in reliance on anything published here, and any error,
          omission, inaccuracy or outdated figure.
        </p>
        <p>
          This applies regardless of the legal theory advanced and whether or not the possibility of
          such loss was known. Where liability cannot lawfully be excluded, it is limited to the
          greatest extent permitted, and in no event shall aggregate liability exceed one hundred US
          dollars (US$100) or the amount you paid to use the Site, whichever is greater. The Site is
          free, so that amount is ordinarily nil.
        </p>
        <Note>
          Some jurisdictions do not allow the exclusion of certain warranties or the limitation of
          certain damages, so parts of sections 3 and 4 may not apply to you. Nothing here is
          intended to exclude liability for fraud, for fraudulent misrepresentation, or for anything
          else that cannot lawfully be excluded.
        </Note>
      </Section>

      <Section id="ip" heading="5. Intellectual property">
        <p>
          The Site&apos;s content — the calculators and the code behind them, the written
          explanations, the layout, design, graphics, logo and name — is owned by the Site&apos;s
          owner or used with permission, and is protected by copyright, trademark and other laws.
        </p>
        <p>
          You may use the Site for your own personal, non-commercial purposes, and you may quote
          short passages with attribution and a link. You may not, without prior written permission:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>copy, republish, mirror or redistribute the content or the calculators;</li>
          <li>build a derivative or competing tool from the calculators or their logic;</li>
          <li>scrape, harvest or systematically extract content, whether by automated means or otherwise;</li>
          <li>use the content to train a machine-learning model;</li>
          <li>remove or obscure any copyright, trademark or attribution notice.</li>
        </ul>
        <p>
          The results a calculator produces from figures you enter are yours to use as you see fit.
        </p>
      </Section>

      <Section id="acceptable-use" heading="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>use the Site for any unlawful purpose, or in breach of any applicable law or regulation;</li>
          <li>
            represent the Site&apos;s output as professional advice, a quote, a rate lock, a
            pre-approval or a commitment to lend, whether to a consumer, a client or anyone else;
          </li>
          <li>interfere with the Site&apos;s operation, or attempt to gain unauthorised access to any part of it or its infrastructure;</li>
          <li>introduce malware, or place an unreasonable load on the Site through automated requests;</li>
          <li>misrepresent your relationship to the Site or its owner.</li>
        </ul>
      </Section>

      <Section id="third-party-links" heading="7. Links to third-party sites">
        <p>
          The Site links to external resources, including government and regulatory sources cited in
          the calculators. Those links are provided for reference and convenience. We do not control
          those sites, do not endorse their content, and are not responsible for their accuracy,
          availability, practices or policies. Following a link is at your own risk and subject to
          the other site&apos;s terms.
        </p>
      </Section>

      <Section id="availability" heading="8. Availability and changes to the Site">
        <p>
          The Site may be modified, suspended or discontinued, in whole or in part, at any time and
          without notice. Calculators may be added, altered, corrected or withdrawn. Figures and
          assumptions are updated from time to time, and a result obtained today may differ from one
          obtained tomorrow.
        </p>
      </Section>

      <Section id="changes" heading="9. Changes to these terms">
        <p>
          These terms may be revised at any time. The date at the top of this page shows when they
          were last changed. Revisions take effect when published, and your continued use of the Site
          after that constitutes acceptance. Check back periodically.
        </p>
      </Section>

      <Section id="governing-law" heading="10. Governing law">
        <p>
          These terms are governed by the laws of the State of {GOVERNING_STATE}, United States,
          without regard to its conflict-of-laws rules. You agree that the state and federal courts
          located in {GOVERNING_STATE} shall have exclusive jurisdiction over any dispute arising out
          of or relating to these terms or your use of the Site, and you consent to the personal
          jurisdiction of those courts.
        </p>
        <Note>
          <strong>Confirm before publication.</strong> {GOVERNING_STATE} is a placeholder pending
          confirmation. Governing law and venue should name the state the Site&apos;s owner actually
          operates from and is prepared to litigate in, and consumer-protection law in a visitor&apos;s
          home state may override a choice-of-law clause regardless of what this section says.
        </Note>
      </Section>

      <Section id="severability" heading="11. Severability and entire agreement">
        <p>
          If any provision of these terms is held unenforceable, that provision shall be limited or
          severed to the minimum extent necessary and the remaining provisions shall continue in full
          force. A failure to enforce any provision is not a waiver of it.
        </p>
        <p>
          These terms, together with the{" "}
          <Link href="/privacy" className="text-green-700 underline">
            Privacy Policy
          </Link>{" "}
          and the{" "}
          <Link href="/disclaimer" className="text-green-700 underline">
            Disclaimer
          </Link>
          , constitute the entire agreement between you and the Site&apos;s owner regarding your use
          of the Site.
        </p>
      </Section>

      <Section id="contact" heading="12. Contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-green-700 underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
