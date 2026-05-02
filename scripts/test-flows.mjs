// End-to-end smoke test against prod.
//
// Seeds fake users (anon-equivalent, buyer, dealer, admin) with
// throwaway sessions, walks every recent flow we shipped, and cleans
// up at the end. All test rows are tagged TEST_<runId>_ so a stale
// run can be cleaned by hand if needed (DELETE FROM users WHERE
// display_name LIKE 'TEST_%').
//
// Usage:
//   node scripts/test-flows.mjs                # run against prod
//   BASE=http://localhost:3000 node scripts/test-flows.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { nanoid } from "nanoid";

// --------------------------- env + helpers ---------------------------

const envPath = "/Users/elikagan/Desktop/Claude stuff/EB_V2/.env.local";
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE = process.env.BASE || "https://earlybird.la";
const RUN_ID = nanoid(6);
const TAG = `TEST_${RUN_ID}`;

// Track everything we create so we can rip it out at the end.
const createdSessions = [];
const createdUsers = [];
const createdDealers = [];
const createdInvites = [];
const createdItems = [];

// Generate NANP-valid fake phones. Area + exchange both 200-999 so
// normalizeUSPhone (which enforces NANP) accepts them. 555 area code
// is the testing convention even though it's not strictly reserved.
function fakePhone(seedExchange) {
  const exchange = String(200 + Math.floor(Math.random() * 800));
  const last4 = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `+1555${seedExchange ?? exchange}${last4}`;
}

async function sql(q, params = []) {
  const { data, error } = await sb.rpc("run_sql", {
    query_text: q,
    params,
  });
  if (error) throw new Error(`DB read: ${error.message}`);
  return data;
}

async function mut(q, params = []) {
  const { error } = await sb.rpc("run_sql_mut", {
    query_text: q,
    params,
  });
  if (error) throw new Error(`DB mut: ${error.message}`);
}

async function fetchAs(token, path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (token) headers.Cookie = `eb_session=${token}`;
  const res = await fetch(BASE + path, {
    ...init,
    headers,
    redirect: "manual",
  });
  return res;
}

// --------------------------- seed ---------------------------

async function makeUser({ name, phone, isDealer, businessName }) {
  const userId = `u_${RUN_ID}_${nanoid(6)}`;
  await mut(
    `INSERT INTO users (id, phone, display_name, is_dealer)
     VALUES ($1, $2, $3, $4)`,
    [userId, phone, name, isDealer ? "1" : "0"]
  );
  createdUsers.push(userId);

  let dealerId = null;
  if (isDealer) {
    dealerId = `d_${RUN_ID}_${nanoid(6)}`;
    await mut(
      `INSERT INTO dealers (id, user_id, business_name)
       VALUES ($1, $2, $3)`,
      [dealerId, userId, businessName || `${TAG}_biz`]
    );
    createdDealers.push(dealerId);
  }

  const token = nanoid(32);
  const sessionId = `s_${RUN_ID}_${nanoid(6)}`;
  await mut(
    `INSERT INTO sessions (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, now() + interval '1 day')`,
    [sessionId, userId, token]
  );
  createdSessions.push(sessionId);

  return { userId, dealerId, token, phone, name };
}

async function makeItem(dealerId, { title, price, status = "live" }) {
  const itemId = `i_${RUN_ID}_${nanoid(6)}`;
  await mut(
    `INSERT INTO items (id, dealer_id, title, price, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [itemId, dealerId, title, String(price), status]
  );
  createdItems.push(itemId);
  return itemId;
}

async function makeInvite({ multiUse = false, phone = null } = {}) {
  const id = `inv_${RUN_ID}_${nanoid(6)}`;
  const code = nanoid(10);
  await mut(
    `INSERT INTO dealer_invites (id, code, phone, multi_use)
     VALUES ($1, $2, $3, $4)`,
    [id, code, phone, multiUse ? "true" : "false"]
  );
  createdInvites.push(id);
  return { id, code };
}

// --------------------------- assertions ---------------------------

let passed = 0;
let failed = 0;
const fails = [];

async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${label}`);
    console.log(`      ${err.message}`);
    failed++;
    fails.push({ label, err: err.message });
  }
}

function expect(actual, label) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
      }
    },
    toMatch: (re) => {
      if (!re.test(String(actual))) {
        throw new Error(`${label}: ${actual} did not match ${re}`);
      }
    },
    toContain: (sub) => {
      if (!String(actual).includes(sub)) {
        throw new Error(`${label}: did not contain "${sub}"`);
      }
    },
    notToContain: (sub) => {
      if (String(actual).includes(sub)) {
        throw new Error(`${label}: should not contain "${sub}"`);
      }
    },
  };
}

// --------------------------- cleanup ---------------------------

async function cleanup() {
  console.log("\n=== Cleanup ===");
  // Delete derived rows first, then parents.
  for (const id of createdInvites) {
    await mut(`DELETE FROM dealer_invites WHERE id = $1`, [id]);
  }
  for (const id of createdSessions) {
    await mut(`DELETE FROM sessions WHERE id = $1`, [id]);
  }
  for (const id of createdItems) {
    await mut(`DELETE FROM item_photos WHERE item_id = $1`, [id]);
    await mut(`DELETE FROM favorites WHERE item_id = $1`, [id]);
    await mut(`DELETE FROM inquiries WHERE item_id = $1`, [id]);
    await mut(`DELETE FROM items WHERE id = $1`, [id]);
  }
  for (const id of createdDealers) {
    await mut(`DELETE FROM booth_settings WHERE dealer_id = $1`, [id]);
    await mut(`DELETE FROM dealer_payment_methods WHERE dealer_id = $1`, [id]);
    await mut(`DELETE FROM dealers WHERE id = $1`, [id]);
  }
  for (const id of createdUsers) {
    await mut(`DELETE FROM favorites WHERE buyer_id = $1`, [id]);
    await mut(`DELETE FROM inquiries WHERE buyer_id = $1`, [id]);
    await mut(`DELETE FROM dealer_applications WHERE user_id = $1`, [id]);
    await mut(`DELETE FROM notification_preferences WHERE user_id = $1`, [id]);
    await mut(`DELETE FROM users WHERE id = $1`, [id]);
  }
  console.log(
    `  Cleaned: ${createdInvites.length} invites · ${createdSessions.length} sessions · ${createdItems.length} items · ${createdDealers.length} dealers · ${createdUsers.length} users`
  );
}

// --------------------------- tests ---------------------------

async function main() {
  console.log(`Running test suite ${RUN_ID} against ${BASE}\n`);

  // Pre-flight: confirm the DB has the data we expect.
  console.log("=== Pre-flight ===");
  const dbCheck = await sql(`
    SELECT
      (SELECT COUNT(*) FROM items WHERE status = 'live') AS live_items,
      (SELECT COUNT(*) FROM dealers) AS dealer_count,
      (SELECT COUNT(*) FROM markets WHERE COALESCE(archived,0)=0) AS markets,
      (SELECT COUNT(*) FROM dealer_invites WHERE multi_use = true) AS multi_use_invites
  `);
  console.log("  DB state:", dbCheck[0]);

  // ---- 1. Anonymous flows ----
  console.log("\n=== Anonymous ===");
  const anonHome = await fetchAs(null, "/");
  await check("GET / returns 200", () => expect(anonHome.status, "status").toBe(200));
  const anonHomeText = await anonHome.text();
  await check("GET / has promo grid eyebrow", () =>
    expect(anonHomeText, "/ HTML").toContain("This week")
  );
  await check("GET / has all-items stream", () =>
    expect(anonHomeText, "/ HTML").toContain("Browse all items")
  );
  await check("GET / has Coming up rail", () =>
    expect(anonHomeText, "/ HTML").toContain("Coming up")
  );
  await check("GET / has Dealer link in masthead (anon only)", () =>
    expect(anonHomeText, "/ HTML").toContain("/dealer")
  );
  await check("GET / has About + FAQ (anon only)", () =>
    expect(anonHomeText, "/ HTML").toContain("FAQ")
  );

  const anonBuy = await fetchAs(null, "/buy");
  await check("GET /buy returns 200", () => expect(anonBuy.status, "status").toBe(200));
  const anonBuyText = await anonBuy.text();
  await check("GET /buy renders 'All Items' header", () =>
    expect(anonBuyText, "/buy HTML").toContain("All Items")
  );
  await check("GET /buy doesn't include sold items", () =>
    expect(anonBuyText, "/buy").notToContain("eb-sold")
  );

  const anonSell = await fetchAs(null, "/sell");
  await check("GET /sell as anon -> 404", () =>
    expect(anonSell.status, "status").toBe(404)
  );

  const anonAdmin = await fetchAs(null, "/admin");
  await check("GET /admin as anon -> 404", () =>
    expect(anonAdmin.status, "status").toBe(404)
  );

  // ---- 2. Featured market lookup ----
  console.log("\n=== Featured market ===");
  const featRows = await sql(`
    SELECT id, name, starts_at FROM markets
    WHERE COALESCE(archived, 0) = 0
      AND starts_at >= now() - interval '7 days'
    ORDER BY starts_at ASC LIMIT 1
  `);
  if (featRows.length === 0) throw new Error("no upcoming market in DB");
  const featured = featRows[0];
  console.log(`  Featured: ${featured.name} (${featured.id})`);

  // ---- 3. Buyer (signed-in non-dealer) flows ----
  console.log("\n=== Buyer (signed in) ===");
  const buyer = await makeUser({
    name: `${TAG}_Buyer`,
    phone: fakePhone("210"),
    isDealer: false,
  });

  const buyerHome = await fetchAs(buyer.token, "/");
  const buyerHomeText = await buyerHome.text();
  await check("Signed-in buyer GET / returns 200", () =>
    expect(buyerHome.status, "status").toBe(200)
  );
  await check("Signed-in / hides Dealer-link from masthead", () => {
    // anon has it; signed-in shouldn't
    if (buyerHomeText.includes('href="/dealer"')) {
      throw new Error("dealer link shown for signed-in buyer");
    }
  });
  await check("Signed-in / hides About+FAQ section", () => {
    if (buyerHomeText.includes(">FAQ<")) {
      throw new Error("FAQ shown for signed-in buyer");
    }
  });

  const buyerSell = await fetchAs(buyer.token, "/sell");
  await check("Buyer GET /sell -> 404", () =>
    expect(buyerSell.status, "status").toBe(404)
  );

  const buyerAdmin = await fetchAs(buyer.token, "/admin");
  await check("Buyer GET /admin -> 404", () =>
    expect(buyerAdmin.status, "status").toBe(404)
  );

  // ---- 4. Dealer flows ----
  console.log("\n=== Dealer (signed in) ===");
  const dealer = await makeUser({
    name: `${TAG}_Dealer`,
    phone: fakePhone("220"),
    isDealer: true,
    businessName: `${TAG}_DealerBiz`,
  });

  const dealerSell = await fetchAs(dealer.token, "/sell");
  await check("Dealer GET /sell returns 200", () =>
    expect(dealerSell.status, "status").toBe(200)
  );

  const dealerAdmin = await fetchAs(dealer.token, "/admin");
  await check("Dealer GET /admin -> 404 (not admin)", () =>
    expect(dealerAdmin.status, "status").toBe(404)
  );

  // ---- 5. Universal invite link flow ----
  console.log("\n=== Universal invite link ===");
  const universal = await makeInvite({ multiUse: true });
  console.log(`  Created multi_use invite: ${universal.code}`);

  // 5a. Anon: page loads with full form
  const anonInvite = await fetchAs(null, `/invite/${universal.code}`);
  const anonInviteText = await anonInvite.text();
  await check("Anon invite page returns 200", () =>
    expect(anonInvite.status, "status").toBe(200)
  );
  await check("Anon invite shows full form (Phone + Your Name)", () => {
    expect(anonInviteText, "anon invite HTML").toContain("Phone Number");
    expect(anonInviteText, "anon invite HTML").toContain("Your Name");
  });

  // 5b. Buyer: server-rendered with stripped form (phone read-only,
  //     no separate Your Name field)
  const buyerInvite = await fetchAs(buyer.token, `/invite/${universal.code}`);
  await check("Buyer invite page returns 200", () =>
    expect(buyerInvite.status, "status").toBe(200)
  );
  const buyerInviteText = await buyerInvite.text();
  await check("Buyer invite shows 'Set up your booth' header", () =>
    expect(buyerInviteText, "buyer invite HTML").toContain("Set up your booth")
  );
  await check("Buyer invite shows phone read-only (account phone)", () =>
    expect(buyerInviteText, "buyer invite HTML").toContain(
      "phone on your Early Bird account"
    )
  );
  await check("Buyer invite hides 'Your Name' input (uses session)", () =>
    expect(buyerInviteText, "buyer invite HTML").notToContain(">Your Name<")
  );

  // 5c. Dealer: server-side redirect to /sell. fetch with redirect:
  //     manual returns the redirect response without following.
  const dealerInvite = await fetchAs(dealer.token, `/invite/${universal.code}`);
  await check("Dealer invite page -> redirect (307/308)", () => {
    if (dealerInvite.status !== 307 && dealerInvite.status !== 308) {
      throw new Error(`expected 307/308, got ${dealerInvite.status}`);
    }
  });
  await check("Dealer invite redirect target is /sell", () => {
    const loc = dealerInvite.headers.get("location") || "";
    if (!loc.endsWith("/sell")) throw new Error(`got Location: ${loc}`);
  });

  // ---- 6. Invalid invite ----
  console.log("\n=== Invalid invite ===");
  const badInvite = await fetchAs(null, "/invite/this-code-does-not-exist");
  const badInviteText = await badInvite.text();
  await check("Invalid invite page returns 200 with NotFound view", () => {
    expect(badInvite.status, "status").toBe(200);
    expect(badInviteText, "invalid invite HTML").toContain("Invite not found");
  });

  // ---- 7. Single-use invite, used-up ----
  console.log("\n=== Used-up single-use invite ===");
  const oneShot = await makeInvite({ multiUse: false });
  // Manually mark it used.
  await mut(
    `UPDATE dealer_invites SET used_at = now() WHERE id = $1`,
    [oneShot.id]
  );
  const usedInvite = await fetchAs(null, `/invite/${oneShot.code}`);
  const usedInviteText = await usedInvite.text();
  await check("Used-up single-use invite -> NotFound view", () =>
    expect(usedInviteText, "used invite HTML").toContain("Invite not found")
  );

  // ---- 8. /buy?market=X attendance + ads divider ----
  console.log("\n=== /buy?market=X with attendance ===");

  // Mark the test dealer as attending the featured market.
  const boothId = `bs_${RUN_ID}_${nanoid(6)}`;
  await mut(
    `INSERT INTO booth_settings (id, dealer_id, market_id, declined)
     VALUES ($1, $2, $3, false)`,
    [boothId, dealer.dealerId, featured.id]
  );

  // Give the test dealer an item so we can verify it surfaces first.
  const attendingItem = await makeItem(dealer.dealerId, {
    title: `${TAG}_AttendingItem`,
    price: 12345,
  });

  const filteredBuy = await fetchAs(
    null,
    `/buy?market=${encodeURIComponent(featured.id)}`
  );
  const filteredBuyText = await filteredBuy.text();
  await check("/buy?market=X returns 200", () =>
    expect(filteredBuy.status, "status").toBe(200)
  );
  await check("/buy?market=X header reads 'Items at <market>'", () => {
    expect(filteredBuyText, "filtered HTML").toContain("Items at");
    expect(filteredBuyText, "filtered HTML").toContain(featured.name);
  });
  await check("/buy?market=X shows the 'More on Early Bird' divider", () =>
    expect(filteredBuyText, "filtered HTML").toContain("More on Early Bird")
  );
  await check(
    "/buy?market=X surfaces test attending item (created above)",
    () =>
      expect(filteredBuyText, "filtered HTML").toContain(
        `${TAG}_AttendingItem`
      )
  );

  // Also verify the ATTENDING set in the API matches expectations.
  const apiBuyMarket = await fetchAs(
    null,
    `/api/items?market_id=${encodeURIComponent(featured.id)}&limit=200`
  );
  const apiBuyMarketJson = await apiBuyMarket.json();
  const attendingFlags = apiBuyMarketJson.map(
    (i) => i.at_market
  );
  await check("API /api/items?market_id has attending=1 items", () => {
    if (!attendingFlags.includes(1)) {
      throw new Error("no items with at_market=1 returned");
    }
  });
  await check("API attending items come before non-attending", () => {
    const lastAttendingIdx = attendingFlags.lastIndexOf(1);
    const firstNonIdx = attendingFlags.indexOf(0);
    if (firstNonIdx >= 0 && lastAttendingIdx > firstNonIdx) {
      throw new Error(
        "attending items not consistently before non-attending"
      );
    }
  });

  // ---- 9. /buy unfiltered: full stream, no sold items ----
  console.log("\n=== /buy unfiltered ===");
  // Add a sold item by the test dealer to verify it's hidden from /buy.
  const soldItem = await makeItem(dealer.dealerId, {
    title: `${TAG}_SoldItem`,
    price: 9999,
    status: "sold",
  });
  void soldItem;
  // Cache-buster: /api/items uses cachedJson (s-maxage=60 on the CDN),
  // so without a unique param we'd get a stale response that predates
  // the test items we just inserted.
  const apiBuy = await fetchAs(null, `/api/items?limit=200&_=${RUN_ID}`);
  const apiBuyJson = await apiBuy.json();
  await check("/api/items hides sold items", () => {
    if (apiBuyJson.some((i) => i.status === "sold")) {
      throw new Error(
        `${apiBuyJson.filter((i) => i.status === "sold").length} sold items returned`
      );
    }
  });
  await check("/api/items hides deleted items", () => {
    if (apiBuyJson.some((i) => i.status === "deleted")) {
      throw new Error("deleted items returned");
    }
  });
  await check("/api/items returns the test attending item", () => {
    if (!apiBuyJson.some((i) => i.id === attendingItem)) {
      throw new Error("test attending item not in /api/items");
    }
  });

  // ---- 10. Already-a-dealer redeem error path ----
  console.log("\n=== Redeem with already-dealer phone ===");
  // The dealer's phone exists. POST to redeem with that phone via a
  // throwaway anon call should hit "already a dealer" guard.
  const redeemRes = await fetch(BASE + "/api/invite/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: universal.code,
      phone: dealer.phone,
      name: `${TAG}_dup`,
      business_name: `${TAG}_dup_biz`,
    }),
    redirect: "manual",
  });
  await check("Redeem with existing-dealer phone -> 4xx", () => {
    if (redeemRes.status < 400 || redeemRes.status >= 500) {
      throw new Error(`expected 4xx, got ${redeemRes.status}`);
    }
  });
  const redeemJson = await redeemRes.json().catch(() => ({}));
  await check("Redeem error message is 'already a dealer'", () =>
    expect(redeemJson.error || "", "error").toContain("already a dealer")
  );

  // ---- 11. /api/sell/stats trailing-7-day ----
  console.log("\n=== /api/sell/stats ===");
  const statsRes = await fetchAs(dealer.token, "/api/sell/stats");
  const stats = await statsRes.json();
  await check("/api/sell/stats returns 200 for dealer", () =>
    expect(statsRes.status, "status").toBe(200)
  );
  await check("/api/sell/stats has 7-day window", () =>
    expect(stats.range_days, "range_days").toBe(7)
  );
  await check("/api/sell/stats counts test attending item under listed", () => {
    if (typeof stats.listed !== "number" || stats.listed < 1) {
      throw new Error(`listed = ${stats.listed}, expected >= 1`);
    }
  });

  // ---- 12. /api/nav-counts for dealer ----
  console.log("\n=== /api/nav-counts ===");
  const navRes = await fetchAs(dealer.token, "/api/nav-counts");
  const nav = await navRes.json();
  await check("/api/nav-counts returns 200 for dealer", () =>
    expect(navRes.status, "status").toBe(200)
  );
  await check("/api/nav-counts.sell counts dealer's catalog", () => {
    // 2 created (live + sold). Sold counts in catalog (not deleted).
    if (typeof nav.sell !== "number" || nav.sell < 2) {
      throw new Error(`sell = ${nav.sell}, expected >= 2`);
    }
  });

  // ---- 13. Buyer /api/nav-counts watching = 0 then favorite then 1 ----
  console.log("\n=== Buyer favorites flow ===");
  const navBuyer1 = await fetchAs(buyer.token, "/api/nav-counts");
  const navBuyer1Json = await navBuyer1.json();
  await check("Initial buyer watching count == 0", () =>
    expect(navBuyer1Json.watching, "watching").toBe(0)
  );

  const favRes = await fetchAs(buyer.token, "/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: attendingItem }),
  });
  await check("POST /api/favorites returns ok", () => {
    if (favRes.status < 200 || favRes.status >= 300) {
      throw new Error(`status ${favRes.status}`);
    }
  });

  const navBuyer2 = await fetchAs(buyer.token, "/api/nav-counts");
  const navBuyer2Json = await navBuyer2.json();
  await check("After favorite, watching count == 1", () =>
    expect(navBuyer2Json.watching, "watching").toBe(1)
  );

  // ---- 14. /home redirect ----
  console.log("\n=== /home -> / redirect ===");
  const homeRedirect = await fetchAs(null, "/home");
  await check("/home redirects (3xx)", () => {
    if (homeRedirect.status < 300 || homeRedirect.status >= 400) {
      throw new Error(`status ${homeRedirect.status}`);
    }
  });

  // ---- Done ----
  console.log(`\n=== Results ===`);
  console.log(`  ${passed} passed`);
  console.log(`  ${failed} failed`);
  if (fails.length > 0) {
    console.log(`\nFailures:`);
    for (const f of fails) {
      console.log(`  - ${f.label}`);
      console.log(`      ${f.err}`);
    }
  }
}

// --------------------------- run ---------------------------

main()
  .catch((err) => {
    console.error("\nFatal:", err);
    failed = (failed || 0) + 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("Cleanup error:", err);
    }
    process.exit(failed > 0 ? 1 : 0);
  });
