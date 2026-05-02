export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .replace(/['']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && w.toLowerCase() !== "s")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatPrice(cents: number): string {
  return `$${Math.floor(cents / 100).toLocaleString()}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Short numeric "M.D" (e.g. "4.26"), pinned to LA time since these
// are LA flea markets and we never want a traveling user to see a
// different day than what's on the event.
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", {
    month: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const day = d.toLocaleString("en-US", {
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
  return `${month}.${day}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function daysUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * Calendar-day diff label for market "Coming up" rows. The drop-era
 * "Opens" framing is gone — the catalog is always open. We just
 * tell the buyer when the physical show is.
 *
 * "TODAY" / "TOMORROW" / "IN 3 DAYS" / "IN 11 DAYS"
 */
export function daysUntilShort(iso: string): string {
  const now = new Date();
  const start = new Date(iso);
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const days = Math.round((startDay - nowDay) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
