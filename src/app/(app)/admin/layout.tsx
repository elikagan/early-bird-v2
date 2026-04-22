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
  return (
    <>
      {/* Break out of the site-wide 430px body cap so admin can use
          the full desktop viewport. Mobile is unaffected (body cap
          never binds below 430px). */}
      <style>{`
        body {
          max-width: none !important;
          padding-bottom: 0 !important;
        }
      `}</style>
      {children}
    </>
  );
}
