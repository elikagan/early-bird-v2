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
            What We Don&apos;t Do
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>We don&apos;t sell your data to anyone</li>
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
            Questions? Reach out at earlybird.la.
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
