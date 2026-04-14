import db from "@/lib/db";
import { json, error } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const marketId = url.searchParams.get("market_id");

  // Get dealer profile
  const dealerResult = await db.execute({
    sql: `
      SELECT
        d.id,
        d.business_name,
        d.instagram_handle,
        u.display_name,
        u.avatar_url,
        u.first_name
      FROM dealers d
      JOIN users u ON u.id = d.user_id
      WHERE d.id = ?
    `,
    args: [id],
  });

  if (dealerResult.rows.length === 0) {
    return error("Dealer not found", 404);
  }

  const dealer = dealerResult.rows[0];

  // Get payment methods
  const pmResult = await db.execute({
    sql: `SELECT method, enabled FROM dealer_payment_methods WHERE dealer_id = ?`,
    args: [id],
  });

  // Get booth number if market specified
  let boothNumber: string | null = null;
  if (marketId) {
    const boothResult = await db.execute({
      sql: `SELECT booth_number FROM booth_settings WHERE dealer_id = ? AND market_id = ?`,
      args: [id, marketId],
    });
    if (boothResult.rows.length > 0) {
      boothNumber = boothResult.rows[0].booth_number as string | null;
    }
  }

  // Get item count per market for this dealer
  let itemCount = 0;
  if (marketId) {
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM items WHERE dealer_id = ? AND market_id = ? AND status != 'deleted'`,
      args: [id, marketId],
    });
    itemCount = Number(countResult.rows[0].count) || 0;
  }

  return json({
    id: dealer.id,
    business_name: dealer.business_name,
    instagram_handle: dealer.instagram_handle,
    display_name: dealer.display_name,
    avatar_url: dealer.avatar_url,
    first_name: dealer.first_name,
    payment_methods: pmResult.rows.filter((r) => r.enabled === 1).map((r) => r.method),
    booth_number: boothNumber,
    item_count: itemCount,
  });
}
