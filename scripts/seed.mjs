import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hfvfmndjknxvhwrstkrg.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function id() { return nanoid(16); }

async function sql(query, params = []) {
  const { error } = await supabase.rpc("run_sql_mut", { query_text: query, params: params.map(p => p === null ? null : String(p)) });
  if (error) throw new Error(`SQL error: ${error.message}\nQuery: ${query}`);
}

async function seed() {
  // Clear existing data
  await sql(`TRUNCATE favorites, inquiries, item_photos, items, booth_settings, buyer_market_follows, notification_preferences, sessions, auth_tokens, dealer_payment_methods, dealers, markets, users CASCADE`);

  // IDs
  const johnId = id(), sarahId = id(), dannyId = id(), lilyId = id();
  const marcoUserId = id(), decoUserId = id(), avenueUserId = id(), lucilleUserId = id(), ruthUserId = id();
  const marcoId = id(), decoId = id(), avenueId = id(), lucilleId = id(), ruthId = id();
  const dtmId = id(), rbfId = id(), pccId = id();
  const credenzaId = id(), deskLampId = id(), armchairId = id(), kitchenTableId = id();
  const vaseId = id(), nestingTablesId = id(), floorLampId = id(), woodcutId = id();
  const rolltopId = id(), caneChairsId = id();

  // Users (buyers)
  for (const [uid, phone, first, last, display, dealer] of [
    [johnId, "+12135550134", "John", "Chen", "John C.", 0],
    [sarahId, "+13105550811", "Sarah", "Reeves", "Sarah R.", 0],
    [dannyId, "+18185552290", "Danny", "Torres", "Danny T.", 0],
    [lilyId, "+16265550447", "Lily", "Park", "Lily P.", 0],
    [marcoUserId, "+13235550188", "Marco", "Ferraro", "Marco F.", 1],
    [decoUserId, "+13235550299", "David", "Greenfield", "David G.", 1],
    [avenueUserId, "+12135550377", "Ana", "Bermudez", "Ana B.", 1],
    [lucilleUserId, "+16265550512", "Lucille", "Kim", "Lucille K.", 1],
    [ruthUserId, "+18185550633", "Ruth", "Hernandez", "Ruth H.", 1],
  ]) {
    await sql(
      `INSERT INTO users (id, phone, first_name, last_name, display_name, is_dealer) VALUES ($1,$2,$3,$4,$5,$6)`,
      [uid, phone, first, last, display, dealer]
    );
  }

  // Dealers
  for (const [did, uid, biz, ig, verified] of [
    [marcoId, marcoUserId, "Marco's Finds", "@marcosfinds", 1],
    [decoId, decoUserId, "Deco Garage", null, 1],
    [avenueId, avenueUserId, "Avenue B", null, 0],
    [lucilleId, lucilleUserId, "Lucille's Ceramics", null, 0],
    [ruthId, ruthUserId, "Ruth's House", null, 0],
  ]) {
    await sql(
      `INSERT INTO dealers (id, user_id, business_name, instagram_handle, verified) VALUES ($1,$2,$3,$4,$5)`,
      [did, uid, biz, ig, verified]
    );
  }

  // Dealer payment methods
  for (const [did, method, enabled] of [
    [marcoId,"cash",1],[marcoId,"venmo",1],[marcoId,"zelle",1],[marcoId,"apple_pay",0],[marcoId,"card",0],
    [decoId,"cash",1],[decoId,"venmo",1],
    [avenueId,"cash",1],[avenueId,"venmo",1],
    [lucilleId,"cash",1],[lucilleId,"venmo",1],
    [ruthId,"cash",1],[ruthId,"venmo",1],
  ]) {
    await sql(`INSERT INTO dealer_payment_methods (id,dealer_id,method,enabled) VALUES ($1,$2,$3,$4)`, [id(), did, method, enabled]);
  }

  // Markets — real dates, drops at 7pm PT the night before
  const dtmDrop  = "2026-04-26T02:00:00.000Z"; // Sat Apr 25 7pm PT
  const dtmStart = "2026-04-26T15:00:00.000Z"; // Sun Apr 26 8am PT
  const pccDrop  = "2026-05-03T02:00:00.000Z"; // Sat May 2  7pm PT
  const pccStart = "2026-05-03T15:00:00.000Z"; // Sun May 3  8am PT
  const rbfDrop  = "2026-05-10T02:00:00.000Z"; // Sat May 9  7pm PT
  const rbfStart = "2026-05-10T16:00:00.000Z"; // Sun May 10 9am PT

  for (const [mid, name, loc, drop, start, status] of [
    [dtmId, "Downtown Modernism", "Downtown LA", dtmDrop, dtmStart, "upcoming"],
    [rbfId, "Rose Bowl Flea", "Pasadena", rbfDrop, rbfStart, "upcoming"],
    [pccId, "PCC Flea", "Pasadena City College", pccDrop, pccStart, "upcoming"],
  ]) {
    await sql(`INSERT INTO markets (id,name,location,drop_at,starts_at,status) VALUES ($1,$2,$3,$4,$5,$6)`, [mid, name, loc, drop, start, status]);
  }

  // John follows all 3 markets
  for (const mid of [dtmId, rbfId, pccId]) {
    await sql(`INSERT INTO buyer_market_follows (id,buyer_id,market_id,drop_alerts_enabled) VALUES ($1,$2,$3,$4)`, [id(), johnId, mid, 1]);
  }
  await sql(`INSERT INTO buyer_market_follows (id,buyer_id,market_id,drop_alerts_enabled) VALUES ($1,$2,$3,$4)`, [id(), sarahId, dtmId, 1]);

  // Notification prefs
  for (const [uid, key, enabled] of [
    [johnId,"drop_alerts",1],[johnId,"price_drops",1],[johnId,"new_markets",0],
    [marcoUserId,"new_inquiries",1],[marcoUserId,"drop_reminders",1],[marcoUserId,"watcher_milestones",0],
  ]) {
    await sql(`INSERT INTO notification_preferences (id,user_id,key,enabled) VALUES ($1,$2,$3,$4)`, [id(), uid, key, enabled]);
  }

  // Booth settings
  for (const [did, mid, booth] of [
    [marcoId, dtmId, "42"], [decoId, dtmId, "18"], [avenueId, dtmId, "7"],
    [lucilleId, dtmId, "31"], [ruthId, dtmId, "55"],
  ]) {
    await sql(`INSERT INTO booth_settings (id,dealer_id,market_id,booth_number) VALUES ($1,$2,$3,$4)`, [id(), did, mid, booth]);
  }

  // Items
  const itemRows = [
    [credenzaId, marcoId, dtmId, "Walnut Credenza", "Low 4-drawer walnut credenza, circa 1962. Tapered legs, original brass pulls.", 45000, null, 1, "live", null, null],
    [deskLampId, decoId, dtmId, "Brass Desk Lamp", "Adjustable brass desk lamp, 1970s. Fully rewired with fabric cord.", 18000, 25000, 0, "hold", johnId, null],
    [armchairId, avenueId, dtmId, "Vintage Leather Armchair", "Mid-century leather club chair. Cognac leather, solid walnut frame.", 32500, null, 0, "live", null, null],
    [kitchenTableId, ruthId, dtmId, "Enamel Kitchen Table", "White enamel-top kitchen table, 1940s. Chrome legs.", 14000, null, 0, "sold", null, lilyId],
    [vaseId, lucilleId, dtmId, "Cobalt Studio Vase", "Handthrown stoneware vase in deep cobalt glaze. Signed on base. 9\" tall.", 8500, null, 0, "live", null, null],
    [nestingTablesId, marcoId, dtmId, "Teak Nesting Tables", "Set of 3 Danish teak nesting tables, 1960s.", 22000, null, 0, "hold", johnId, null],
    [floorLampId, decoId, dtmId, "Chrome Floor Lamp", "Chrome arc floor lamp with marble base. Rewired. 72\" tall.", 27500, 34000, 0, "live", null, null],
    [woodcutId, avenueId, dtmId, "Signed Woodcut Print", "Hand-pulled woodcut on washi paper, signed and numbered 12/50.", 9500, null, 0, "live", null, null],
    [rolltopId, marcoId, dtmId, "Oak Rolltop Desk", "Quarter-sawn oak rolltop desk, c. 1910. All compartments intact.", 62500, null, 0, "live", null, null],
    [caneChairsId, marcoId, dtmId, "Pair of Cane Chairs", "Matched pair of cane-seat dining chairs. Beechwood frame.", 18000, 24000, 0, "live", null, null],
  ];
  for (const [iid, did, mid, title, desc, price, origPrice, firm, status, heldFor, soldTo] of itemRows) {
    await sql(
      `INSERT INTO items (id,dealer_id,market_id,title,description,price,original_price,price_firm,status,held_for,sold_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [iid, did, mid, title, desc, price, origPrice, firm, status, heldFor, soldTo]
    );
  }

  // Photos
  const photos = [
    [credenzaId, "https://picsum.photos/seed/eb-walnut-credenza/600/600", 0],
    [credenzaId, "https://picsum.photos/seed/eb-walnut-credenza-2/600/600", 1],
    [deskLampId, "https://picsum.photos/seed/eb-brass-desk-lamp/600/600", 0],
    [armchairId, "https://picsum.photos/seed/eb-leather-armchair/600/600", 0],
    [kitchenTableId, "https://picsum.photos/seed/eb-enamel-kitchen-table/600/600", 0],
    [vaseId, "https://picsum.photos/seed/eb-cobalt-studio-vase/600/600", 0],
    [nestingTablesId, "https://picsum.photos/seed/eb-teak-nesting-tables/600/600", 0],
    [floorLampId, "https://picsum.photos/seed/eb-chrome-floor-lamp/600/600", 0],
    [woodcutId, "https://picsum.photos/seed/eb-signed-woodcut-print/600/600", 0],
    [rolltopId, "https://picsum.photos/seed/eb-oak-rolltop-desk/600/600", 0],
    [caneChairsId, "https://picsum.photos/seed/eb-cane-chairs/600/600", 0],
  ];
  for (const [itemId, url, pos] of photos) {
    await sql(`INSERT INTO item_photos (id,item_id,url,position) VALUES ($1,$2,$3,$4)`, [id(), itemId, url, pos]);
  }

  // Inquiries
  for (const [itemId, buyerId, msg, status] of [
    [credenzaId, johnId, "Love the credenza — is the veneer chip visible from 3 feet? Coming at 6am.", "open"],
    [credenzaId, sarahId, "Beautiful piece. Would you take $400 cash? Can pick up same day.", "open"],
    [credenzaId, dannyId, "Interior designer here. If still available Saturday morning I'm taking it.", "open"],
    [deskLampId, johnId, "Love the brass — is the wiring solid? Could swing by Saturday morning.", "open"],
    [armchairId, johnId, "How's the leather holding up? Any cracks on the seat or arms?", "open"],
  ]) {
    await sql(`INSERT INTO inquiries (id,item_id,buyer_id,message,status) VALUES ($1,$2,$3,$4,$5)`, [id(), itemId, buyerId, msg, status]);
  }

  // Favorites
  for (const itemId of [deskLampId, credenzaId, nestingTablesId, vaseId, kitchenTableId, floorLampId]) {
    await sql(`INSERT INTO favorites (id,buyer_id,item_id) VALUES ($1,$2,$3)`, [id(), johnId, itemId]);
  }

  // Sessions
  const johnToken = "dev-session-john-" + id();
  const marcoToken = "dev-session-marco-" + id();
  const expiry = new Date(Date.now() + 30*24*60*60*1000).toISOString();

  await sql(`INSERT INTO sessions (id,user_id,token,expires_at) VALUES ($1,$2,$3,$4)`, [id(), johnId, johnToken, expiry]);
  await sql(`INSERT INTO sessions (id,user_id,token,expires_at) VALUES ($1,$2,$3,$4)`, [id(), marcoUserId, marcoToken, expiry]);

  console.log("\nSeed complete!");
  console.log(`  John (buyer):  ${johnToken}`);
  console.log(`  Marco (dealer): ${marcoToken}`);
}

seed().catch(e => { console.error("Seed failed:", e); process.exit(1); });
