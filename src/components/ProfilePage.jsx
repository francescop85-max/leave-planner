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
