import type { Metadata } from "next";
import Link from "next/link";
import LegalShell, { Note, Section } from "../components/LegalShell";
import { SITE } from "../lib/calculators";
import { LEGAL_CONTACT_EMAIL, LEGAL_UPDATED_LABEL } from "../lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How ShouldIFinance handles your information. The figures you enter into a calculator are processed in your browser and are never transmitted or stored.",
  alternates: { canonical: `${SITE}/privacy` },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/privacy`,
    title: "Privacy Policy | ShouldIFinance",
    description: "Calculator inputs are processed in your browser and never sent to us.",
  },
};

export default function PrivacyPolicy() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="The short version: the calculators run inside your browser, and the numbers you type into them never reach us or anyone else. The rest of this page explains that in detail, and sets out what the Site does and does not do with everything else."
      current="/privacy"
    >
      <Note tone="green">
        <strong>The one thing worth knowing.</strong> Every calculator on this site computes in your
        own browser. Your income, balances, debts and the rest are held in the page while you have it
        open and are discarded when you close the tab. They are not sent to a server, not written to
        your device, and not seen by us. You can confirm this yourself: open your browser&apos;s
        network tools, fill in a calculator, and watch that nothing you typed is sent anywhere.
      </Note>

      <Section id="who-we-are" heading="1. Who this policy covers">
        This policy applies to the website at shouldifinance.com (the &ldquo;Site&rdquo;), which is an
        independent educational project offering free financial calculators. It describes what
        information the Site handles and what it does not. It does not cover any other website,
        including sites you reach by following a link from here.
      </Section>

      <Section id="calculator-inputs" heading="2. Calculator inputs are never transmitted">
        <p>
          The calculators are client-side programs. When you type a purchase price, a salary, a loan
          balance or any other figure, that value is held in your browser&apos;s memory and used to
          compute the result shown on screen. It is not transmitted to us or to anyone else, not
          stored in a database, and not retained after you close or reload the page.
        </p>
        <p>
          This is the claim worth holding the Site to, and it does not depend on anything else on
          this page. Whatever else the Site may come to load — measurement, an embedded widget,
          advertising — the figures you type into a calculator are computed where you typed them.
          Nothing carries them off the page, because no such mechanism was built.
        </p>
        <p>
          There are also no accounts, no sign-up and no login, so there is nothing to attach a
          calculation to even if one were captured.
        </p>
      </Section>

      <Section id="what-we-dont-collect" heading="3. What the Site does not ask you for">
        <p>However the Site is built at any given time, it does not:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>ask you for your name, email address, phone number or postal address;</li>
          <li>ask for or process financial account numbers, Social Security numbers or credit information;</li>
          <li>require an account, a login or any registration to use a calculator;</li>
          <li>transmit, store or retain the figures you enter into a calculator;</li>
          <li>sell personal information, or build a profile of you from what you calculate.</li>
        </ul>
        <p>
          That list is about what the Site asks of <em>you</em>. It is separate from the ordinary
          technical processing that happens when any page loads, covered in sections 4 and 5, and
          from advertising, covered in section 7.
        </p>
      </Section>

      <Section id="measurement" heading="4. Measurement and third-party components">
        <p>
          Like most websites, this one may use privacy-respecting analytics to understand which
          pages are read and which calculators are used — aggregate counts of page views, referring
          sites, approximate region, device type and the like. The purpose is to know which tools are
          worth maintaining, not to identify you.
        </p>
        <p>
          The Site may also load components served by third parties — for example a market-data
          widget, or in future the advertising described in section 7. Where it does, your browser
          makes a request to that provider, and that provider can see the ordinary technical
          information any web request carries, including your IP address and the page you are on.
          Those providers act under their own privacy policies, not this one.
        </p>
        <Note tone="green">
          <strong>What this does not change.</strong> None of it has access to what you type into a
          calculator. Those figures are held in the page and used there; no script on the Site sends
          them anywhere, and there is nothing for a third party to receive. Measurement tells us that
          a mortgage calculator was opened. It does not, and cannot, tell us your salary.
        </Note>
        <Note>
          <strong>To be completed before publication.</strong> Once analytics is live, name the
          provider here, link its privacy documentation, state what it collects and whether it uses
          cookies, and say whether data leaves the visitor&apos;s region. The same applies to any
          embedded third-party component. Do not leave this section describing the general case once
          the specific case is known.
        </Note>
      </Section>

      <Section id="hosting-and-logs" heading="5. Hosting and server logs">
        <p>
          The Site is delivered by a third-party hosting provider. Like essentially all web hosts,
          that provider processes the technical information your browser sends in order to deliver a
          page: your IP address, the page requested, the date and time, your browser and operating
          system, and the referring page if there is one. This is ordinary server-log data, it is
          generated by the act of visiting any website, and it is handled by the hosting provider
          under its own terms rather than by us.
        </p>
        <p>
          We do not use that log data to identify visitors, we do not combine it with anything else,
          and we do not draw on it for marketing. The hosting provider may also set strictly
          necessary operational cookies — for example to route requests or manage caching — which
          serve the delivery of the page rather than any tracking purpose.
        </p>
        <Note>
          <strong>To be completed before publication.</strong> The hosting provider must be named
          here, with a link to its privacy documentation, and its actual log-retention period stated.
          At the time of drafting, the domain was still served by a previous host that set its own
          cookies. Confirm which platform is live and restate this section to match it.
        </Note>
      </Section>

      <Section id="cookies" heading="6. Cookies and similar technologies">
        <p>
          Cookies, and the storage mechanisms that work like them, fall into three groups here.
          <strong> Strictly necessary</strong> ones may be set by the hosting provider to deliver and
          secure the page; these do not require consent in most jurisdictions.
          <strong> Measurement</strong> may be used as described in section 4, depending on the tool
          in use — some analytics work without cookies at all.
          <strong> Advertising</strong> cookies are covered in section 7 and are not in use today.
        </p>
        <p>
          Where the law requires consent for any of these, a consent mechanism will be added before
          the thing requiring it goes live, and this section will be rewritten to describe exactly
          what is set, by whom and for how long — with the date at the top of this page updated.
        </p>
      </Section>

      <Section id="not-yet-in-use" heading="7. Advertising and email — not in use today">
        <Note>
          <strong>Nothing in this section is active as of {LEGAL_UPDATED_LABEL}.</strong> There is no
          advertising on this Site and no email collection of any kind on that date. This section
          exists so you can see what would change, not to describe something already happening — and
          the date matters, because it is the thing that tells you whether this paragraph can still
          be relied on.
        </Note>
        <p>
          The Site is expected to carry advertising in future, and may offer an email newsletter.
          Rather than publish terms for something not yet built — which would describe the Site
          inaccurately — this policy will be rewritten and re-dated <em>before</em> either goes live.
          When that happens, expect the following to be addressed:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Advertising.</strong> Ad networks typically set their own cookies or similar
            identifiers and may collect IP address, device and browsing data for ad selection and
            measurement. The networks used would be named, their privacy policies linked, and a
            consent mechanism added where the law requires one. Under CCPA, some ad arrangements
            count as &ldquo;sharing&rdquo; personal information for cross-context behavioural
            advertising, which would require a clear opt-out.
          </li>
          <li>
            <strong>Email.</strong> A newsletter would collect the address you give and nothing you
            do not volunteer. It would be opt-in, every message would carry an unsubscribe link, and
            the address would not be sold or rented.
          </li>
        </ul>
        <p>
          Until this section says otherwise, neither applies. If you are reading this and the Site is
          showing you adverts, this policy is out of date and should not be relied on — please tell
          us at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-green-700 underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section id="third-parties" heading="8. Links to other sites">
        <p>
          The Site links to external resources — government and regulatory sources such as the IRS,
          and social media profiles in the footer. Following a link takes you to a site we do not
          control, with its own privacy practices. This policy stops at our boundary. We are not
          responsible for what other operators do with your information, and you should read their
          policies before relying on them.
        </p>
      </Section>

      <Section id="retention" heading="9. Data retention">
        <p>
          We operate no database of visitors and keep no calculator history — there is no archive of
          your calculations to request deletion from, because the figures never reach us. Hosting
          logs are retained by the hosting provider for its own operational period, described in
          section 5, and any measurement data is retained by that provider under the terms named in
          section 4.
        </p>
      </Section>

      <Section id="security" heading="10. Security">
        <p>
          The Site is served over HTTPS. Because the figures you enter never leave your browser, the
          most sensitive information involved in using this Site is never in transit and never at
          rest on our side — which is a stronger protection than any security measure that could be
          applied to it once stored. No method of transmission over the internet is completely secure, and no
          assurance of absolute security is given.
        </p>
      </Section>

      <Section id="your-rights" heading="11. Your rights (CCPA and GDPR)">
        <p>
          Depending on where you live, you may have rights over personal information a business holds
          about you — including the right to know what is held, to obtain a copy, to correct it, to
          have it deleted, to opt out of its sale or sharing, and not to be discriminated against for
          exercising any of these.
        </p>
        <p>
          <strong>California residents (CCPA/CPRA).</strong> We do not sell personal information,
          and we do not use it for cross-context behavioural advertising. Advertising is not in use
          today; if it is introduced — see section 7 — some ad arrangements count as
          &ldquo;sharing&rdquo; under California law, and this section will be rewritten with the
          disclosures and the opt-out mechanism that requires, before it goes live. The figures you
          enter into a calculator are not personal information we hold, under this or any other law,
          because they are never transmitted to us.
        </p>
        <p>
          <strong>UK and EU residents (UK GDPR / EU GDPR).</strong> Server-log processing by the
          hosting provider, and any measurement described in section 4, are carried out on the basis
          of legitimate interests in delivering, securing and understanding use of the Site — except
          where consent is required, in which case it will be asked for. We hold no account data
          about you, and the figures you enter into a calculator are not processed by us at all. You retain your rights of access, rectification, erasure, restriction, portability
          and objection, and the right to complain to your supervisory authority — in the UK, the
          Information Commissioner&apos;s Office.
        </p>
        <p>
          To exercise any right, or to ask what is held about you, write to{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-green-700 underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . We will respond within the period the applicable law requires. In most cases the honest
          answer will be that we hold nothing.
        </p>
      </Section>

      <Section id="children" heading="12. Children&rsquo;s privacy">
        <p>
          The Site is intended for adults making financial decisions. It is not directed to children
          under 13, and we do not knowingly collect personal information from children under 13 —
          indeed we do not knowingly collect personal information from anyone, of any age, as
          described above. If you believe a child has provided personal information to us, contact{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-green-700 underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          and we will take appropriate steps.
        </p>
      </Section>

      <Section id="changes" heading="13. Changes to this policy">
        <p>
          This policy may be revised as the Site changes. The date at the top of the page shows when
          it was last altered. Material changes — particularly the introduction of advertising or
          email collection — will be reflected here before they take effect, not after.
        </p>
      </Section>

      <Section id="contact" heading="14. Contact">
        <p>
          Questions about this policy, or about privacy on this Site, can be sent to{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-green-700 underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          See also the{" "}
          <Link href="/terms" className="text-green-700 underline">
            Terms of Use
          </Link>{" "}
          and the{" "}
          <Link href="/disclaimer" className="text-green-700 underline">
            Disclaimer
          </Link>
          , which explain the limits of what this Site is and what it can be relied on for.
        </p>
      </Section>
    </LegalShell>
  );
}
