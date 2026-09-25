import type { Metadata } from "next";
import Link from "next/link";
import LegalShell, { Note, Section } from "../components/LegalShell";
import { SITE } from "../lib/calculators";
import { LEGAL_CONTACT_EMAIL, LEGAL_UPDATED_LABEL } from "../lib/legal";
import { ADS_LIVE } from "../lib/ads";

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
          The Site uses <strong>Vercel Web Analytics</strong>, provided by Vercel Inc. It is used to
          count how often each page is read and which calculators and guides are actually used, so
          that the tools worth maintaining can be told apart from the ones nobody opens.
        </p>
        <p>
          <strong>It does not use cookies.</strong> It sets no cookie, and stores nothing in your
          browser&apos;s local storage, session storage or IndexedDB. Vercel instead counts a repeat
          view by deriving a hash from the incoming request, and states that this identifier is
          discarded automatically after 24 hours. It does not follow you to other websites, and it
          does not build a profile.
        </p>
        <p>
          Vercel&apos;s documentation states that recorded data points are not tied to or associated
          with any individual or IP address. What may be stored with each data point is: the time,
          the page address and its route pattern, the referring site, filtered query parameters,
          approximate location no finer than city level, device type, operating system and browser
          with their versions, and the version of the measurement script. The full description is in{" "}
          <a
            href="https://vercel.com/docs/analytics/privacy-policy"
            className="text-green-700 underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Vercel&apos;s Web Analytics privacy documentation
          </a>
          .
        </p>
        <p>
          The measurement script, and the addresses it reports to, are served from this domain rather
          than from an outside host, so displaying a page does not make your browser call a separate
          analytics company. The data is nonetheless received and processed by Vercel as the
          Site&apos;s analytics provider.
        </p>
        <p>
          <strong>Custom events.</strong> Alongside page views, the Site records a short, fixed list
          of actions, so it is possible to tell which tools people use rather than merely open. Each
          event records the name of the action and the short name of the calculator or guide it
          happened on — nothing else. They are: loading example numbers into a calculator; clearing
          them again; following a calculator&apos;s link to its written guide; following a
          guide&apos;s link to a calculator, and whether that link was in the text or in the card at
          the end; opening one of the related calculators; using one of the four export buttons,
          recorded as which button was pressed; and clicking the mortgage-rate banner on the home
          page.
        </p>
        <p>
          <strong>Legal basis and retention.</strong> Where the UK GDPR or EU GDPR applies, the
          lawful basis is legitimate interests under Article 6(1)(f) — understanding which parts of
          an educational site are used, weighed against an impact on you that is slight, because the
          measurement is cookieless, carries no identifier that persists beyond 24 hours, and cannot
          be connected to you. Because nothing is stored on or read from your device, the separate
          consent requirement for storage and access under the ePrivacy rules (in the UK, regulation
          6 of PECR) is not engaged, which is why the Site shows no cookie banner for measurement.
          The 24-hour figure above is the lifespan of the visitor identifier, not of the aggregate
          counts, which Vercel retains for the period applicable to the Site&apos;s plan. You can
          object to this processing by writing to the address in section 14, or by using any tracking
          protection or content blocker — the Site does not attempt to detect or defeat them.
        </p>
        <p>
          The Site may also load components served by third parties — for example a market-data
          widget{ADS_LIVE ? ", and the advertising described in section 7" : ", or in future the advertising described in section 7"}. Where it does, your browser
          makes a request to that provider, and that provider can see the ordinary technical
          information any web request carries, including your IP address and the page you are on.
          Those providers act under their own privacy policies, not this one.
        </p>
        <Note tone="green">
          <strong>What this does not change.</strong> None of it has access to what you type into a
          calculator. Those figures are held in the page and used there; no script on the Site sends
          them anywhere, and there is nothing for a third party to receive. The events listed above
          carry a calculator or guide name and nothing more — the code that sends them accepts only
          names drawn from the Site&apos;s own list of calculators and guides, so a figure you typed
          cannot be placed in one even by mistake. Measurement tells us that a mortgage calculator
          was opened, and that its example numbers were loaded. It does not, and cannot, tell us your
          salary.
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
{ADS_LIVE ? (
        <>
        <p>
          Cookies, and the storage mechanisms that work like them, fall into three groups here, and
          the three behave differently enough that it is worth separating them.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Strictly necessary.</strong> The hosting provider may set operational cookies to
            deliver and secure the page — routing a request, managing caching. These serve the
            delivery of the page rather than any tracking purpose, and in most jurisdictions they do
            not require consent. Section 5 covers the hosting relationship.
          </li>
          <li>
            <strong>Measurement — sets nothing.</strong> This is the part most often assumed to work
            the other way, so to be explicit: the analytics described in section 4 writes{" "}
            <em>no cookie at all</em>, and nothing to local storage, session storage or IndexedDB.
            There is no measurement cookie on this Site for you to accept or refuse, and no part of
            the consent dialog described below concerns it. It counts a repeat view from a hash of
            the request instead, which is discarded after 24 hours.
          </li>
          <li>
            <strong>Advertising — cookies, and consent-gated.</strong> The advertising described in
            section 7 does set cookies and read them. It runs on the written guides and on the
            rates page. On those pages, and only those, a consent dialog appears before personalised
            advertising cookies are used, and your choice is recorded and respected. Section 7 lists
            the cookies, who sets them and how long they last.
          </li>
        </ul>
        <p>
          So whether you are asked anything at all depends on where you are. The home page, the
          calculators, the guide index and these legal pages carry no advertising, therefore set no
          advertising cookie, therefore ask you nothing — putting a consent dialog on them would be
          machinery for a purpose that does not exist there. Open a written guide, or the rates
          page, and the dialog appears, because that is where there is something to consent to.
        </p>
        <p>
          You can change or withdraw an advertising choice at any time from the privacy link the
          dialog leaves on the page, and your browser&apos;s own settings can block or clear any of
          these cookies independently of anything here. The Site does not attempt to detect, defeat
          or work around a blocker.
        </p>
        </>
      ) : (
        <>
        <p>
          Cookies, and the storage mechanisms that work like them, fall into three groups here.
          <strong> Strictly necessary</strong> ones may be set by the hosting provider to deliver and
          secure the page; these do not require consent in most jurisdictions.
          <strong> Measurement</strong> sets nothing at all — the analytics described in section 4 is
          cookieless and writes nothing to your browser&apos;s storage, so there is no measurement
          cookie for you to consent to and no banner asking you about one.
          <strong> Advertising</strong> cookies are covered in section 7 and are not in use today.
        </p>
        <p>
          That is the position today, and it is why this page carries no consent prompt: nothing
          currently in use requires your consent. If that changes — advertising being the likely
          reason — a consent mechanism will be added before the thing requiring it goes live, and
          this section will be rewritten to describe exactly what is set, by whom and for how long,
          with the date at the top of this page updated.
        </p>
        </>
      )}
      </Section>

      <Section
        id={ADS_LIVE ? "advertising" : "not-yet-in-use"}
        heading={ADS_LIVE ? "7. Advertising" : "7. Advertising and email — not in use today"}
      >
{ADS_LIVE ? (
        <>
        <p>
          The Site carries advertising supplied by <strong>Google AdSense</strong>, and it carries it
          on the written guides and on the rates page. There is no advertising on the home page, on
          any of the calculators, on the guide or calculator indexes, or on these legal pages. That is a
          deliberate limit, not an accident of layout: the calculators are the thing people come
          for, and the code that loads advertising is not requested at all on a page without an ad
          unit — so on those pages no Google advertising script runs and no advertising cookie is
          set.
        </p>
        <p>
          On a guide page, your browser requests the advertisement from Google and from its ad
          partners. Those requests carry the ordinary technical information any web request carries,
          including your IP address, your device and browser, and the page you are on. Google uses
          this to select and measure advertising, and to detect invalid traffic.
        </p>
        <p>
          <strong>Google is an independent controller of that data for its own purposes.</strong> It
          is not simply acting on instructions from this Site: Google determines how it uses the
          information it collects through advertising, under its own policies rather than this one.
          What it collects, why, and the controls you have over it are set out in{" "}
          <a
            href="https://policies.google.com/technologies/ads"
            className="text-green-700 underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google&apos;s advertising privacy documentation
          </a>
          , and ad personalisation can be turned off for your Google account at{" "}
          <a
            href="https://myadcenter.google.com/"
            className="text-green-700 underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            My Ad Center
          </a>
          .
        </p>
        <p>
          <strong>Cookies Google&apos;s documentation lists for advertising</strong>, with the
          durations it states:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>__gads</strong> — set on this Site&apos;s own domain; enables the display of
            advertising and measures interaction with it. Google states a lifetime of 13 months.
          </li>
          <li>
            <strong>IDE</strong> — set on doubleclick.net; used to show Google advertising on
            non-Google sites and to personalise it. Google states 13 months in the EEA, the UK and
            Switzerland, and 24 months elsewhere.
          </li>
          <li>
            <strong>test_cookie</strong> — set on doubleclick.net to check whether your browser
            accepts cookies at all. It is short-lived, a matter of minutes.
          </li>
          <li>
            <strong>DSID</strong> — used to identify a signed-in user across non-Google sites so
            that their Google ad-personalisation setting is respected. Google states 2 weeks.
          </li>
        </ul>
        <p>
          Google may set others, and the exact set depends on your location, your Google account
          settings and the choice you make in the consent dialog. The list Google maintains is
          authoritative and is linked above; this list is the advertising subset of it as at the
          date on this page.
        </p>
        <p>
          <strong>Consent.</strong> In the European Economic Area, the United Kingdom and
          Switzerland, Google requires publishers to use a certified consent management platform
          before personalised advertising may be served. This Site uses Google&apos;s own certified
          platform. The dialog appears on a guide page, before personalised advertising cookies are
          used, and records your choice. Declining does not remove the advertising — it means you
          are shown non-personalised or limited advertising instead, which is selected from the
          content of the page rather than from anything about you.
        </p>
        <p>
          <strong>Email.</strong> There is still no email collection of any kind on this Site, and no
          newsletter. If one is added it will be opt-in, every message will carry an unsubscribe
          link, and the address will not be sold or rented.
        </p>
        <Note tone="green">
          <strong>What advertising does not reach.</strong> It does not reach the figures you type
          into a calculator — there is no advertising on a calculator page at all, and even if there
          were, those figures are never transmitted anywhere by anything (section 2). Nothing you
          enter is used to select an advertisement, because nothing you enter leaves the page you
          entered it on.
        </Note>
        </>
      ) : (
        <>
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
        </>
      )}
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
          <strong>California residents (CCPA/CPRA).</strong> We do not sell personal information
          for money. {ADS_LIVE ? (
            <>
              The Site does carry advertising on its written guides (section 7), and the delivery of
              personalised advertising can amount to &ldquo;sharing&rdquo; personal information for
              cross-context behavioural advertising under California law. You may opt out of that
              sharing: use the advertising choice offered on any guide page, or a{" "}
              <a href="https://globalprivacycontrol.org/" className="text-green-700 underline" rel="noopener noreferrer" target="_blank">
                Global Privacy Control
              </a>{" "}
              signal sent by your browser, which is treated as a valid opt-out request. You will not
              be treated differently for exercising it — the calculators and the guides work
              identically either way.
            </>
          ) : (
            <>
              and we do not use it for cross-context behavioural advertising. Advertising is not in
              use today; if it is introduced — see section 7 — some ad arrangements count as
              &ldquo;sharing&rdquo; under California law, and this section will be rewritten with the
              disclosures and the opt-out mechanism that requires, before it goes live.
            </>
          )} The figures you
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
