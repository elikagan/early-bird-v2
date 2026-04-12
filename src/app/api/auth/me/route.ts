import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

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
  });
}
