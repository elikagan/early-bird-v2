/**
 * TEMPORARY preview — every bottom drawer in the app, rendered inline
 * (not as a real overlay) so they can all be scanned at once. Delete
 * once the audit is done.
 */

export default function DrawersPreview() {
  const buyerFirst = "Jamie";
  const dealerBusiness = "Object Lesson";
  const itemTitle = "Mid-century walnut chair";

  return (
    <div className="min-h-screen bg-eb-bg pb-24">
      {/* Preview header */}
      <header className="px-5 py-5 border-b-2 border-eb-black">
        <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-pop">
          Preview — drawer audit
        </div>
        <h1 className="text-eb-title font-bold text-eb-black mt-1.5">
          Every bottom drawer in the app
        </h1>
        <p className="text-eb-caption text-eb-muted mt-2 leading-relaxed">
          Six drawers total. Each one rendered below with a caption
          explaining what it is, who triggers it, and when it appears.
          Rendered inline (not as a real overlay) so they can be scanned
          all at once.
        </p>
      </header>

      {/* ═══════════ 1. SIGN IN DRAWER ═══════════ */}
      <DrawerCard
        num="01"
        title="Sign in"
        who="Logged-out user"
        trigger="Masthead 'Sign in →' link, or any action that requires auth (hearting an item, inquiring, applying as dealer, etc.)"
        where="Used on /, /item/[id], /d/[id], /watching, /buy via <SignInLink /> and <SignupDrawer />"
        file="src/components/signup-drawer.tsx"
      >
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-5" />
        <h3 className="text-eb-body font-bold uppercase tracking-widest text-eb-black mb-2">
          Sign in
        </h3>
        <p className="text-eb-caption text-eb-muted mb-4 leading-relaxed">
          Enter your phone number to get a sign-in link. No passwords, no
          codes.
        </p>
        <input
          type="tel"
          className="eb-input"
          placeholder="(213) 555-0134"
          disabled
          aria-label="Phone number"
        />
        <label className="flex items-center gap-2.5 mt-2">
          <input type="checkbox" className="shrink-0 accent-eb-black" />
          <span className="text-eb-meta text-eb-muted">
            Text me when the drop goes live
          </span>
        </label>
        <button className="eb-btn mt-5">SIGN IN</button>
        <p className="text-eb-micro font-readable text-eb-muted mt-1.5 text-center leading-relaxed">
          Msg &amp; data rates may apply. Frequency varies. Reply STOP to
          opt out, HELP for help. We will not share mobile info with third
          parties for marketing.
        </p>
      </DrawerCard>

      {/* ═══════════ 2. APPLY TO SELL DRAWER ═══════════ */}
      <DrawerCard
        num="02"
        title="Apply to sell"
        who="Logged-in buyer"
        trigger="Account page → 'Apply to be a dealer' button"
        where="src/components/dealer-apply-drawer.tsx; opened from /account"
        file="src/components/dealer-apply-drawer.tsx"
      >
        <div className="w-10 h-1 rounded-full bg-eb-border mx-auto mb-4" />
        <h2 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-1">
          Apply to Sell
        </h2>
        <p className="text-eb-meta text-eb-muted leading-relaxed mb-5">
          Tell us about yourself. We&apos;ll review your application and
          text you when you&apos;re approved.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
              Your Name
            </label>
            <input type="text" className="eb-input" placeholder="Jane Doe" disabled />
          </div>
          <div>
            <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
              Business Name
            </label>
            <input type="text" className="eb-input" placeholder="Vintage Finds LA" disabled />
          </div>
          <div>
            <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
              Instagram
            </label>
            <input type="text" className="eb-input" placeholder="@vintage_finds_la" disabled />
          </div>
          <p className="text-eb-micro text-eb-muted">
            We review your Instagram to verify your business. We&apos;ll
            text you at (213) 555-0134 when approved.
          </p>
          <div className="flex gap-2">
            <button className="eb-btn flex-1">Submit Application</button>
            <button className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider">
              Cancel
            </button>
          </div>
        </div>
      </DrawerCard>

      {/* ═══════════ 3. INQUIRY ("I'M INTERESTED") DRAWER ═══════════ */}
      <DrawerCard
        num="03"
        title="I'm Interested"
        who="Logged-in buyer"
        trigger="Item detail → 'I'M INTERESTED →' button"
        where="src/app/(app)/item/[id]/page.tsx; inline drawer markup"
        file="src/app/(app)/item/[id]/page.tsx (inline)"
      >
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
            I&apos;m Interested
          </h3>
          <span className="text-eb-body text-eb-muted leading-none -mt-1">
            ✕
          </span>
        </div>
        <p className="text-eb-caption text-eb-muted leading-relaxed mb-5">
          We&apos;ll text{" "}
          <span className="font-bold text-eb-black">{dealerBusiness}</span>{" "}
          your message and number. They&apos;ll contact you directly — no
          in-app messaging.
        </p>
        <div className="space-y-2">
          {[
            { label: "Ready to buy", text: "I'm interested and ready to buy." },
            { label: "Let's discuss", text: "I'm interested — I'd like to discuss." },
            { label: "What's your best price?", text: "What's your best price?" },
          ].map((opt) => (
            <div
              key={opt.label}
              className="w-full text-left px-4 py-3 border-2 border-eb-border bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                    {opt.label}
                  </div>
                  <div className="text-eb-meta text-eb-muted mt-1 leading-relaxed">
                    &ldquo;{opt.text}&rdquo;
                  </div>
                </div>
                <div className="shrink-0 w-5 h-5 rounded-full border-2 border-eb-border mt-0.5" />
              </div>
            </div>
          ))}
          <div className="w-full text-left px-4 py-3 border-2 border-eb-pop bg-eb-pop-bg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                  Write your own
                </div>
              </div>
              <div className="shrink-0 w-5 h-5 rounded-full border-2 border-eb-pop mt-0.5 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-eb-pop" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-eb-meta uppercase tracking-wider text-eb-muted">
              Your Message
            </span>
            <span className="text-eb-meta text-eb-muted tabular-nums">
              0 / 240
            </span>
          </div>
          <textarea
            className="eb-input h-24 resize-none"
            placeholder={`Love the ${itemTitle.toLowerCase()} — any details?`}
            disabled
          />
        </div>
        <button className="eb-btn mt-5">Send Inquiry</button>
      </DrawerCard>

      {/* ═══════════ 4. CONFIRM SELL TO SPECIFIC BUYER ═══════════ */}
      <DrawerCard
        num="04"
        title="Mark sold to {buyer}"
        who="Dealer (item owner)"
        trigger="Item detail → Inquiry card → Sell button"
        where="src/app/(app)/item/[id]/page.tsx; opens when dealer chooses a specific inquirer as buyer"
        file="src/app/(app)/item/[id]/page.tsx (inline)"
      >
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
        <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
          Mark sold to {buyerFirst}?
        </h3>
        <p className="text-eb-body text-eb-text leading-relaxed mt-3">
          Before you confirm, make sure you&apos;ve actually talked with{" "}
          <span className="font-bold text-eb-black">{buyerFirst}</span> and
          agreed on price, pickup, and payment.
        </p>
        <p className="text-eb-body text-eb-text leading-relaxed mt-3">
          Early Bird doesn&apos;t handle money or warranty the transaction
          — closing the deal is between you and {buyerFirst}. Use common
          sense.
        </p>
        <p className="text-eb-caption text-eb-muted leading-relaxed mt-4">
          Tapping below closes the listing, texts {buyerFirst} a receipt,
          and marks it sold in the app for the other inquirers.{" "}
          <span className="text-eb-black font-bold">Can&apos;t be undone.</span>
        </p>
        <div className="flex gap-2 mt-5">
          <button className="shrink-0 px-5 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text">
            Cancel
          </button>
          <button className="flex-1 min-w-0 py-3 text-eb-caption font-bold uppercase tracking-wider bg-eb-black text-white whitespace-nowrap overflow-hidden text-ellipsis">
            Mark sold to {buyerFirst}
          </button>
        </div>
      </DrawerCard>

      {/* ═══════════ 5. WALK-UP SOLD ═══════════ */}
      <DrawerCard
        num="05"
        title="Walk-up sold"
        who="Dealer (item owner)"
        trigger="Item detail → SOLD status pill (with no specific buyer)"
        where="src/app/(app)/item/[id]/page.tsx; destructive, no undo"
        file="src/app/(app)/item/[id]/page.tsx (inline)"
      >
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
        <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
          Mark sold at the booth?
        </h3>
        <p className="text-eb-body text-eb-text leading-relaxed mt-3">
          This is for a walk-up sale — someone bought it in person with no
          prior inquiry. If you&apos;re selling to someone who inquired
          through Early Bird,{" "}
          <span className="font-bold text-eb-black">
            use the Sell button on their inquiry card below
          </span>{" "}
          so they get the receipt text.
        </p>
        <p className="text-eb-caption text-eb-muted leading-relaxed mt-4">
          Tapping below closes the listing and marks anyone who inquired
          as &ldquo;sold to another buyer&rdquo; in the app. No text goes
          out.{" "}
          <span className="text-eb-black font-bold">Can&apos;t be undone.</span>
        </p>
        <div className="flex gap-2 mt-5">
          <button className="shrink-0 px-5 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text">
            Cancel
          </button>
          <button className="flex-1 min-w-0 py-3 text-eb-caption font-bold uppercase tracking-wider bg-eb-black text-white whitespace-nowrap">
            Mark sold at booth
          </button>
        </div>
      </DrawerCard>

      {/* ═══════════ 6. DELETE LISTING ═══════════ */}
      <DrawerCard
        num="06"
        title="Delete listing"
        who="Dealer (item owner)"
        trigger="Item detail → Delete button (below inquiries)"
        where="src/app/(app)/item/[id]/page.tsx; destructive, no undo"
        file="src/app/(app)/item/[id]/page.tsx (inline)"
      >
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
        <h3 className="text-eb-body font-bold uppercase tracking-widest text-eb-black mb-3">
          Delete this listing?
        </h3>
        <p className="text-eb-caption text-eb-muted mb-5 leading-relaxed">
          This removes &ldquo;{itemTitle}&rdquo; and all its photos
          permanently. This can&apos;t be undone.
        </p>
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 text-eb-caption font-bold bg-eb-red text-white uppercase tracking-wider">
            Yes, Delete
          </button>
          <button className="flex-1 py-2.5 text-eb-caption font-bold border border-eb-border text-eb-muted uppercase tracking-wider">
            Cancel
          </button>
        </div>
      </DrawerCard>
    </div>
  );
}

/* Shared card wrapper that frames each drawer preview with explainer. */
function DrawerCard({
  num,
  title,
  who,
  trigger,
  where,
  file,
  children,
}: {
  num: string;
  title: string;
  who: string;
  trigger: string;
  where: string;
  file: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b-2 border-eb-black">
      {/* Explainer */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-eb-caption font-bold tabular-nums text-eb-pop">
            {num}
          </span>
          <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
            {title}
          </span>
        </div>
        <dl className="text-eb-meta text-eb-text leading-relaxed mt-3 space-y-1">
          <div className="flex gap-2">
            <dt className="shrink-0 w-20 uppercase tracking-widest text-eb-muted text-eb-micro pt-0.5">
              Who
            </dt>
            <dd>{who}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 w-20 uppercase tracking-widest text-eb-muted text-eb-micro pt-0.5">
              Trigger
            </dt>
            <dd>{trigger}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 w-20 uppercase tracking-widest text-eb-muted text-eb-micro pt-0.5">
              Where
            </dt>
            <dd>{where}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 w-20 uppercase tracking-widest text-eb-muted text-eb-micro pt-0.5">
              File
            </dt>
            <dd className="font-mono text-eb-micro">{file}</dd>
          </div>
        </dl>
      </div>

      {/* Drawer rendered inline — same markup as the real drawer but
          without the fixed overlay positioning. */}
      <div className="mx-5 mb-8 bg-white rounded-t-2xl border-2 border-eb-black px-5 pt-3 pb-6 shadow-lg">
        {children}
      </div>
    </section>
  );
}
