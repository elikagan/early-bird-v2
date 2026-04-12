import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

function id(): string {
  return nanoid(16);
}

async function seed() {
  // ── Drop all tables ──────────────────────────────────────
  const tables = [
    "favorites",
    "inquiries",
    "item_photos",
    "items",
    "booth_settings",
    "buyer_market_follows",
    "notification_preferences",
    "dealer_payment_methods",
    "sessions",
    "auth_tokens",
    "dealers",
    "markets",
    "users",
  ];
  for (const t of tables) {
    await db.execute(`DROP TABLE IF EXISTS ${t}`);
  }

  // ── Create tables ────────────────────────────────────────
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = schema
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);
  await db.execute("PRAGMA foreign_keys = ON");
  for (const stmt of statements) {
    await db.execute(stmt);
  }

  // ── IDs (stable so FKs line up) ─────────────────────────

  // Users
  const johnId = id();
  const sarahId = id();
  const dannyId = id();
  const lilyId = id(); // extra buyer
  const marcoUserId = id();
  const decoUserId = id();
  const avenueUserId = id();
  const lucilleUserId = id();
  const ruthUserId = id();

  // Dealers
  const marcoId = id();
  const decoId = id();
  const avenueId = id();
  const lucilleId = id();
  const ruthId = id();

  // Markets
  const dtmId = id(); // Downtown Modernism
  const rbfId = id(); // Rose Bowl Flea
  const pccId = id(); // PCC Flea

  // Items
  const credenzaId = id();
  const deskLampId = id();
  const armchairId = id();
  const kitchenTableId = id();
  const vaseId = id();
  const nestingTablesId = id();
  const floorLampId = id();
  const woodcutId = id();
  const rolltopId = id();
  const caneChairsId = id();

  // ── Users ────────────────────────────────────────────────
  const users = [
    // Buyers
    [johnId, "(213) 555-0134", "John", "Chen", "John C.", null, 0],
    [sarahId, "(310) 555-0811", "Sarah", "Reeves", "Sarah R.", null, 0],
    [dannyId, "(818) 555-2290", "Danny", "Torres", "Danny T.", null, 0],
    [lilyId, "(626) 555-0447", "Lily", "Park", "Lily P.", null, 0],
    // Dealers (is_dealer = 1)
    [marcoUserId, "(323) 555-0188", "Marco", "Ferraro", "Marco F.", null, 1],
    [decoUserId, "(323) 555-0299", "David", "Greenfield", "David G.", null, 1],
    [avenueUserId, "(213) 555-0377", "Ana", "Bermudez", "Ana B.", null, 1],
    [lucilleUserId, "(626) 555-0512", "Lucille", "Kim", "Lucille K.", null, 1],
    [ruthUserId, "(818) 555-0633", "Ruth", "Hernandez", "Ruth H.", null, 1],
  ];
  for (const [uid, phone, first, last, display, avatar, dealer] of users) {
    await db.execute({
      sql: `INSERT INTO users (id, phone, first_name, last_name, display_name, avatar_url, is_dealer) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [uid, phone, first, last, display, avatar, dealer],
    });
  }

  // ── Dealers ──────────────────────────────────────────────
  const dealerRows = [
    [marcoId, marcoUserId, "Marco's Finds", "@marcosfinds", 1],
    [decoId, decoUserId, "Deco Garage", null, 1],
    [avenueId, avenueUserId, "Avenue B", null, 0],
    [lucilleId, lucilleUserId, "Lucille's Ceramics", null, 0],
    [ruthId, ruthUserId, "Ruth's House", null, 0],
  ];
  for (const [did, uid, biz, ig, verified] of dealerRows) {
    await db.execute({
      sql: `INSERT INTO dealers (id, user_id, business_name, instagram_handle, verified) VALUES (?, ?, ?, ?, ?)`,
      args: [did, uid, biz, ig, verified],
    });
  }

  // ── Dealer payment methods ───────────────────────────────
  // Marco: cash, venmo, zelle on; apple_pay, card off
  const marcoPm = [
    ["cash", 1],
    ["venmo", 1],
    ["zelle", 1],
    ["apple_pay", 0],
    ["card", 0],
  ];
  for (const [method, enabled] of marcoPm) {
    await db.execute({
      sql: `INSERT INTO dealer_payment_methods (id, dealer_id, method, enabled) VALUES (?, ?, ?, ?)`,
      args: [id(), marcoId, method, enabled],
    });
  }
  // Other dealers: cash + venmo on by default
  for (const did of [decoId, avenueId, lucilleId, ruthId]) {
    for (const [method, enabled] of [
      ["cash", 1],
      ["venmo", 1],
    ] as const) {
      await db.execute({
        sql: `INSERT INTO dealer_payment_methods (id, dealer_id, method, enabled) VALUES (?, ?, ?, ?)`,
        args: [id(), did, method, enabled],
      });
    }
  }

  // ── Markets ──────────────────────────────────────────────
  // Downtown Modernism: LIVE, drop already happened
  // Rose Bowl Flea: upcoming, ~14 days out
  // PCC Flea: upcoming, ~21 days out
  const now = new Date();
  const dtmDrop = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
  const dtmStart = new Date(now.getTime() + 10 * 60 * 60 * 1000); // tomorrow morning
  const rbfDrop = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const rbfStart = new Date(rbfDrop.getTime() + 14 * 60 * 60 * 1000);
  const pccDrop = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const pccStart = new Date(pccDrop.getTime() + 14 * 60 * 60 * 1000);

  const marketRows = [
    [dtmId, "Downtown Modernism", "Downtown LA", dtmDrop.toISOString(), dtmStart.toISOString(), "live"],
    [rbfId, "Rose Bowl Flea", "Pasadena", rbfDrop.toISOString(), rbfStart.toISOString(), "upcoming"],
    [pccId, "PCC Flea", "Pasadena City College", pccDrop.toISOString(), pccStart.toISOString(), "upcoming"],
  ];
  for (const [mid, name, loc, drop, start, status] of marketRows) {
    await db.execute({
      sql: `INSERT INTO markets (id, name, location, drop_at, starts_at, status) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [mid, name, loc, drop, start, status],
    });
  }

  // ── Buyer market follows ─────────────────────────────────
  // John follows all 3 markets
  for (const mid of [dtmId, rbfId, pccId]) {
    await db.execute({
      sql: `INSERT INTO buyer_market_follows (id, buyer_id, market_id, drop_alerts_enabled) VALUES (?, ?, ?, ?)`,
      args: [id(), johnId, mid, 1],
    });
  }
  // Sarah follows DTM only
  await db.execute({
    sql: `INSERT INTO buyer_market_follows (id, buyer_id, market_id, drop_alerts_enabled) VALUES (?, ?, ?, ?)`,
    args: [id(), sarahId, dtmId, 1],
  });

  // ── Notification preferences ─────────────────────────────
  // John (buyer): drop_alerts on, price_drops on, new_markets off
  const johnPrefs = [
    ["drop_alerts", 1],
    ["price_drops", 1],
    ["new_markets", 0],
  ];
  for (const [key, enabled] of johnPrefs) {
    await db.execute({
      sql: `INSERT INTO notification_preferences (id, user_id, key, enabled) VALUES (?, ?, ?, ?)`,
      args: [id(), johnId, key, enabled],
    });
  }
  // Marco (dealer): new_inquiries on, drop_reminders on, watcher_milestones off
  const marcoPrefs = [
    ["new_inquiries", 1],
    ["drop_reminders", 1],
    ["watcher_milestones", 0],
  ];
  for (const [key, enabled] of marcoPrefs) {
    await db.execute({
      sql: `INSERT INTO notification_preferences (id, user_id, key, enabled) VALUES (?, ?, ?, ?)`,
      args: [id(), marcoUserId, key, enabled],
    });
  }

  // ── Booth settings ───────────────────────────────────────
  // Marco at Downtown Modernism, Booth 42
  await db.execute({
    sql: `INSERT INTO booth_settings (id, dealer_id, market_id, booth_number) VALUES (?, ?, ?, ?)`,
    args: [id(), marcoId, dtmId, "42"],
  });
  // Deco Garage, Booth 18
  await db.execute({
    sql: `INSERT INTO booth_settings (id, dealer_id, market_id, booth_number) VALUES (?, ?, ?, ?)`,
    args: [id(), decoId, dtmId, "18"],
  });
  // Avenue B, Booth 7
  await db.execute({
    sql: `INSERT INTO booth_settings (id, dealer_id, market_id, booth_number) VALUES (?, ?, ?, ?)`,
    args: [id(), avenueId, dtmId, "7"],
  });
  // Lucille's Ceramics, Booth 31
  await db.execute({
    sql: `INSERT INTO booth_settings (id, dealer_id, market_id, booth_number) VALUES (?, ?, ?, ?)`,
    args: [id(), lucilleId, dtmId, "31"],
  });
  // Ruth's House, Booth 55
  await db.execute({
    sql: `INSERT INTO booth_settings (id, dealer_id, market_id, booth_number) VALUES (?, ?, ?, ?)`,
    args: [id(), ruthId, dtmId, "55"],
  });

  // ── Items (all in Downtown Modernism) ────────────────────
  // Prices in cents
  const itemRows: [string, string, string, string, string | null, number, number | null, number, string, string | null, string | null][] = [
    // [id, dealer_id, market_id, title, description, price, original_price, price_firm, status, held_for, sold_to]
    [credenzaId, marcoId, dtmId, "Walnut Credenza",
      "Low 4-drawer walnut credenza, circa 1962. Tapered legs, original brass pulls. Veneer has a few small chips on the top left corner (see photo 4). Interior clean, drawers glide smoothly. Measures 66\" W × 18\" D × 28\" H. Local pickup only.",
      45000, null, 1, "live", null, null],
    [deskLampId, decoId, dtmId, "Brass Desk Lamp",
      "Adjustable brass desk lamp, 1970s. Fully rewired with fabric cord. Works perfectly.",
      18000, 25000, 0, "hold", johnId, null],
    [armchairId, avenueId, dtmId, "Vintage Leather Armchair",
      "Mid-century leather club chair. Cognac leather, solid walnut frame. Some patina on armrests.",
      32500, null, 0, "live", null, null],
    [kitchenTableId, ruthId, dtmId, "Enamel Kitchen Table",
      "White enamel-top kitchen table, 1940s. Chrome legs. Minor surface wear.",
      14000, null, 0, "sold", null, lilyId],
    [vaseId, lucilleId, dtmId, "Cobalt Studio Vase",
      "Handthrown stoneware vase in deep cobalt glaze. Signed on base. 9\" tall.",
      8500, null, 0, "live", null, null],
    [nestingTablesId, marcoId, dtmId, "Teak Nesting Tables",
      "Set of 3 Danish teak nesting tables, 1960s. Clean lines, minor ring marks on largest.",
      22000, null, 0, "hold", johnId, null],
    [floorLampId, decoId, dtmId, "Chrome Floor Lamp",
      "Chrome arc floor lamp with marble base. Rewired. 72\" tall. Statement piece.",
      27500, 34000, 0, "live", null, null],
    [woodcutId, avenueId, dtmId, "Signed Woodcut Print",
      "Hand-pulled woodcut on washi paper, signed and numbered 12/50. Framed.",
      9500, null, 0, "live", null, null],
    [rolltopId, marcoId, dtmId, "Oak Rolltop Desk",
      "Quarter-sawn oak rolltop desk, c. 1910. All compartments intact. Roll mechanism smooth. Heavy — bring help.",
      62500, null, 0, "live", null, null],
    [caneChairsId, marcoId, dtmId, "Pair of Cane Chairs",
      "Matched pair of cane-seat dining chairs. Beechwood frame, intact caning. Light refinish.",
      18000, 24000, 0, "live", null, null],
  ];

  for (const [iid, did, mid, title, desc, price, origPrice, firm, status, heldFor, soldTo] of itemRows) {
    await db.execute({
      sql: `INSERT INTO items (id, dealer_id, market_id, title, description, price, original_price, price_firm, status, held_for, sold_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [iid, did, mid, title, desc, price, origPrice, firm, status, heldFor, soldTo],
    });
  }

  // ── Item photos (Picsum URLs matching buy-feed.html) ─────
  const photos: [string, string, number][] = [
    [credenzaId, "https://picsum.photos/seed/eb-walnut-credenza/600/600", 0],
    [credenzaId, "https://picsum.photos/seed/eb-walnut-credenza-2/600/600", 1],
    [credenzaId, "https://picsum.photos/seed/eb-walnut-credenza-3/600/600", 2],
    [credenzaId, "https://picsum.photos/seed/eb-walnut-credenza-4/600/600", 3],
    [credenzaId, "https://picsum.photos/seed/eb-walnut-credenza-5/600/600", 4],
    [deskLampId, "https://picsum.photos/seed/eb-brass-desk-lamp/600/600", 0],
    [deskLampId, "https://picsum.photos/seed/eb-brass-desk-lamp-2/600/600", 1],
    [armchairId, "https://picsum.photos/seed/eb-leather-armchair/600/600", 0],
    [armchairId, "https://picsum.photos/seed/eb-leather-armchair-2/600/600", 1],
    [armchairId, "https://picsum.photos/seed/eb-leather-armchair-3/600/600", 2],
    [kitchenTableId, "https://picsum.photos/seed/eb-enamel-kitchen-table/600/600", 0],
    [vaseId, "https://picsum.photos/seed/eb-cobalt-studio-vase/600/600", 0],
    [vaseId, "https://picsum.photos/seed/eb-cobalt-studio-vase-2/600/600", 1],
    [nestingTablesId, "https://picsum.photos/seed/eb-teak-nesting-tables/600/600", 0],
    [nestingTablesId, "https://picsum.photos/seed/eb-teak-nesting-tables-2/600/600", 1],
    [floorLampId, "https://picsum.photos/seed/eb-chrome-floor-lamp/600/600", 0],
    [woodcutId, "https://picsum.photos/seed/eb-signed-woodcut-print/600/600", 0],
    [rolltopId, "https://picsum.photos/seed/eb-oak-rolltop-desk/600/600", 0],
    [rolltopId, "https://picsum.photos/seed/eb-oak-rolltop-desk-2/600/600", 1],
    [rolltopId, "https://picsum.photos/seed/eb-oak-rolltop-desk-3/600/600", 2],
    [caneChairsId, "https://picsum.photos/seed/eb-cane-chairs/600/600", 0],
    [caneChairsId, "https://picsum.photos/seed/eb-cane-chairs-2/600/600", 1],
  ];
  for (const [itemId, url, pos] of photos) {
    await db.execute({
      sql: `INSERT INTO item_photos (id, item_id, url, position) VALUES (?, ?, ?, ?)`,
      args: [id(), itemId, url, pos],
    });
  }

  // ── Inquiries on Walnut Credenza (matching dealer-own wireframe) ──
  const inquiryRows: [string, string, string, string][] = [
    [credenzaId, johnId,
      "Love the credenza — is the veneer chip visible from 3 feet? Coming at 6am.",
      "open"],
    [credenzaId, sarahId,
      "Beautiful piece. Would you take $400 cash? Can pick up same day.",
      "open"],
    [credenzaId, dannyId,
      "Interior designer here. If still available Saturday morning I'm taking it. I'll be first in line.",
      "open"],
  ];
  for (const [itemId, buyerId, msg, status] of inquiryRows) {
    await db.execute({
      sql: `INSERT INTO inquiries (id, item_id, buyer_id, message, status) VALUES (?, ?, ?, ?, ?)`,
      args: [id(), itemId, buyerId, msg, status],
    });
  }

  // John also inquired about the Brass Desk Lamp and the Vintage Leather Armchair (watching tab)
  await db.execute({
    sql: `INSERT INTO inquiries (id, item_id, buyer_id, message, status) VALUES (?, ?, ?, ?, ?)`,
    args: [id(), deskLampId, johnId,
      "Love the brass — is the wiring solid? Could swing by Saturday morning.",
      "open"],
  });
  await db.execute({
    sql: `INSERT INTO inquiries (id, item_id, buyer_id, message, status) VALUES (?, ?, ?, ?, ?)`,
    args: [id(), armchairId, johnId,
      "How's the leather holding up? Any cracks on the seat or arms?",
      "open"],
  });

  // ── Favorites (John's watching list from watching.html) ──
  const johnFavs = [
    deskLampId,      // Brass Desk Lamp (also inquired)
    credenzaId,      // Walnut Credenza
    nestingTablesId, // Teak Nesting Tables (held)
    vaseId,          // Cobalt Studio Vase
    kitchenTableId,  // Enamel Kitchen Table (sold)
    floorLampId,     // Chrome Floor Lamp (price drop)
  ];
  for (const itemId of johnFavs) {
    await db.execute({
      sql: `INSERT INTO favorites (id, buyer_id, item_id) VALUES (?, ?, ?)`,
      args: [id(), johnId, itemId],
    });
  }
  // Armchair not hearted in watching (inquiry only, no heart icon)

  // ── Sessions (one for John so curl testing works) ────────
  const johnSessionToken = "dev-session-john-" + id();
  const marcoSessionToken = "dev-session-marco-" + id();
  const sessionExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [id(), johnId, johnSessionToken, sessionExpiry],
  });
  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [id(), marcoUserId, marcoSessionToken, sessionExpiry],
  });

  // ── Summary ──────────────────────────────────────────────
  const counts = await Promise.all([
    db.execute("SELECT COUNT(*) as n FROM users"),
    db.execute("SELECT COUNT(*) as n FROM dealers"),
    db.execute("SELECT COUNT(*) as n FROM markets"),
    db.execute("SELECT COUNT(*) as n FROM items"),
    db.execute("SELECT COUNT(*) as n FROM item_photos"),
    db.execute("SELECT COUNT(*) as n FROM inquiries"),
    db.execute("SELECT COUNT(*) as n FROM favorites"),
    db.execute("SELECT COUNT(*) as n FROM booth_settings"),
    db.execute("SELECT COUNT(*) as n FROM dealer_payment_methods"),
    db.execute("SELECT COUNT(*) as n FROM buyer_market_follows"),
    db.execute("SELECT COUNT(*) as n FROM notification_preferences"),
    db.execute("SELECT COUNT(*) as n FROM sessions"),
  ]);

  const labels = [
    "users", "dealers", "markets", "items", "item_photos",
    "inquiries", "favorites", "booth_settings",
    "dealer_payment_methods", "buyer_market_follows",
    "notification_preferences", "sessions",
  ];

  console.log("\nSeed complete:");
  labels.forEach((label, i) => {
    console.log(`  ${label}: ${counts[i].rows[0].n}`);
  });

  console.log(`\nDev session tokens (30-day expiry):`);
  console.log(`  John (buyer):  ${johnSessionToken}`);
  console.log(`  Marco (dealer): ${marcoSessionToken}`);
  console.log(`\nUse: curl -H "Authorization: Bearer <token>" http://localhost:3000/api/...`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
