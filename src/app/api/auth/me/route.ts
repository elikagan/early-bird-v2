import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  // Early-access grants — cheap lookup, included so /buy and item
  // pages can bypass the pre-drop countdown without a second round-trip.
  const grants = await db.execute({
    sql: `SELECT market_id FROM buyer_market_early_access WHERE user_id = ?`,
    args: [user.id],
  });
  const earlyAccessMarketIds = grants.rows.map((r) => r.market_id as string);

  return json({
    id: user.id,
    phone: user.phone,
    first_name: user.first_name,
    last_name: user.last_name,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    is_dealer: user.is_dealer,
    dealer_id: user.dealer_id,
    business_name: user.business_name,
    instagram_handle: user.instagram_handle,
    early_access_market_ids: earlyAccessMarketIds,
  });
}
