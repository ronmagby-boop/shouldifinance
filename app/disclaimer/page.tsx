import type { Metadata } from "next";
import Link from "next/link";
import LegalShell, { Note, Section } from "../components/LegalShell";
import { CALCULATORS, SITE } from "../lib/calculators";
import { TAX_YEAR } from "../lib/tax";
import { LEGAL_CONTACT_EMAIL } from "../lib/legal";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "ShouldIFinance is an independent educational project. It is not a lender, broker or financial advisor, and nothing on it is personalized advice or a commitment to lend.",
  alternates: { canonical: `${SITE}/disclaimer` },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/disclaimer`,
    title: "Disclaimer | ShouldIFinance",
    description: "An independent educational project. Not a lender, broker or financial advisor.",
  },
};

export default function Disclaimer() {
  return (
    <LegalShell
      eyebrow="Disclaimer"
      title="Disclaimer"
      intro="This page explains what ShouldIFinance is, what it is not, and what its numbers can and cannot be used for. It is the most important page on the site to read before acting on anything you find here."
      current="/disclaimer"
    >
      <Note>
        <strong>In one paragraph.</strong> ShouldIFinance is an independent educational website. It is
        not a lender, a mortgage broker, a financial advisor, an accountant or a law firm. Nothing on
        it is personalized advice. Using it creates no client or advisory relationship of any kind.
        Every figure it produces is an estimate built from assumptions you typed in — not an offer, a
        quote, a pre-approval, a rate lock or a commitment to lend. Before you act, talk to a licensed
        professional who can look at your actual situation.
      </Note>

      <Section id="independent" heading="1. An independent educational project">
        <p>
          ShouldIFinance.com is a personal, independent educational project. It exists to explain how
          common financial calculations work — what drives a mortgage payment, why a longer loan term
          lowers the payment and raises the cost, how depreciation compares with interest, what a
          money factor means.
        </p>
        <p>
          <strong>The Site is not:</strong> a lender, a creditor, a mortgage broker, a loan
          originator acting in that capacity, a real-estate brokerage, a bank, a credit union, a
          registered investment adviser, a broker-dealer, an insurance producer, a certified public
          accountant, an enrolled agent, a tax preparer or a law firm. It does not originate, arrange,
          underwrite, fund, service or refer loans. It does not manage money, recommend securities,
          sell insurance, prepare returns or practise law.
        </p>
        <p>
          The Site is not affiliated with, sponsored by, endorsed by or operated on behalf of any
          lender, bank, brokerage, insurer or financial institution. No content here should be read as
          representing the views, products, rates or programs of any such institution.
        </p>
      </Section>

      <Section id="licensing" heading="2. About the Site&rsquo;s owner">
        <p>
          The Site&apos;s owner works in the mortgage industry and holds a professional license in
          that field. That fact is disclosed here for transparency, and it changes nothing about how
          this Site should be treated.
        </p>
        <p>
          This Site is a separate personal project. It is operated independently, in the owner&apos;s
          own capacity, and it is <strong>not</strong> operated by, for or on behalf of the
          owner&apos;s employer or any licensed entity. Nothing published here is a communication
          made in a licensed capacity, and reading it does not make you a customer, client, applicant
          or prospect of the owner or of any company the owner is associated with.
        </p>
        {/* Deliberately NOT behind the ADS_LIVE flag.

            Phrased as "where the guides carry advertising", which is true in
            both states: vacuously true while advertising is switched off, and
            directly true once it is on. A flagged version would have to assert
            that the guides carry advertising, which is false today — and this
            is the page a reader reaches for when they want to know what the
            Site is and is not, so it should not be the page whose answer
            depends on a build flag.

            This replaced "It does not advertise, solicit or offer any lending
            product or service, from any institution." That sentence could not
            survive AdSense: the owner is licensed in the mortgage industry, and
            a lender's advertisement served beside a mortgage guide would make
            it read as false regardless of who placed it. Saying plainly that
            the placement is automatic and unendorsed is both accurate and a
            better answer to the question the old sentence was trying to
            settle. */}
        <p>
          Where the written guides carry advertising, it is served automatically by Google: neither
          the Site nor its owner selects, reviews or endorses the advertisements that appear, and
          none is a communication from the owner or from any institution the owner is associated
          with. An advertisement is not a recommendation, and no advertiser has any influence over
          the calculators, the guides, or the conclusions either of them reaches.
        </p>
        <p>
          If you are looking for a loan, approach a licensed lender or broker directly and rely on the
          disclosures they are legally required to give you — a Loan Estimate, a Closing Disclosure,
          and the terms of a written commitment. Those documents govern; this Site does not.
        </p>
      </Section>

      <Section id="not-advice" heading="3. Nothing here is personalized advice">
        <p>
          The content and calculators on this Site are general information published to the world at
          large. They are not financial advice, investment advice, tax advice, legal advice,
          accounting advice, insurance advice or a recommendation to take or refrain from any course
          of action.
        </p>
        <p>
          The Site does not know your income, credit history, assets, debts, employment, tax position,
          family circumstances, risk tolerance, time horizon or goals — beyond whatever you type into
          a box, which it neither verifies nor retains. No output is tailored to you, because nothing
          here can see you. Two people entering identical numbers receive identical results; that is
          the nature of a calculator and the opposite of advice.
        </p>
      </Section>

      <Section id="no-relationship" heading="4. No client, advisory or fiduciary relationship">
        <p>
          Using this Site, reading it, relying on it or contacting its owner about it does{" "}
          <strong>not</strong> create a client relationship, an advisory relationship, an agency
          relationship, an engagement or a fiduciary duty of any kind. No duty of care, loyalty,
          suitability or best-interest is owed to you in respect of anything on this Site.
        </p>
        <p>
          Correspondence sent through this Site is not confidential and is not privileged. Do not send
          account numbers, Social Security numbers, credit details or other sensitive personal
          information.
        </p>
      </Section>

      <Section id="estimates" heading="5. Results are estimates, not offers">
        <p>
          Every number this Site produces is an estimate generated from assumptions you supplied.
          Change an assumption and the answer changes. That is the point of the tools, and it is also
          the limit of them.
        </p>
        <p>
          <strong>No result on this Site is:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>an offer or solicitation to lend, or an offer of credit on any terms;</li>
          <li>a quote, a rate quote or a rate lock;</li>
          <li>a pre-qualification, a pre-approval, a conditional approval or an underwriting decision;</li>
          <li>a commitment to lend, or evidence that credit is available to you at any price;</li>
          <li>an appraisal, a valuation, or an opinion of value for any property or vehicle;</li>
          <li>a tax return, a tax opinion, or a determination of what you owe;</li>
          <li>a recommendation to buy, sell or hold any security, insurance product or asset.</li>
        </ul>
        <p>
          What you can actually borrow, at what rate, on what terms, and what you will actually owe in
          tax, is determined by a lender&apos;s underwriting and by the tax authorities — using
          verified information, their own methods and their own overlays. Those figures routinely
          differ from anything estimated here.
        </p>
      </Section>

      <Section id="stale" heading="6. Figures go stale">
        <p>
          Interest rates change daily. Tax law, contribution limits, credit eligibility, program
          rules, lender overlays, insurance pricing and market values all change, sometimes with
          little notice and sometimes retroactively.
        </p>
        <p>
          Several calculators on this Site cite specific published figures for a specific period —
          federal tax brackets and standard deductions for the {TAX_YEAR} tax year, retirement
          contribution limits, long-term capital gains thresholds, statutory surtax thresholds,
          federal clean-vehicle credit rules and their expiry, long-run market return data, and
          industry depreciation and fund-expense studies. Each is sourced in the page that uses it.
          Each was accurate as published on the date shown at the top of this page.{" "}
          <strong>None of them stays accurate indefinitely.</strong>
        </p>
        <p>
          A calculator that was right last year may be quietly wrong this year. Check the underlying
          figure against its original source before relying on it, and treat the tax year named on a
          page as a hard boundary on that page&apos;s usefulness.
        </p>
        <p>
          The {CALCULATORS.length} calculators also embed modelling assumptions — constant rates of
          return, straight-line depreciation, steady inflation, no job loss, no market crash, no
          change in circumstances. Real life includes all of those. Projections are a central estimate
          under assumptions that will not hold exactly, not a forecast of what will happen.
        </p>
      </Section>

      <Section id="market-data" heading="7. Mortgage rate data">
        <p>
          The mortgage rate shown on the home page is the 30-year fixed-rate average from{" "}
          <strong>Freddie Mac&apos;s Primary Mortgage Market Survey</strong>, reproduced unaltered
          and labelled with the week the survey covers. The survey is published weekly, on
          Thursdays. Freddie Mac provides it &ldquo;as is&rdquo;, without warranty as to accuracy,
          and disclaims liability for any use made of it.
        </p>
        <p>
          It is a <strong>national average of conventional, conforming, single-family purchase
          originations</strong>. It is not a quote, not an offer, and not the rate you will be
          given. Your own rate depends on your credit, your down payment, the loan type, the
          property, the day, and the lender. Averages routinely differ from individual quotes by
          more than a percentage point in both directions.
        </p>
        <p>
          The figure is retrieved when the Site is built, not when you visit, so your browser does
          not contact Freddie Mac to display it. If the retrieval fails, or the
          most recent survey becomes more than ten days old, the rate is removed from the Site
          rather than shown as current.
        </p>
      </Section>

      <Section id="errors" heading="8. Errors">
        <p>
          The calculators are written and checked with care, but they may contain errors in formula,
          assumption, data or presentation. No representation is made that any calculation is free of
          defects or suitable for any purpose. If you find something that looks wrong, please report
          it to{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-green-700 underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          — corrections are welcome and are made as promptly as they can be.
        </p>
      </Section>

      <Section id="consult" heading="9. Consult a licensed professional">
        <p>
          Before acting on anything you read or calculate here, consult a professional licensed and
          qualified to advise you in the relevant field and jurisdiction — a mortgage loan originator
          or lender for borrowing, a CPA or enrolled agent for tax, an attorney for legal questions,
          a registered investment adviser for investment decisions, and a licensed producer for
          insurance. Bring your own numbers and your own documents. A professional who can see your
          whole position will reach a better answer than any calculator can.
        </p>
        <p>
          Decisions you make are your own, and you are responsible for them. See the{" "}
          <Link href="/terms" className="text-green-700 underline">
            Terms of Use
          </Link>{" "}
          for the warranty disclaimers and limitation of liability that apply to this Site.
        </p>
      </Section>

      <Note tone="green">
        <strong>For review before publication.</strong> This draft addresses the separation between a
        personal educational site and the owner&apos;s licensed occupation, but that separation has
        regulatory dimensions a lawyer should assess: whether an employer&apos;s outside-activity or
        social-media policy requires pre-approval or an NMLS identifier on this Site; whether any page
        could be characterised as an advertisement for credit under TILA/Regulation Z, which would
        trigger disclosure requirements; whether state mortgage-licensing or advertising rules apply;
        and whether the tax and investment content sits comfortably outside the definitions of tax
        advice and investment advice in the relevant jurisdictions. None of that is settled by
        wording alone.
      </Note>
    </LegalShell>
  );
}
