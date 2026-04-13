# Early Bird — Design System

Canonical reference for all visual design decisions. Every screen in the app derives from these tokens and components. When in doubt, this file wins.

Rollback tag: `pre-reskin` (everything before the visual redesign)

## Design Direction

"Classifieds" — newspaper-classified energy with a warm accent. Monospace everywhere. Photos are the star. DIY Craigslist, not a design portfolio. Functional density with pops of delight.

Live mockups: https://eb-designs.vercel.app
Mockup source: `/tmp/eb-designs/` (5 HTML files)

---

## Color Tokens

### Core
| Token | Value | Use |
|-------|-------|-----|
| `--black` | `#1a1a1a` | Headings, borders, primary text |
| `--text` | `#2a2a2a` | Body text |
| `--muted` | `#888888` | Secondary text, labels, meta |
| `--light` | `#bbbbbb` | Placeholders, disabled |
| `--border` | `#e0e0e0` | Dividers, card borders |
| `--bg` | `#FAFAF6` | Page background (warm off-white) |
| `--white` | `#ffffff` | Inputs, overlays |

### Accent (Pop)
| Token | Value | Use |
|-------|-------|-----|
| `--pop` | `#D64000` | CTAs, LIVE badge, price drops, held prices |
| `--pop-bg` | `#FEF7F2` | Drop box background, subtle highlight |
| `--pop-light` | `#FFF0E8` | NEW tag background |

### Semantic
| Token | Value | Use |
|-------|-------|-----|
| `--green` | `#22C55E` | Available, on hold (positive) |
| `--amber` | `#EAB308` | Competition, warning |
| `--red` | `#DC2626` | Sold, error |

---

## Typography

**Font:** JetBrains Mono — everything. No exceptions. It's the brand.

### Scale (7 sizes)
| Name | Size | Weight | Use |
|------|------|--------|-----|
| `hero` | 32px | 700 | Landing headline only |
| `display` | 24px | 700 | Market name, item price (detail) |
| `title` | 15–16px | 700 | Masthead, card titles (detail view) |
| `body` | 13px | 400–500 | Descriptions, form inputs, buttons |
| `caption` | 12px | 400–700 | Grid titles, nav items, drop bar |
| `meta` | 10–11px | 400–500 | Section labels, dealer info, dates |
| `micro` | 8–9px | 700 | Tags, badges, dealer names in grids |

### Letter Spacing
- Uppercase labels: `0.08–0.1em`
- Buttons: `0.04em`
- Body: `0` (default)

---

## Spacing

4px base. Use multiples: 4, 8, 12, 16, 20, 24, 32, 48.

| Context | Value |
|---------|-------|
| Grid gap | 12px |
| Grid padding (sides) | 12px |
| Section padding (sides) | 20px |
| Card body padding | 8px 10px 10px |
| Bottom nav height | 56px (padding: 14px 20px) |
| Masthead padding | 16px 20px 12px |

---

## Layout

- `max-width: 430px` on body, centered
- `padding-bottom: 56px` for fixed bottom nav
- No phone frames, no outer padding — full-bleed on mobile
- Background: `--bg` (#FAFAF6)

---

## Components

### Masthead
- "EARLY BIRD" — 15px, 700, letter-spacing 0.08em
- Subtitle below — 10px, muted
- 2px solid black border-bottom

### Drop Bar
- Full-width, black background, white text
- "Drop is LIVE" with pop-colored "LIVE"
- Countdown right-aligned, bold

### Section Label
- 10px, uppercase, letter-spacing 0.1em, muted
- Optional right-side count

### 2-Column Grid Card
- Square photo (1:1 aspect ratio)
- Below photo: title (12px bold) → price (13px bold) → dealer face (18px circle) + name (9px muted)
- 12px gap between cards, 12px side padding
- 1px border separator between cells (optional — currently using gap only)

### Tags
- **FIRM**: 8px, bold, uppercase, 1.5px solid black border
- **% Drop**: 8px, bold, pop color + border, -1.5deg rotation
- **NEW**: 8px, bold, pop color, pop-light background pill

### Status Dot + Text
- 6px circle (green/amber/red) + 10px muted text
- Placed below dealer row in grid cards
- Only show when status is notable (not "available" — that's the default)

### Sold State
- Photo: 40% opacity + grayscale
- Title + price: strikethrough, muted color

### Dealer Avatar
- Grid: 18px circle
- Detail/market: 32–40px circle
- Initials fallback: black bg, white text, centered

### Bottom Nav
- Fixed, 3 tabs (Buy · Watching · Account), dealers get Sell
- Active: bold black, inactive: muted
- 5px pop-colored dot on active tab

### CTA Button
- Full-width, pop background, white text
- 14px padding, 700 weight, letter-spacing 0.04em
- Example: "I'M INTERESTED →"

### Form Input
- Full-width, 14px padding, 2px solid black border
- White background, 16px font
- Placeholder: light color

### Form Button (Primary)
- Full-width, black background, white text
- 14px bold, letter-spacing 0.04em

### Drop Box (Market Detail)
- 2px solid pop border, pop-bg background
- Countdown timer right-aligned, 20px bold pop
- Label + sub-label on left

### Stats Bar (Market Detail)
- 3 columns, flex
- Number: 26px bold, label: 9px muted uppercase

### Empty State
- Centered, icon (28px muted), paragraph (12px muted), link (12px pop bold)

---

## Screens → Components Map

| Screen | Key Components |
|--------|---------------|
| Landing | Masthead, hero (32px heading), form input + button, market list |
| Onboarding | Masthead, form fields, selfie capture area |
| Home (buyer) | Masthead, market cards with countdowns, drop boxes |
| Buy feed | Masthead, drop bar, section label, 2-col grid, bottom nav |
| Item detail (buyer) | Back link, full photo, dots, title+price+tag, description, dealer card, CTA, bottom nav |
| Item detail (dealer own) | Same photo/info, inquiry cards (buyer face + message + hold/sell buttons) |
| Watching | Masthead, section label, 2-col grid with status dots, empty state, bottom nav |
| Sell/booth | Masthead, countdown, item list with inquiry counts, status tabs |
| Add item | Photo upload grid, form fields, price toggle (firm) |
| Account (buyer) | Profile section, market follows, notification prefs |
| Account (dealer) | Business info, payment method checkboxes, Instagram handle |

---

## Tailwind Mapping

These tokens map to `tailwind.config.js` `theme.extend`:

```js
colors: {
  eb: {
    black: '#1a1a1a',
    text: '#2a2a2a',
    muted: '#888888',
    light: '#bbbbbb',
    border: '#e0e0e0',
    bg: '#FAFAF6',
    white: '#ffffff',
    pop: '#D64000',
    'pop-bg': '#FEF7F2',
    'pop-light': '#FFF0E8',
    green: '#22C55E',
    amber: '#EAB308',
    red: '#DC2626',
  }
}
```

Use as: `text-eb-pop`, `bg-eb-bg`, `border-eb-border`, etc.
