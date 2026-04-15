# Leave Planner — Vercel KV Backend + UI Redesign

**Date:** 2026-04-15  
**Status:** Approved

---

## Problem

The app is deployed on GitHub Pages as a fully client-side SPA using `localStorage` for persistence. Because `localStorage` is per-browser, colleagues on different devices cannot share data — each user sees only their own entries.

---

## Solution Overview

1. Deploy to Vercel and add a serverless API layer backed by Vercel KV (Redis).
2. Replace all `localStorage` reads/writes with API calls, keeping the same data shape.
3. Redesign the UI with a warm, friendly aesthetic.

---

## Part 1: Backend — Vercel + KV

### Deployment

- Connect the GitHub repo to Vercel. Vercel auto-deploys on every push to `main`.
- Remove GitHub Pages configuration (if any `gh-pages` scripts exist in `package.json`).

### Vercel KV

- Provision a Vercel KV store from the Vercel dashboard (free tier, powered by Upstash Redis).
- Three top-level keys mirror the current localStorage structure:
  - `lp_leaves` → JSON array of leave objects
  - `lp_profiles` → JSON array of profile objects
  - `lp_settings` → JSON object (countries, year)

### API Routes (`/api` directory at project root)

Vercel automatically serves files in `/api` as serverless functions.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leaves` | Return all leaves |
| POST | `/api/leaves` | Save entire leaves array (replace) |
| GET | `/api/profiles` | Return all profiles |
| POST | `/api/profiles` | Save entire profiles array (replace) |
| GET | `/api/settings` | Return settings object |
| POST | `/api/settings` | Save settings object |

Each function uses `@vercel/kv` to read/write from KV. The "save" operations replace the full array (matching the current localStorage pattern — no partial updates needed).

### Frontend Changes

- Replace `store.js` localStorage helpers with `async` functions that `fetch()` the API endpoints.
- `App.jsx` switches from synchronous `useState(getLeaves())` initialization to a `useEffect` that fetches all data on mount (leaves, profiles, settings).
- Add a top-level loading state in `App.jsx` — show a friendly spinner while initial data loads.
- All `onSave` / `refresh` callbacks remain structurally the same, but now `await` the API calls.
- Holiday caching stays in `localStorage` (it's public data from Nager API, fine to cache per-browser).
- Auth stays unchanged: shared password, SHA-256, sessionStorage flag.

### Error Handling

- API errors surface as a dismissible toast/banner: "Could not save changes — please try again."
- No offline support in scope.

---

## Part 2: UI Redesign — Warm & Friendly

### Design Principles

- Warm teal/sage primary, amber accent, soft warm grays for backgrounds
- Rounded corners throughout (`rounded-2xl` for cards, `rounded-full` for pills/badges)
- Generous padding and whitespace
- Soft warm shadows (`shadow-sm` with warm tint) instead of hard borders
- Friendly, approachable tone in labels and empty states

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#0d9488` (teal-600) | Nav active, buttons, links |
| Primary light | `#f0fdfa` (teal-50) | Active nav bg, card accents |
| Accent | `#f59e0b` (amber-500) | Warnings, highlights |
| Surface | `#fafaf9` (stone-50) | Page background |
| Card | `#ffffff` | Card background |
| Text primary | `#1c1917` (stone-900) | Headings |
| Text secondary | `#78716c` (stone-500) | Subtitles, meta |

### Leave Type Colors (refreshed, softer)

| Type | Color |
|------|-------|
| Annual | `#06b6d4` (cyan-500) |
| Sick | `#f87171` (red-400) |
| Teleworking | `#34d399` (emerald-400) |
| Unpaid | `#fbbf24` (amber-400) |
| Parental | `#a78bfa` (violet-400) |

### Component-by-Component Changes

**Nav**
- Warm white background with a soft bottom shadow
- Logo: leaf emoji + "Leave Planner" in teal
- Nav links use pill-shaped active state (teal-50 bg, teal-700 text)
- Logout button styled as a ghost button with hover state

**Login Page**
- Warm gradient background (stone-100 → teal-50)
- Centered card with rounded-2xl, soft shadow
- Friendly tagline: "Plan time off together"
- Teal submit button

**Dashboard**
- Friendly greeting at the top: "Hello, team!" with current date
- Balance cards: colorful left-border accent per leave type, rounded-2xl
- Upcoming leaves: timeline chip list (avatar initial + name + dates) instead of a table
- Overlap warnings: amber banner with icon, dismissible
- Holidays: small pill badges

**Calendar View**
- Warmer page background
- FullCalendar events: rounded pill style, softer colors
- Header controls use teal buttons

**Gantt View**
- Alternating warm-gray row backgrounds for readability
- Leave bars: rounded ends, softer colors matching the new palette
- Profile name column: avatar initial circle in teal

**Leave Form**
- Section cards with rounded-2xl grouping related fields
- Clearer visual hierarchy: label above input, helper text below
- Working days count shown as a friendly badge
- Balance warning shown as an amber inline alert

**Profile Page**
- Profile cards in a grid (not a table), each with avatar initial, name, and balance chips
- Add profile: inline expandable form instead of a modal

**Settings Page**
- Country selector: pill-based multi-select with checkmarks
- Clean section headers

**Empty States**
- Friendly copy: "No leaves yet — enjoy the calm!", "No profiles yet — add your team members"
- Subtle icon above the message

### Loading State

- Full-page centered spinner on initial data load (teal spinner on warm background)
- Inline button spinner on save actions ("Saving…")

---

## Out of Scope

- Real-time sync (polling or websockets)
- Per-user auth (individual accounts)
- Offline support
- Role-based permissions
- Mobile-native layout (responsive is fine, native is not required)

---

## Success Criteria

- All colleagues can see each other's leave entries after navigating to the Vercel URL
- Data persists across logout/login cycles for all users
- The app loads within 2 seconds on a standard connection
- The UI feels visually distinct and warmer than before
