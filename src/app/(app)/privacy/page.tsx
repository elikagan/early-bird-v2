import Link from "next/link";
import { Masthead } from "@/components/masthead";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Masthead />

      <main className="px-5 py-6 max-w-lg">
        <h2 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-4">
          Privacy Policy
        </h2>

        <div className="space-y-4 text-eb-body text-eb-text leading-relaxed">
          <p>
            <strong>Effective:</strong> April 2026
          </p>

          <p>
            Early Bird (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates earlybird.la. This policy
            describes how we collect, use, and protect your information.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            What We Collect
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Phone number (for login and notifications)</li>
            <li>Display name (shown to other users)</li>
            <li>Photos you upload (item listings)</li>
            <li>Browsing activity (favorites, views, inquiries)</li>
          </ul>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            How We Use It
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>To let you buy and sell at flea markets</li>
            <li>To send you SMS notifications you opted into</li>
            <li>To show dealers inquiry and engagement stats</li>
          </ul>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Communications &amp; SMS / Text Messaging
          </h3>
          <p>
            By providing your phone number, you agree to receive SMS
            notifications from Early Bird. Message frequency may vary.
            Standard message and data rates may apply. Reply STOP to opt
            out. Reply HELP for help.
          </p>
          <p className="pt-2">
            These messages include:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sign-in links (one-time, to log you in)</li>
            <li>Drop alerts (when a market&apos;s items go live)</li>
            <li>Price drop notifications (when watched items get cheaper)</li>
            <li>Inquiry updates (when a buyer or dealer contacts you)</li>
            <li>Account notifications (dealer approval, hold/sold receipts)</li>
          </ul>
          <p className="pt-2">
            You can manage which notifications you receive from your Account
            page at any time. You may also reply STOP to any message to
            unsubscribe from all SMS, or disable specific notifications in
            your Account settings.
          </p>
          <p className="pt-2">
            <strong>Help:</strong> Reply HELP to any message for assistance, or
            email{" "}
            <a href="mailto:hi@earlybird.la" className="font-bold text-eb-pop">
              hi@earlybird.la
            </a>.
          </p>
          <p className="pt-2">
            Carriers are not liable for delayed or undelivered messages.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Sharing &amp; Selling of Information
          </h3>
          <p>
            We will not share or sell your opt-in to an SMS campaign with any
            third party for purposes unrelated to providing you with the
            services of that campaign. We may share your Personal Data,
            including your SMS opt-in or consent status, with third parties
            that help us provide our messaging services, including but not
            limited to platform providers, phone companies, and any other
            vendors who assist us in the delivery of text messages.
          </p>
          <p className="pt-2">
            Beyond SMS service providers, we do not sell, rent, or share
            your personal information with third parties for promotional or
            marketing purposes. We do not process payments or store financial
            information. We do not track you across other sites.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Data Storage
          </h3>
          <p>
            Your data is stored securely on Supabase (hosted in the US). Photos
            are stored in Supabase Storage. We retain your data as long as your
            account is active.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Your Rights
          </h3>
          <p>
            You can update your profile information at any time from your account
            page. To delete your account and all associated data, contact us.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            Contact
          </h3>
          <p>
            Questions? Email{" "}
            <a href="mailto:hi@earlybird.la" className="font-bold text-eb-pop">
              hi@earlybird.la
            </a>.
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
