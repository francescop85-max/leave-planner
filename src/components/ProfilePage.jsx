import { useState, useEffect } from 'react';
import {
  LEAVE_TYPES,
  getProfiles,
  saveProfile,
  deleteProfile,
  getCurrentUserId,
  setCurrentUserId,
  getUsedDays,
} from '../store.js';

export default function ProfilePage({ holidays, onSave }) {
  const [profiles, setProfiles] = useState(getProfiles());
  const [currentUserId, setCurrentUserIdState] = useState(getCurrentUserId());
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    balances: {
      annual: 25,
      sick: 10,
      teleworking: 0,
      unpaid: 0,
      parental: 0,
    },
  });

  function refresh() {
    setProfiles(getProfiles());
    setCurrentUserIdState(getCurrentUserId());
    onSave();
  }

  function handleEdit(profile) {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      balances: { ...profile.balances },
    });
  }

  function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      saveProfile({ id: editingId, ...form });
    } else {
      saveProfile(form);
    }
    setEditingId(null);
    setForm({
      name: '',
      balances: { annual: 25, sick: 10, teleworking: 0, unpaid: 0, parental: 0 },
    });
    refresh();
  }

  function handleDelete(id) {
    if (confirm('Delete this profile and all associated leave entries?')) {
      deleteProfile(id);
      if (currentUserId === id) {
        setCurrentUserId(null);
      }
      refresh();
    }
  }

  function handleSetCurrent(id) {
    setCurrentUserId(id);
    setCurrentUserIdState(id);
    onSave();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Team Profiles</h2>

      {/* Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-lg shadow p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold">
          {editingId ? 'Edit Profile' : 'Add New Team Member'}
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leave Balances (days per year)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(LEAVE_TYPES).map(([key, type]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{type.label}</label>
                {type.trackBalance ? (
                  <input
                    type="number"
                    min="0"
                    value={form.balances[key] || 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        balances: {
                          ...form.balances,
                          [key]: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                ) : (
                  <div className="text-xs text-gray-400 px-2 py-1">No limit</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            {editingId ? 'Update' : 'Add Member'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({
                  name: '',
                  balances: {
                    annual: 25,
                    sick: 10,
                    teleworking: 0,
                    unpaid: 0,
                    parental: 0,
                  },
                });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Profile list */}
      <div className="space-y-3">
        {profiles.map((profile) => {
          const usedDays = getUsedDays(profile.id, holidays);
          const isCurrent = currentUserId === profile.id;
          return (
            <div
              key={profile.id}
              className={`bg-white rounded-lg shadow p-4 border-2 ${
                isCurrent ? 'border-indigo-400' : 'border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-gray-800">{profile.name}</h4>
                  {isCurrent && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
                      Current User
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isCurrent && (
                    <button
                      onClick={() => handleSetCurrent(profile.id)}
                      className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                    >
                      Set as Me
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(profile)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(LEAVE_TYPES).map(([key, type]) => {
                  const used = usedDays[key] || 0;

                  if (!type.trackBalance) {
                    return (
                      <div key={key} className="text-center rounded p-2 bg-gray-50">
                        <div className="text-[10px] text-gray-500 uppercase">
                          {type.label}
                        </div>
                        <div className="text-sm font-bold text-gray-800">{used}</div>
                        <div className="text-[10px] text-gray-400">used</div>
                      </div>
                    );
                  }

                  const total = profile.balances?.[key] || 0;
                  const remaining = total - used;
                  const isOver = remaining < 0;
                  return (
                    <div
                      key={key}
                      className={`text-center rounded p-2 ${
                        isOver ? 'bg-red-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="text-[10px] text-gray-500 uppercase">
                        {type.label}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isOver ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {remaining}/{total}
                      </div>
                      {isOver && (
                        <div className="text-[10px] text-red-500 font-medium">
                          EXCEEDED
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {profiles.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No team members yet. Add one above.
        </div>
      )}
    </div>
  );
}
