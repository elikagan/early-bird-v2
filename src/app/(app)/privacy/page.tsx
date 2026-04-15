import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="eb-masthead">
        <Link href="/home">
          <h1>EARLY BIRD</h1>
        </Link>
      </header>

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
            SMS / Text Messaging
          </h3>
          <p>
            By providing your phone number at sign-up, you consent to receive
            SMS messages from Early Bird. These messages include:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sign-in links (one-time, to log you in)</li>
            <li>Drop alerts (when a market&apos;s items go live)</li>
            <li>Price drop notifications (when watched items get cheaper)</li>
            <li>Inquiry updates (when a buyer or dealer contacts you)</li>
            <li>Account notifications (dealer approval, hold/sold receipts)</li>
          </ul>
          <p className="pt-2">
            Message frequency varies based on your activity and notification
            preferences. You can manage which notifications you receive from
            your Account page.
          </p>
          <p className="pt-2">
            <strong>Opt out:</strong> Reply STOP to any message to unsubscribe
            from all SMS. You can also disable specific notifications in your
            Account settings.
          </p>
          <p className="pt-2">
            <strong>Help:</strong> Reply HELP to any message for assistance, or
            email{" "}
            <a href="mailto:hello@earlybird.la" className="font-bold text-eb-pop">
              hello@earlybird.la
            </a>.
          </p>
          <p className="pt-2">
            Standard message and data rates may apply. Carriers are not liable
            for delayed or undelivered messages.
          </p>

          <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider pt-2">
            What We Don&apos;t Do
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>We don&apos;t sell your data to anyone</li>
            <li>
              We don&apos;t share your mobile phone number or any mobile
              information with third parties for promotional or marketing
              purposes
            </li>
            <li>We don&apos;t process payments or store financial info</li>
            <li>We don&apos;t track you across other sites</li>
          </ul>

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
            <a href="mailto:hello@earlybird.la" className="font-bold text-eb-pop">
              hello@earlybird.la
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
