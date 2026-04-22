import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function SellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const req = new Request("http://localhost/sell", {
    headers: Object.fromEntries(h.entries()),
  });
  const user = await getSession(req);
  if (!user || !user.dealer_id) {
    notFound();
  }
  return <>{children}</>;
}
