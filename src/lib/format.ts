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

export function heroCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "NOW";
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  return `${String(d).padStart(2, "0")}D ${String(h).padStart(2, "0")}H ${String(m).padStart(2, "0")}M`;
}

// Eyebrow for a market listed on the home / browse surfaces. "Open now" was
// previously hardcoded, which lied next to a future date. This returns the
// accurate state: the physical show is "Open now" only when starts_at is
// within a day, otherwise buyers are pre-shopping online.
export function marketEyebrow(startsAtIso: string): string {
  const msUntilStart = new Date(startsAtIso).getTime() - Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (msUntilStart < ONE_DAY_MS) return "Open now";
  return "Pre-shopping now";
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
