import Link from "next/link";
import { Masthead } from "@/components/masthead";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Masthead />

      <main className="px-5 py-6 max-w-lg">
        <h2 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-4">
          Terms of Use
        </h2>

        <div className="space-y-4 text-eb-body text-eb-text leading-relaxed">
          <p>
            <strong>Effective:</strong> April 2026
          </p>

          <p>
            By accessing or using Early Bird (&ldquo;the Service&rdquo; or
            &ldquo;the Platform&rdquo;), located at earlybird.la and operated
            by Eli Kagan (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;), you agree to be bound by these Terms
            of Use (&ldquo;Terms&rdquo;).
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            What Early Bird Is
          </h3>
          <p>
            Early Bird is a pre-market preview for LA flea markets. Dealers list
            items before market day. Buyers browse, favorite, and send inquiries.
            All transactions happen in person at the market.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Accounts
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>You need a valid US phone number to sign up</li>
            <li>One account per phone number</li>
            <li>You&apos;re responsible for activity on your account</li>
          </ul>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Listings
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Dealers are responsible for the accuracy of their listings</li>
            <li>Prices, availability, and item condition are the dealer&apos;s responsibility</li>
            <li>Early Bird does not guarantee any listing or transaction</li>
          </ul>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Payments
          </h3>
          <p>
            Early Bird does not process payments. All payments happen directly
            between buyer and dealer at the market. We are not responsible for
            any transaction disputes.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            SMS Notifications
          </h3>
          <p>
            By providing your phone number, you agree to receive SMS
            notifications from Early Bird. Message frequency may vary.
            Standard message and data rates may apply. Reply STOP to opt
            out. Reply HELP for help.
          </p>
          <p className="pt-2">
            These messages include sign-in links, drop alerts, price drop
            notifications, inquiry updates, and account notifications
            (dealer approval, hold/sold receipts). You can manage which
            notifications you receive from your Account page at any time.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Reply STOP to any message to opt out of all SMS</li>
            <li>Reply HELP for assistance</li>
            <li>
              Manage notification preferences from your Account page at any
              time
            </li>
            <li>Carriers are not liable for delayed or undelivered messages</li>
          </ul>
          <p className="pt-2">
            We will not share or sell your opt-in to an SMS campaign with any
            third party for purposes unrelated to providing you with the
            services of that campaign. We may share your Personal Data,
            including your SMS opt-in or consent status, with third parties
            that help us provide our messaging services, including but not
            limited to platform providers, phone companies, and any other
            vendors who assist us in the delivery of text messages.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Content
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>You own the photos and content you upload</li>
            <li>You grant us permission to display them on the platform</li>
            <li>Don&apos;t upload anything illegal, offensive, or misleading</li>
          </ul>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Limitation
          </h3>
          <p>
            Early Bird is provided as-is. We&apos;re a small team building
            something useful for the LA flea market community. We do our best
            but can&apos;t guarantee uptime or that the service will work
            perfectly at all times.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Changes
          </h3>
          <p>
            We may update these terms. Continued use after changes means you
            accept them.
          </p>
        </div>
      </main>

      <div className="px-5 py-4 mt-auto">
        <Link
          href="/account"
          className="text-eb-meta text-eb-pop font-bold"
        >
          &larr; Back to Account
        </Link>
      </div>
    </div>
  );
}
