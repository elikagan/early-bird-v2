import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const req = new Request("http://localhost/admin", {
    headers: Object.fromEntries(h.entries()),
  });
  const user = await getSession(req);
  if (!user || !isAdmin(user.phone)) {
    notFound();
  }
  return <>{children}</>;
}
