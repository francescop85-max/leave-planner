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
// Bump this version when the holiday data source changes to invalidate old caches
const LS_HOLIDAYS_CACHE = 'lp_holidays_cache_v2';

function lsGet(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export function getCurrentUserId() { return lsGet(LS_CURRENT_USER, null); }
export function setCurrentUserId(id) { lsSet(LS_CURRENT_USER, id); }
export function getCachedHolidays() { return lsGet(LS_HOLIDAYS_CACHE, {}); }
export function setCachedHolidays(h) { lsSet(LS_HOLIDAYS_CACHE, h); }
