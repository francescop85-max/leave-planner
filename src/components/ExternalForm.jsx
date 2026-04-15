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

      const leaveToAdd = { profileId, type: form.type, startDate: form.startDate, endDate: form.endDate, notes: form.notes };
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
