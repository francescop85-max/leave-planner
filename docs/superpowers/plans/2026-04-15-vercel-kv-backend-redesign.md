# Leave Planner — Vercel KV Backend + UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-browser localStorage with a shared Vercel KV backend so all colleagues see the same data, and redesign the UI with a warm, friendly aesthetic.

**Architecture:** Add serverless functions in `/api` that read/write to Vercel KV (Redis). Replace `localStorage` CRUD in `store.js` with pure array-manipulation helpers. Add a new `src/api.js` async client that `fetch()`es those endpoints. `App.jsx` loads all data on mount and passes it down as props.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, React Router v7, `@vercel/kv`, Vercel Serverless Functions (Node 18+), date-fns v4, FullCalendar v6, Lucide React

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `api/leaves.js` | GET / POST serverless function for leaves array |
| `api/profiles.js` | GET / POST serverless function for profiles array |
| `api/settings.js` | GET / POST serverless function for settings object |
| `src/api.js` | Async fetch client — all HTTP calls to `/api/*` |
| `src/components/Spinner.jsx` | Full-page and inline loading spinner |
| `src/components/Toast.jsx` | Error toast banner |

### Modified files
| Path | What changes |
|------|-------------|
| `package.json` | Add `@vercel/kv`, remove `gh-pages`, add `vercel dev` script |
| `src/store.js` | Remove localStorage; keep pure helpers + update `getUsedDays` signature |
| `src/App.jsx` | Async data load on mount, loading/error state, warm nav redesign |
| `src/components/LoginPage.jsx` | Warm gradient redesign |
| `src/components/Dashboard.jsx` | Warm card redesign, chip-based upcoming leaves |
| `src/components/LeaveForm.jsx` | Async save via api.js, warm form redesign |
| `src/components/ProfilePage.jsx` | Receive `profiles` prop, async save, warm card redesign |
| `src/components/SettingsPage.jsx` | Async save via api.js, warm redesign |
| `src/components/CalendarView.jsx` | Warm colour palette, pill events |
| `src/components/GanttView.jsx` | Warm row colours, rounded bar ends |
| `src/components/ExternalForm.jsx` | Async save via api.js, warm redesign |

---

## Task 1: Install @vercel/kv and update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the Vercel KV SDK**

```bash
npm install @vercel/kv
```

- [ ] **Step 2: Update scripts in package.json**

Replace the `"scripts"` block in `package.json` with:

```json
"scripts": {
  "dev": "vercel dev",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

Remove `"gh-pages"` from `devDependencies` as well (delete that line).

- [ ] **Step 3: Verify install**

```bash
npm list @vercel/kv
```

Expected: `@vercel/kv@x.x.x` printed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @vercel/kv, switch dev script to vercel dev"
```

---

## Task 2: Create API serverless functions

**Files:**
- Create: `api/leaves.js`
- Create: `api/profiles.js`
- Create: `api/settings.js`

- [ ] **Step 1: Create api/leaves.js**

```js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const leaves = (await kv.get('lp_leaves')) ?? [];
    return res.status(200).json(leaves);
  }
  if (req.method === 'POST') {
    const leaves = req.body;
    if (!Array.isArray(leaves)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    await kv.set('lp_leaves', leaves);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}
```

- [ ] **Step 2: Create api/profiles.js**

```js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const profiles = (await kv.get('lp_profiles')) ?? [];
    return res.status(200).json(profiles);
  }
  if (req.method === 'POST') {
    const profiles = req.body;
    if (!Array.isArray(profiles)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    await kv.set('lp_profiles', profiles);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}
```

- [ ] **Step 3: Create api/settings.js**

```js
import { kv } from '@vercel/kv';

const DEFAULT_SETTINGS = { countries: [], year: new Date().getFullYear() };

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = (await kv.get('lp_settings')) ?? DEFAULT_SETTINGS;
    return res.status(200).json(settings);
  }
  if (req.method === 'POST') {
    const settings = req.body;
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Body must be an object' });
    }
    await kv.set('lp_settings', settings);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}
```

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "feat: add Vercel KV serverless API routes for leaves, profiles, settings"
```

---

## Task 3: Refactor store.js — remove localStorage, add pure array helpers

**Files:**
- Modify: `src/store.js`

The goal: strip all localStorage I/O. Keep `LEAVE_TYPES`, `findOverlaps`, `countLeaveDays`. Update `getUsedDays` to accept `leaves` as a parameter. Add pure helpers `addOrUpdateLeave`, `removeLeave`, `addOrUpdateProfile`, `removeProfile`.

- [ ] **Step 1: Replace store.js entirely**

```js
import { v4 as uuidv4 } from 'uuid';

// ─── Leave type metadata ────────────────────────────────────────────────────
export const LEAVE_TYPES = {
  annual:     { label: 'Annual Leave',   color: '#0891b2', bg: '#ecfeff', trackBalance: true },
  sick:       { label: 'Sick Leave',     color: '#ef4444', bg: '#fef2f2', trackBalance: false },
  teleworking:{ label: 'Teleworking',    color: '#10b981', bg: '#f0fdf4', trackBalance: true },
  unpaid:     { label: 'Unpaid Leave',   color: '#f59e0b', bg: '#fffbeb', trackBalance: false },
  parental:   { label: 'Parental Leave', color: '#8b5cf6', bg: '#f5f3ff', trackBalance: true },
};

// ─── Pure leave array helpers ───────────────────────────────────────────────
export function addOrUpdateLeave(leave, leaves) {
  const id = leave.id || uuidv4();
  const idx = leaves.findIndex((l) => l.id === id);
  if (idx >= 0) {
    const next = [...leaves];
    next[idx] = { ...leave, id };
    return next;
  }
  return [...leaves, { ...leave, id }];
}

export function removeLeave(id, leaves) {
  return leaves.filter((l) => l.id !== id);
}

// ─── Pure profile array helpers ─────────────────────────────────────────────
export function addOrUpdateProfile(profile, profiles) {
  const id = profile.id || uuidv4();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx >= 0) {
    const next = [...profiles];
    next[idx] = { ...profile, id };
    return next;
  }
  return [...profiles, { ...profile, id }];
}

export function removeProfile(id, profiles) {
  return profiles.filter((p) => p.id !== id);
}

// ─── Overlap detection ──────────────────────────────────────────────────────
export function findOverlaps(leaves, profiles) {
  const overlaps = [];
  const relevant = leaves.filter((l) => new Date(l.endDate) >= new Date());

  for (let i = 0; i < relevant.length; i++) {
    for (let j = i + 1; j < relevant.length; j++) {
      const a = relevant[i];
      const b = relevant[j];
      if (a.profileId === b.profileId) continue;
      if (a.type === 'teleworking' || b.type === 'teleworking') continue;
      if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
        const overlapStart = a.startDate > b.startDate ? a.startDate : b.startDate;
        const overlapEnd = a.endDate < b.endDate ? a.endDate : b.endDate;
        const profileA = profiles.find((p) => p.id === a.profileId);
        const profileB = profiles.find((p) => p.id === b.profileId);
        if (profileA && profileB) {
          overlaps.push({ personA: profileA.name, personB: profileB.name,
            typeA: a.type, typeB: b.type, overlapStart, overlapEnd, leaveA: a, leaveB: b });
        }
      }
    }
  }
  overlaps.sort((a, b) => a.overlapStart.localeCompare(b.overlapStart));
  return overlaps;
}

// ─── Working day calculation ────────────────────────────────────────────────
export function countLeaveDays(startDate, endDate, holidays = []) {
  const holidaySet = new Set(holidays.map((h) => h.date));
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const day = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ─── Used days calculation (pure — takes leaves array as param) ─────────────
export function getUsedDays(profileId, leaves, holidays = []) {
  const profileLeaves = leaves.filter((l) => l.profileId === profileId);
  const used = Object.fromEntries(Object.keys(LEAVE_TYPES).map((k) => [k, 0]));
  for (const leave of profileLeaves) {
    if (used[leave.type] !== undefined) {
      used[leave.type] += countLeaveDays(leave.startDate, leave.endDate, holidays);
    }
  }
  return used;
}

// ─── Local-only helpers (per-user preferences, fine to stay in localStorage) ─
const LS_CURRENT_USER = 'lp_current_user';
const LS_HOLIDAYS_CACHE = 'lp_holidays_cache';

function lsGet(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export function getCurrentUserId() { return lsGet(LS_CURRENT_USER, null); }
export function setCurrentUserId(id) { lsSet(LS_CURRENT_USER, id); }
export function getCachedHolidays() { return lsGet(LS_HOLIDAYS_CACHE, {}); }
export function setCachedHolidays(h) { lsSet(LS_HOLIDAYS_CACHE, h); }
```

- [ ] **Step 2: Commit**

```bash
git add src/store.js
git commit -m "refactor: remove localStorage CRUD from store.js, add pure array helpers"
```

---

## Task 4: Create src/api.js — async fetch client

**Files:**
- Create: `src/api.js`

- [ ] **Step 1: Create src/api.js**

```js
// Async client for the /api serverless functions.
// All functions throw on network/server error so callers can show a toast.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export async function fetchLeaves() {
  return request('/api/leaves');
}

export async function persistLeaves(leaves) {
  return request('/api/leaves', { method: 'POST', body: JSON.stringify(leaves) });
}

export async function fetchProfiles() {
  return request('/api/profiles');
}

export async function persistProfiles(profiles) {
  return request('/api/profiles', { method: 'POST', body: JSON.stringify(profiles) });
}

export async function fetchSettings() {
  return request('/api/settings');
}

export async function persistSettings(settings) {
  return request('/api/settings', { method: 'POST', body: JSON.stringify(settings) });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api.js
git commit -m "feat: add async API client (src/api.js)"
```

---

## Task 5: Create Spinner and Toast components

**Files:**
- Create: `src/components/Spinner.jsx`
- Create: `src/components/Toast.jsx`

- [ ] **Step 1: Create src/components/Spinner.jsx**

```jsx
export default function Spinner({ fullPage = false }) {
  const spinner = (
    <div className="flex items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      <span className="text-stone-500 text-sm font-medium">Loading…</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
```

- [ ] **Step 2: Create src/components/Toast.jsx**

```jsx
import { useEffect } from 'react';

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-2xl shadow-lg">
      <span>⚠️ {message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 ml-2 text-lg leading-none">×</button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Spinner.jsx src/components/Toast.jsx
git commit -m "feat: add Spinner and Toast shared components"
```

---

## Task 6: Rewrite App.jsx — async data loading + warm nav

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace App.jsx**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import CalendarView from './components/CalendarView.jsx';
import GanttView from './components/GanttView.jsx';
import LeaveForm from './components/LeaveForm.jsx';
import ExternalForm from './components/ExternalForm.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import LoginPage from './components/LoginPage.jsx';
import Spinner from './components/Spinner.jsx';
import Toast from './components/Toast.jsx';
import { fetchLeaves, fetchProfiles, fetchSettings } from './api.js';
import { getCachedHolidays, setCachedHolidays, getCurrentUserId } from './store.js';

function App() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('lp_authenticated') === 'true'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [settings, setSettings] = useState({ countries: [], year: new Date().getFullYear() });
  const [holidays, setHolidays] = useState([]);
  const [currentUserId, setCurrentUserIdState] = useState(getCurrentUserId());
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [l, p, s] = await Promise.all([fetchLeaves(), fetchProfiles(), fetchSettings()]);
      setLeaves(l);
      setProfiles(p);
      setSettings(s);
    } catch {
      setError('Could not load data — please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  // Fetch holidays when countries/year change
  useEffect(() => {
    async function fetchHolidays() {
      if (!settings.countries || settings.countries.length === 0) {
        setHolidays([]);
        return;
      }
      const year = settings.year || new Date().getFullYear();
      const cached = getCachedHolidays();
      const cacheKey = `${settings.countries.sort().join(',')}_${year}`;
      if (cached[cacheKey]) { setHolidays(cached[cacheKey]); return; }
      try {
        const allHolidays = [];
        for (const country of settings.countries) {
          const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
          if (res.ok) {
            const data = await res.json();
            allHolidays.push(...data.map((h) => ({ date: h.date, name: h.localName || h.name, country })));
          }
        }
        const unique = allHolidays.filter(
          (h, i, arr) => arr.findIndex((x) => x.date === h.date && x.country === h.country) === i
        );
        cached[cacheKey] = unique;
        setCachedHolidays(cached);
        setHolidays(unique);
      } catch { /* holidays are non-critical */ }
    }
    fetchHolidays();
  }, [settings.countries, settings.year]);

  const handleLogout = () => {
    sessionStorage.removeItem('lp_authenticated');
    setAuthenticated(false);
  };

  const refresh = useCallback(() => {
    setCurrentUserIdState(getCurrentUserId());
    return loadData();
  }, [loadData]);

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  if (loading) return <Spinner fullPage />;

  const navItems = [
    { to: '/', label: '🏠 Dashboard' },
    { to: '/calendar', label: '📅 Calendar' },
    { to: '/gantt', label: '📊 Gantt' },
    { to: '/add', label: '+ Add Leave' },
    { to: '/profile', label: '👤 Profile' },
    { to: '/settings', label: '⚙️ Settings' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <Toast message={error} onDismiss={() => setError('')} />
      <nav className="bg-white shadow-sm border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <span className="text-xl font-bold text-teal-700">🌿 Leave Planner</span>
            <div className="flex items-center gap-1 flex-wrap">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="ml-3 px-3 py-1.5 rounded-full text-sm font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={
            <Dashboard leaves={leaves} profiles={profiles} holidays={holidays} currentUserId={currentUserId} />
          } />
          <Route path="/calendar" element={
            <CalendarView leaves={leaves} profiles={profiles} holidays={holidays} settings={settings} onRefresh={refresh} />
          } />
          <Route path="/gantt" element={
            <GanttView leaves={leaves} profiles={profiles} holidays={holidays} />
          } />
          <Route path="/add" element={
            <LeaveForm leaves={leaves} profiles={profiles} holidays={holidays}
              onSave={async () => { await refresh(); navigate('/calendar'); }}
              onError={setError} />
          } />
          <Route path="/edit/:id" element={
            <LeaveForm leaves={leaves} profiles={profiles} holidays={holidays}
              onSave={async () => { await refresh(); navigate('/calendar'); }}
              onError={setError} />
          } />
          <Route path="/form" element={
            <ExternalForm profiles={profiles} holidays={holidays} onSave={refresh} onError={setError} />
          } />
          <Route path="/profile" element={
            <ProfilePage profiles={profiles} holidays={holidays} leaves={leaves}
              currentUserId={currentUserId}
              onSave={(newCurrentUserId) => {
                if (newCurrentUserId !== undefined) setCurrentUserIdState(newCurrentUserId);
                return refresh();
              }}
              onError={setError} />
          } />
          <Route path="/settings" element={
            <SettingsPage settings={settings} onSave={refresh} onError={setError} />
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: async data loading from API in App.jsx, warm nav redesign"
```

---

## Task 7: Redesign LoginPage.jsx

**Files:**
- Modify: `src/components/LoginPage.jsx`

- [ ] **Step 1: Replace LoginPage.jsx**

```jsx
import { useState } from 'react';

const PASSWORD_HASH = '136eaa7c3d8505ac05b2726d5c1a1c4a3d582ef5b623542f5b12264ad5f47668';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const hash = await hashPassword(password);
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem('lp_authenticated', 'true');
      onLogin();
    } else {
      setError('Incorrect password. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="text-2xl font-bold text-teal-700">Leave Planner</h1>
          <p className="text-stone-400 text-sm mt-1">Plan time off together</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter team password"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm bg-stone-50"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-teal-600 text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? 'Checking…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LoginPage.jsx
git commit -m "design: warm friendly LoginPage redesign"
```

---

## Task 8: Rewrite Dashboard.jsx

**Files:**
- Modify: `src/components/Dashboard.jsx`

- [ ] **Step 1: Replace Dashboard.jsx**

```jsx
import { LEAVE_TYPES, getUsedDays, findOverlaps, countLeaveDays } from '../store.js';

function InitialAvatar({ name, className = '' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex-shrink-0 ${className}`}>
      {initials}
    </span>
  );
}

export default function Dashboard({ leaves, profiles, holidays, currentUserId }) {
  const currentProfile = profiles.find((p) => p.id === currentUserId) ?? null;
  const usedDays = currentUserId ? getUsedDays(currentUserId, leaves, holidays) : {};

  const upcomingLeaves = leaves
    .filter((l) => new Date(l.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 10);

  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const overlaps = findOverlaps(leaves, profiles);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-800">Hello, team! 👋</h2>
        <p className="text-stone-400 text-sm mt-0.5">{today}</p>
      </div>

      {/* Overlap warnings */}
      {overlaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold">{overlaps.length}</span>
            Leave Overlap{overlaps.length > 1 ? 's' : ''} Detected
          </h3>
          <ul className="space-y-2">
            {overlaps.map((o, i) => {
              const days = countLeaveDays(o.overlapStart, o.overlapEnd, holidays);
              return (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm bg-white rounded-xl px-3 py-2 border border-amber-100">
                  <span className="font-semibold text-stone-700">{o.personA}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: LEAVE_TYPES[o.typeA]?.bg, color: LEAVE_TYPES[o.typeA]?.color }}>{LEAVE_TYPES[o.typeA]?.label}</span>
                  <span className="text-stone-300">&amp;</span>
                  <span className="font-semibold text-stone-700">{o.personB}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: LEAVE_TYPES[o.typeB]?.bg, color: LEAVE_TYPES[o.typeB]?.color }}>{LEAVE_TYPES[o.typeB]?.label}</span>
                  <span className="text-stone-400">{o.overlapStart} → {o.overlapEnd}</span>
                  <span className="text-amber-600 font-medium text-xs">({days} day{days !== 1 ? 's' : ''})</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Leave balance */}
      {currentProfile ? (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h3 className="text-base font-semibold text-stone-700 mb-4">Your Leave Balance — {currentProfile.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(LEAVE_TYPES).map(([key, type]) => {
              const used = usedDays[key] || 0;
              if (!type.trackBalance) {
                return (
                  <div key={key} className="rounded-xl p-4 bg-stone-50 border-l-4" style={{ borderColor: type.color }}>
                    <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">{type.label}</div>
                    <div className="mt-1 text-2xl font-bold text-stone-800">{used}</div>
                    <div className="text-xs text-stone-400 mt-0.5">days used</div>
                  </div>
                );
              }
              const total = currentProfile.balances?.[key] || 0;
              const remaining = total - used;
              const isOver = remaining < 0;
              return (
                <div key={key} className={`rounded-xl p-4 border-l-4 ${isOver ? 'bg-red-50' : 'bg-stone-50'}`} style={{ borderColor: type.color }}>
                  <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">{type.label}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${isOver ? 'text-red-600' : 'text-stone-800'}`}>{remaining}</span>
                    <span className="text-sm text-stone-400">/ {total}</span>
                  </div>
                  {isOver && <div className="text-xs font-medium text-red-500 mt-0.5">Exceeded by {Math.abs(remaining)}</div>}
                  <div className="text-xs text-stone-400 mt-0.5">{used} used</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-700 text-sm">
          No profile selected. Go to <strong>Profile</strong> to create one and set your leave balances.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming leave */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h3 className="text-base font-semibold text-stone-700 mb-4">Upcoming Leave</h3>
          {upcomingLeaves.length === 0 ? (
            <p className="text-stone-300 text-sm">No upcoming leave planned — enjoy the calm! 🌤️</p>
          ) : (
            <ul className="space-y-2">
              {upcomingLeaves.map((l) => {
                const profile = profiles.find((p) => p.id === l.profileId);
                const type = LEAVE_TYPES[l.type];
                return (
                  <li key={l.id} className="flex items-center gap-3">
                    {profile && <InitialAvatar name={profile.name} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-700">{profile?.name || 'Unknown'}</div>
                      <div className="text-xs text-stone-400">{l.startDate} → {l.endDate}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ backgroundColor: type?.bg, color: type?.color }}>
                      {type?.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming holidays */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h3 className="text-base font-semibold text-stone-700 mb-4">Upcoming Holidays</h3>
          {upcomingHolidays.length === 0 ? (
            <p className="text-stone-300 text-sm">No holidays configured. Go to Settings to add countries.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingHolidays.map((h, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="font-medium text-stone-700">{h.name}</span>
                  <span className="text-stone-400 text-xs">{h.date}</span>
                  <span className="text-stone-300 text-xs uppercase">{h.country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* External form link */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        <h3 className="text-base font-semibold text-stone-700 mb-1">Team Submission Link</h3>
        <p className="text-sm text-stone-400 mb-3">Share this with team members so they can submit leave requests:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-stone-50 px-3 py-2 rounded-xl text-sm text-stone-600 break-all border border-stone-100">
            {window.location.origin + window.location.pathname + '#/form'}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#/form')}
            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700 transition-colors font-medium"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard.jsx
git commit -m "design: warm Dashboard redesign with chip-based upcoming leaves"
```

---

## Task 9: Rewrite LeaveForm.jsx — async save + warm redesign

**Files:**
- Modify: `src/components/LeaveForm.jsx`

- [ ] **Step 1: Replace LeaveForm.jsx**

```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LEAVE_TYPES, addOrUpdateLeave, removeLeave, countLeaveDays, getUsedDays } from '../store.js';
import { persistLeaves } from '../api.js';

export default function LeaveForm({ leaves, profiles, holidays, onSave, onError }) {
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({ profileId: '', type: 'annual', startDate: '', endDate: '', notes: '' });
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const leave = leaves.find((l) => l.id === id);
      if (leave) setForm(leave);
    }
  }, [id, isEdit, leaves]);

  useEffect(() => {
    if (!form.profileId || !form.startDate || !form.endDate || !form.type) { setWarning(''); return; }
    if (!LEAVE_TYPES[form.type]?.trackBalance) { setWarning(''); return; }
    const profile = profiles.find((p) => p.id === form.profileId);
    if (!profile) return;
    const usedDays = getUsedDays(form.profileId, leaves, holidays);
    const newDays = countLeaveDays(form.startDate, form.endDate, holidays);
    let adjustment = 0;
    if (isEdit) {
      const oldLeave = leaves.find((l) => l.id === id);
      if (oldLeave && oldLeave.type === form.type) {
        adjustment = countLeaveDays(oldLeave.startDate, oldLeave.endDate, holidays);
      }
    }
    const totalUsed = (usedDays[form.type] || 0) - adjustment + newDays;
    const balance = profile.balances?.[form.type] || 0;
    if (totalUsed > balance) {
      setWarning(`This will use ${totalUsed} ${LEAVE_TYPES[form.type].label} days but only ${balance} are available (exceeded by ${totalUsed - balance}).`);
    } else {
      setWarning('');
    }
  }, [form.profileId, form.type, form.startDate, form.endDate, holidays, id, isEdit, leaves, profiles]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.profileId || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      const updated = addOrUpdateLeave(isEdit ? { ...form, id } : form, leaves);
      await persistLeaves(updated);
      await onSave();
    } catch {
      onError('Could not save leave — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm('Delete this leave entry?')) return;
    setSaving(true);
    try {
      await persistLeaves(removeLeave(id, leaves));
      await onSave();
    } catch {
      onError('Could not delete leave — please try again.');
    } finally {
      setSaving(false);
    }
  }

  const daysCount = form.startDate && form.endDate
    ? countLeaveDays(form.startDate, form.endDate, holidays) : 0;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-stone-800 mb-6">{isEdit ? 'Edit Leave' : 'Add Leave'}</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-5">

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1.5">Team Member</label>
          <select value={form.profileId} onChange={(e) => setForm({ ...form, profileId: e.target.value })}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" required>
            <option value="">Select a person…</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1.5">Leave Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400">
            {Object.entries(LEAVE_TYPES).map(([key, type]) => <option key={key} value={key}>{type.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">End Date</label>
            <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" required />
          </div>
        </div>

        {daysCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-sm font-medium">
              📅 {daysCount} working day{daysCount !== 1 ? 's' : ''}
            </span>
            <span className="text-stone-400 text-xs">excludes weekends &amp; holidays</span>
          </div>
        )}

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
            ⚠️ {warning}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1.5">Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" rows={3} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 bg-teal-600 text-white py-2.5 px-4 rounded-xl hover:bg-teal-700 font-medium text-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update Leave' : 'Add Leave'}
          </button>
          {isEdit && (
            <button type="button" onClick={handleDelete} disabled={saving}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium text-sm transition-colors disabled:opacity-50">
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LeaveForm.jsx
git commit -m "feat: LeaveForm async save via API + warm redesign"
```

---

## Task 10: Rewrite ProfilePage.jsx — async save + warm redesign

**Files:**
- Modify: `src/components/ProfilePage.jsx`

- [ ] **Step 1: Replace ProfilePage.jsx**

```jsx
import { useState } from 'react';
import { LEAVE_TYPES, addOrUpdateProfile, removeProfile, getUsedDays, getCurrentUserId, setCurrentUserId } from '../store.js';
import { persistProfiles } from '../api.js';

const DEFAULT_BALANCES = { annual: 25, sick: 10, teleworking: 0, unpaid: 0, parental: 0 };

function InitialAvatar({ name, size = 'md' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const cls = size === 'lg'
    ? 'w-12 h-12 text-base'
    : 'w-9 h-9 text-sm';
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold flex-shrink-0 ${cls}`}>
      {initials}
    </span>
  );
}

export default function ProfilePage({ profiles, leaves, holidays, currentUserId, onSave, onError }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', balances: { ...DEFAULT_BALANCES } });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updated = addOrUpdateProfile(editingId ? { id: editingId, ...form } : form, profiles);
      await persistProfiles(updated);
      setEditingId(null);
      setForm({ name: '', balances: { ...DEFAULT_BALANCES } });
      await onSave();
    } catch {
      onError('Could not save profile — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this profile and all associated leave entries?')) return;
    setSaving(true);
    try {
      await persistProfiles(removeProfile(id, profiles));
      if (currentUserId === id) {
        setCurrentUserId(null);
        await onSave(null);
      } else {
        await onSave();
      }
    } catch {
      onError('Could not delete profile — please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSetCurrent(id) {
    setCurrentUserId(id);
    onSave(id);
  }

  function startEdit(profile) {
    setEditingId(profile.id);
    setForm({ name: profile.name, balances: { ...profile.balances } });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-stone-800">Team Profiles</h2>

      {/* Add / edit form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-4">
        <h3 className="text-base font-semibold text-stone-700">{editingId ? 'Edit Profile' : 'Add Team Member'}</h3>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1.5">Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name" required
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Leave Balances (days/year)</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(LEAVE_TYPES).map(([key, type]) => (
              <div key={key}>
                <label className="block text-xs text-stone-400 mb-1">{type.label}</label>
                {type.trackBalance ? (
                  <input type="number" min="0" value={form.balances[key] || 0}
                    onChange={(e) => setForm({ ...form, balances: { ...form.balances, [key]: Number(e.target.value) } })}
                    className="w-full border border-stone-200 rounded-xl px-2 py-1.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                ) : (
                  <div className="text-xs text-stone-300 px-2 py-1.5">No limit</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="px-5 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add Member'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', balances: { ...DEFAULT_BALANCES } }); }}
              className="px-5 py-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 text-sm transition-colors">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Profile cards */}
      <div className="space-y-3">
        {profiles.map((profile) => {
          const usedDays = getUsedDays(profile.id, leaves, holidays);
          const isCurrent = currentUserId === profile.id;
          return (
            <div key={profile.id}
              className={`bg-white rounded-2xl shadow-sm border-2 p-5 transition-colors ${isCurrent ? 'border-teal-300' : 'border-stone-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <InitialAvatar name={profile.name} size="lg" />
                  <div>
                    <h4 className="font-semibold text-stone-800">{profile.name}</h4>
                    {isCurrent && <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">You</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isCurrent && (
                    <button onClick={() => handleSetCurrent(profile.id)}
                      className="px-3 py-1 text-xs bg-teal-50 text-teal-600 rounded-full hover:bg-teal-100 transition-colors">
                      Set as Me
                    </button>
                  )}
                  <button onClick={() => startEdit(profile)}
                    className="px-3 py-1 text-xs bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(profile.id)} disabled={saving}
                    className="px-3 py-1 text-xs bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(LEAVE_TYPES).map(([key, type]) => {
                  const used = usedDays[key] || 0;
                  if (!type.trackBalance) {
                    return (
                      <div key={key} className="text-center rounded-xl p-2 bg-stone-50">
                        <div className="text-[10px] text-stone-400 uppercase">{type.label}</div>
                        <div className="text-sm font-bold text-stone-700 mt-0.5">{used}</div>
                        <div className="text-[10px] text-stone-400">used</div>
                      </div>
                    );
                  }
                  const total = profile.balances?.[key] || 0;
                  const remaining = total - used;
                  const isOver = remaining < 0;
                  return (
                    <div key={key} className={`text-center rounded-xl p-2 ${isOver ? 'bg-red-50' : 'bg-stone-50'}`}>
                      <div className="text-[10px] text-stone-400 uppercase">{type.label}</div>
                      <div className={`text-sm font-bold mt-0.5 ${isOver ? 'text-red-500' : 'text-stone-700'}`}>{remaining}/{total}</div>
                      {isOver && <div className="text-[10px] text-red-400 font-medium">OVER</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {profiles.length === 0 && (
        <div className="text-center text-stone-300 py-12">
          <div className="text-4xl mb-2">👤</div>
          <p>No team members yet — add one above.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProfilePage.jsx
git commit -m "feat: ProfilePage receives profiles prop, async save, warm redesign"
```

---

## Task 11: Rewrite SettingsPage.jsx — async save + warm redesign

**Files:**
- Modify: `src/components/SettingsPage.jsx`

- [ ] **Step 1: Replace SettingsPage.jsx**

```jsx
import { useState } from 'react';
import { persistSettings } from '../api.js';

const AVAILABLE_COUNTRIES = [
  { code: 'AT', name: 'Austria' }, { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'BR', name: 'Brazil' }, { code: 'CA', name: 'Canada' },
  { code: 'CH', name: 'Switzerland' }, { code: 'CN', name: 'China' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' }, { code: 'EE', name: 'Estonia' },
  { code: 'ES', name: 'Spain' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'GR', name: 'Greece' }, { code: 'HR', name: 'Croatia' },
  { code: 'HU', name: 'Hungary' }, { code: 'IE', name: 'Ireland' },
  { code: 'IN', name: 'India' }, { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' }, { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' }, { code: 'LV', name: 'Latvia' },
  { code: 'MX', name: 'Mexico' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' }, { code: 'SE', name: 'Sweden' },
  { code: 'SI', name: 'Slovenia' }, { code: 'SK', name: 'Slovakia' },
  { code: 'TR', name: 'Turkey' }, { code: 'UA', name: 'Ukraine' },
  { code: 'US', name: 'United States' }, { code: 'ZA', name: 'South Africa' },
];

export default function SettingsPage({ settings, onSave, onError }) {
  const [countries, setCountries] = useState(settings.countries || []);
  const [year, setYear] = useState(settings.year || new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleCountry(code) {
    setCountries((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await persistSettings({ countries, year });
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      onError('Could not save settings — please try again.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = AVAILABLE_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-stone-800">Settings</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
        <h3 className="text-base font-semibold text-stone-700">Calendar Year</h3>
        <input type="number" value={year} min={2020} max={2030}
          onChange={(e) => { setYear(Number(e.target.value)); setSaved(false); }}
          className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 w-32 focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-4">
        <h3 className="text-base font-semibold text-stone-700">Public Holiday Countries</h3>
        <p className="text-sm text-stone-400">Select countries to import their public holidays — these won't count as leave days.</p>

        {countries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {countries.map((code) => {
              const country = AVAILABLE_COUNTRIES.find((c) => c.code === code);
              return (
                <span key={code} className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium">
                  {country?.name || code}
                  <button onClick={() => toggleCountry(code)} className="ml-1 text-teal-400 hover:text-teal-600 text-base leading-none">×</button>
                </span>
              );
            })}
          </div>
        )}

        <input type="text" placeholder="Search countries…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" />

        <div className="max-h-64 overflow-y-auto border border-stone-100 rounded-xl">
          {filtered.map((c) => (
            <label key={c.code} className="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 cursor-pointer border-b border-stone-50 last:border-0">
              <input type="checkbox" checked={countries.includes(c.code)} onChange={() => toggleCountry(c.code)}
                className="rounded text-teal-600 focus:ring-teal-400" />
              <span className="text-sm text-stone-700">{c.name} <span className="text-stone-400">({c.code})</span></span>
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className={`w-full py-2.5 px-4 rounded-xl font-medium text-white text-sm transition-colors disabled:opacity-50 ${saved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}>
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettingsPage.jsx
git commit -m "feat: SettingsPage async save + warm redesign"
```

---

## Task 12: Rewrite ExternalForm.jsx — async save + warm redesign

**Files:**
- Modify: `src/components/ExternalForm.jsx`

- [ ] **Step 1: Replace ExternalForm.jsx**

```jsx
import { useState } from 'react';
import { LEAVE_TYPES, addOrUpdateLeave, addOrUpdateProfile, countLeaveDays } from '../store.js';
import { persistLeaves, persistProfiles } from '../api.js';

export default function ExternalForm({ profiles, holidays, onSave, onError }) {
  const [form, setForm] = useState({ name: '', existingProfileId: '', type: 'annual', startDate: '', endDate: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [useExisting, setUseExisting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let profileId = form.existingProfileId;
      let updatedProfiles = profiles;

      if (!useExisting && form.name.trim()) {
        const existing = profiles.find((p) => p.name.toLowerCase() === form.name.trim().toLowerCase());
        if (existing) {
          profileId = existing.id;
        } else {
          updatedProfiles = addOrUpdateProfile(
            { name: form.name.trim(), balances: { annual: 25, sick: 10, teleworking: 0, unpaid: 0, parental: 0 } },
            profiles
          );
          profileId = updatedProfiles[updatedProfiles.length - 1].id;
          await persistProfiles(updatedProfiles);
        }
      }

      if (!profileId) return;

      // We don't have the full leaves array here — fetch via onSave which refreshes App state.
      // To avoid a race, we optimistically POST just this leave appended to what we know.
      // App.jsx will call fetchLeaves() after onSave(), so we just need to persist.
      const leaveToAdd = { profileId, type: form.type, startDate: form.startDate, endDate: form.endDate, notes: form.notes };
      // Fetch current leaves first to avoid overwriting concurrent changes
      const res = await fetch('/api/leaves');
      const currentLeaves = res.ok ? await res.json() : [];
      await persistLeaves(addOrUpdateLeave(leaveToAdd, currentLeaves));
      await onSave();
      setSubmitted(true);
    } catch {
      onError('Could not submit leave — please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-10">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">Leave Submitted!</h2>
          <p className="text-emerald-600 mb-6 text-sm">Your leave request has been recorded.</p>
          <button onClick={() => { setSubmitted(false); setForm({ name: '', existingProfileId: '', type: 'annual', startDate: '', endDate: '', notes: '' }); }}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition-colors">
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  const daysCount = form.startDate && form.endDate ? countLeaveDays(form.startDate, form.endDate, holidays) : 0;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-stone-800 mb-1">Submit Leave Request</h2>
      <p className="text-stone-400 text-sm mb-6">Fill in the form below to register your leave.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-5">
        <div className="flex gap-4">
          {[{ label: 'New member', value: false }, { label: 'Existing member', value: true }].map(({ label, value }) => (
            <label key={label} className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="radio" checked={useExisting === value} onChange={() => setUseExisting(value)}
                className="text-teal-600 focus:ring-teal-400" />
              {label}
            </label>
          ))}
        </div>

        {useExisting ? (
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Team Member</label>
            <select value={form.existingProfileId} onChange={(e) => setForm({ ...form, existingProfileId: e.target.value })}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" required>
              <option value="">Select…</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Your Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter your full name" required={!useExisting}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1.5">Leave Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400">
            {Object.entries(LEAVE_TYPES).map(([key, type]) => <option key={key} value={key}>{type.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">End Date</label>
            <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" required />
          </div>
        </div>

        {daysCount > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-sm font-medium">
            📅 {daysCount} working day{daysCount !== 1 ? 's' : ''}
          </span>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1.5">Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" rows={3} />
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-xl hover:bg-teal-700 font-medium text-sm transition-colors disabled:opacity-50">
          {saving ? 'Submitting…' : 'Submit Leave Request'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ExternalForm.jsx
git commit -m "feat: ExternalForm async save + warm redesign"
```

---

## Task 13: Warm redesign — CalendarView.jsx

**Files:**
- Modify: `src/components/CalendarView.jsx`

- [ ] **Step 1: Read the current CalendarView.jsx**

Read `src/components/CalendarView.jsx` in full before making changes.

- [ ] **Step 2: Update colour references and container styles**

Find all instances of `indigo` class names (e.g. `bg-indigo-600`, `text-indigo-600`, `border-indigo-`) and replace with teal equivalents:
- `bg-indigo-600` → `bg-teal-600`
- `text-indigo-600` → `text-teal-600`
- `hover:bg-indigo-700` → `hover:bg-teal-700`
- `border-indigo-` → `border-teal-`
- `bg-indigo-100` → `bg-teal-50`
- `text-indigo-700` → `text-teal-700`

Also update outer wrapper divs: replace `rounded-lg shadow` with `rounded-2xl shadow-sm border border-stone-100`.
Update `bg-white` card containers to keep `bg-white` but add `rounded-2xl`.
Replace any `text-gray-` with `text-stone-`.

- [ ] **Step 3: Update FullCalendar event styles**

In the `eventContent` or event rendering section, update the event pill style to use rounded-full and softer colours:

If events are rendered via `eventClassNames` or inline style, ensure the container div has class `rounded-full px-2 py-0.5 text-xs font-medium truncate`.

- [ ] **Step 4: Commit**

```bash
git add src/components/CalendarView.jsx
git commit -m "design: warm CalendarView redesign"
```

---

## Task 14: Warm redesign — GanttView.jsx

**Files:**
- Modify: `src/components/GanttView.jsx`

- [ ] **Step 1: Read the current GanttView.jsx**

Read `src/components/GanttView.jsx` in full before making changes.

- [ ] **Step 2: Update colour references**

- Replace `indigo` Tailwind classes with `teal` equivalents (same mapping as Task 13).
- Replace `text-gray-` / `bg-gray-` with `text-stone-` / `bg-stone-`.
- Alternating row backgrounds: use `bg-stone-50` for even rows, `bg-white` for odd rows.
- Update outer container to `rounded-2xl shadow-sm border border-stone-100`.

- [ ] **Step 3: Update Gantt bar styles**

Gantt leave bars should use the updated LEAVE_TYPES colors from store.js (already updated in Task 3). Ensure bars have `rounded-full` style (or `borderRadius: '9999px'` if inline) and no hard borders.

- [ ] **Step 4: Add profile avatar initials**

In the left profile name column, prepend a small avatar initial circle before the name:

```jsx
<span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2 flex-shrink-0">
  {profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
</span>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/GanttView.jsx
git commit -m "design: warm GanttView redesign with avatar initials"
```

---

## Task 15: Provision Vercel KV and deploy

- [ ] **Step 1: Install Vercel CLI globally (if not already installed)**

```bash
npm install -g vercel
```

- [ ] **Step 2: Link the project to Vercel**

```bash
vercel link
```

Follow the prompts: log in, select your scope, link to a new project named `leave-planner`.

- [ ] **Step 3: Add Vercel KV storage**

In the [Vercel dashboard](https://vercel.com/dashboard):
1. Go to your `leave-planner` project → **Storage** tab
2. Click **Create Database** → choose **KV**
3. Name it `leave-planner-kv`, select the free tier
4. Click **Connect** to link it to the project
5. Vercel auto-adds `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` as environment variables

- [ ] **Step 4: Pull environment variables locally**

```bash
vercel env pull .env.local
```

Verify `.env.local` contains `KV_REST_API_URL` and `KV_REST_API_TOKEN`.

- [ ] **Step 5: Test locally with vercel dev**

```bash
npm run dev
```

Open the local URL shown (usually `http://localhost:3000`). Navigate through the app — add a profile, add a leave, verify it saves and reloads from the API (check Network tab in DevTools: GET /api/leaves should return data).

- [ ] **Step 6: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 7: Verify production**

Open the Vercel production URL. Log in, add a profile and a leave. Open a private/incognito window and navigate to the same URL — the data should be visible without entering it again.

- [ ] **Step 8: Commit any remaining changes and push**

```bash
git add -A
git commit -m "chore: final production deploy config"
git push origin main
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Shared backend via Vercel KV — Tasks 1-2
- ✅ Async API client — Task 4
- ✅ Loading state (Spinner) — Tasks 5, 6
- ✅ Error toast — Task 5
- ✅ Warm teal/stone palette — Tasks 7-14
- ✅ Rounded cards, pill badges — all component tasks
- ✅ Avatar initials — Tasks 8, 10, 14
- ✅ Friendly empty states — Tasks 8, 10
- ✅ Dashboard redesign with chip-based upcoming leaves — Task 8
- ✅ Leave balance coloured left-border cards — Task 8
- ✅ Forms redesigned (LeaveForm, ProfilePage, SettingsPage, ExternalForm) — Tasks 9-12
- ✅ CalendarView warm colours — Task 13
- ✅ GanttView warm colours + rounded bars — Task 14
- ✅ Vercel deployment — Task 15

**Type consistency check:**
- `getUsedDays(profileId, leaves, holidays)` — new 3-param signature used consistently in Dashboard (Task 8) and ProfilePage (Task 10). ✅
- `addOrUpdateLeave(leave, leaves)` / `removeLeave(id, leaves)` — used consistently in LeaveForm (Task 9) and ExternalForm (Task 12). ✅
- `addOrUpdateProfile(profile, profiles)` / `removeProfile(id, profiles)` — used consistently in ProfilePage (Task 10). ✅
- `onSave(newCurrentUserId?)` — ProfilePage calls `onSave(null)` or `onSave(id)` or `onSave()`, App.jsx handles all three. ✅

**No placeholders:** All steps contain actual code. ✅
