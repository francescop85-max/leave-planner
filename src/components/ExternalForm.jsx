import { useState } from 'react';
import { LEAVE_TYPES, saveLeave, saveProfile, getProfiles, countLeaveDays } from '../store.js';

export default function ExternalForm({ profiles, holidays, onSave }) {
  const [form, setForm] = useState({
    name: '',
    existingProfileId: '',
    type: 'annual',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [useExisting, setUseExisting] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();

    let profileId = form.existingProfileId;

    // Create a new profile if name is provided and not using existing
    if (!useExisting && form.name.trim()) {
      const existing = getProfiles().find(
        (p) => p.name.toLowerCase() === form.name.trim().toLowerCase()
      );
      if (existing) {
        profileId = existing.id;
      } else {
        const newProfiles = saveProfile({
          name: form.name.trim(),
          balances: { annual: 25, sick: 10, teleworking: 0, unpaid: 0, parental: 0 },
        });
        profileId = newProfiles[newProfiles.length - 1].id;
      }
    }

    if (!profileId) return;

    saveLeave({
      profileId,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes,
    });

    onSave();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-green-800 mb-2">Leave Submitted!</h2>
          <p className="text-green-600 mb-4">Your leave request has been recorded.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                name: '',
                existingProfileId: '',
                type: 'annual',
                startDate: '',
                endDate: '',
                notes: '',
              });
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  const daysCount =
    form.startDate && form.endDate
      ? countLeaveDays(form.startDate, form.endDate, holidays)
      : 0;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Submit Leave Request</h2>
      <p className="text-gray-500 mb-6">Fill in the form below to register your leave.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={!useExisting}
              onChange={() => setUseExisting(false)}
            />
            New member
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={useExisting}
              onChange={() => setUseExisting(true)}
            />
            Existing member
          </label>
        </div>

        {useExisting ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Team Member
            </label>
            <select
              value={form.existingProfileId}
              onChange={(e) => setForm({ ...form, existingProfileId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            >
              <option value="">Select...</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Enter your full name"
              required={!useExisting}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Type
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {Object.entries(LEAVE_TYPES).map(([key, type]) => (
              <option key={key} value={key}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              min={form.startDate}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        {daysCount > 0 && (
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
            Working days: <strong>{daysCount}</strong>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-medium"
        >
          Submit Leave Request
        </button>
      </form>
    </div>
  );
}
