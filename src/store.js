import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  LEAVES: 'lp_leaves',
  PROFILES: 'lp_profiles',
  SETTINGS: 'lp_settings',
  CURRENT_USER: 'lp_current_user',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Leave types with colors
export const LEAVE_TYPES = {
  annual: { label: 'Annual Leave', color: '#3b82f6', bg: '#dbeafe', trackBalance: true },
  sick: { label: 'Sick Leave', color: '#ef4444', bg: '#fee2e2', trackBalance: false },
  teleworking: { label: 'Teleworking', color: '#10b981', bg: '#d1fae5', trackBalance: true },
  unpaid: { label: 'Unpaid Leave', color: '#f59e0b', bg: '#fef3c7', trackBalance: false },
  parental: { label: 'Parental Leave', color: '#8b5cf6', bg: '#ede9fe', trackBalance: true },
};

// Helper to detect overlapping leave between team members
export function findOverlaps(leaves, profiles) {
  const overlaps = [];
  // Only check leaves that haven't ended yet
  const relevant = leaves.filter((l) => new Date(l.endDate) >= new Date());

  for (let i = 0; i < relevant.length; i++) {
    for (let j = i + 1; j < relevant.length; j++) {
      const a = relevant[i];
      const b = relevant[j];
      // Skip if same person
      if (a.profileId === b.profileId) continue;
      // Skip teleworking — it's not absence
      if (a.type === 'teleworking' || b.type === 'teleworking') continue;
      // Check date overlap
      if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
        const overlapStart = a.startDate > b.startDate ? a.startDate : b.startDate;
        const overlapEnd = a.endDate < b.endDate ? a.endDate : b.endDate;
        const profileA = profiles.find((p) => p.id === a.profileId);
        const profileB = profiles.find((p) => p.id === b.profileId);
        if (profileA && profileB) {
          overlaps.push({
            personA: profileA.name,
            personB: profileB.name,
            typeA: a.type,
            typeB: b.type,
            overlapStart,
            overlapEnd,
            leaveA: a,
            leaveB: b,
          });
        }
      }
    }
  }
  // Sort by overlap start date
  overlaps.sort((a, b) => a.overlapStart.localeCompare(b.overlapStart));
  return overlaps;
}

// Leaves
export function getLeaves() {
  return load(STORAGE_KEYS.LEAVES, []);
}

export function saveLeave(leave) {
  const leaves = getLeaves();
  const existing = leaves.findIndex((l) => l.id === leave.id);
  if (existing >= 0) {
    leaves[existing] = leave;
  } else {
    leaves.push({ ...leave, id: leave.id || uuidv4() });
  }
  save(STORAGE_KEYS.LEAVES, leaves);
  return leaves;
}

export function deleteLeave(id) {
  const leaves = getLeaves().filter((l) => l.id !== id);
  save(STORAGE_KEYS.LEAVES, leaves);
  return leaves;
}

// Profiles
export function getProfiles() {
  return load(STORAGE_KEYS.PROFILES, []);
}

export function getProfile(id) {
  return getProfiles().find((p) => p.id === id);
}

export function saveProfile(profile) {
  const profiles = getProfiles();
  const existing = profiles.findIndex((p) => p.id === profile.id);
  if (existing >= 0) {
    profiles[existing] = profile;
  } else {
    profiles.push({ ...profile, id: profile.id || uuidv4() });
  }
  save(STORAGE_KEYS.PROFILES, profiles);
  return profiles;
}

export function deleteProfile(id) {
  const profiles = getProfiles().filter((p) => p.id !== id);
  save(STORAGE_KEYS.PROFILES, profiles);
  return profiles;
}

// Current user
export function getCurrentUserId() {
  return load(STORAGE_KEYS.CURRENT_USER, null);
}

export function setCurrentUserId(id) {
  save(STORAGE_KEYS.CURRENT_USER, id);
}

// Settings (countries, year)
export function getSettings() {
  return load(STORAGE_KEYS.SETTINGS, { countries: [], year: new Date().getFullYear() });
}

export function saveSettings(settings) {
  save(STORAGE_KEYS.SETTINGS, settings);
}

// Holidays cache
const HOLIDAYS_CACHE_KEY = 'lp_holidays_cache';

export function getCachedHolidays() {
  return load(HOLIDAYS_CACHE_KEY, {});
}

export function setCachedHolidays(holidays) {
  save(HOLIDAYS_CACHE_KEY, holidays);
}

// Calculate working days between two dates, excluding weekends and holidays
export function countLeaveDays(startDate, endDate, holidays = []) {
  const holidaySet = new Set(holidays.map((h) => h.date));
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const day = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Calculate used days per leave type for a profile
export function getUsedDays(profileId, holidays = []) {
  const leaves = getLeaves().filter((l) => l.profileId === profileId);
  const used = {};
  for (const type of Object.keys(LEAVE_TYPES)) {
    used[type] = 0;
  }
  for (const leave of leaves) {
    if (used[leave.type] !== undefined) {
      used[leave.type] += countLeaveDays(leave.startDate, leave.endDate, holidays);
    }
  }
  return used;
}
