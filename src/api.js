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
