import { redirect } from "next/navigation";

/**
 * /home is now an alias for /. Kept around so old bookmarks +
 * external links don't 404. permanentRedirect = HTTP 308 so search
 * engines update too.
 */
export default function HomeRedirect() {
  redirect("/");
}
