import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LEAVE_TYPES, getLeaves, saveLeave, countLeaveDays, getUsedDays, getProfile } from '../store.js';

export default function LeaveForm({ profiles, holidays, onSave }) {
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    profileId: '',
    type: 'annual',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (isEdit) {
      const leave = getLeaves().find((l) => l.id === id);
      if (leave) {
        setForm(leave);
      }
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (form.profileId && form.startDate && form.endDate && form.type) {
      // Skip balance check for types that don't track balance (sick, unpaid)
      if (!LEAVE_TYPES[form.type]?.trackBalance) {
        setWarning('');
        return;
      }
      const profile = getProfile(form.profileId);
      if (profile) {
        const usedDays = getUsedDays(form.profileId, holidays);
        const newDays = countLeaveDays(form.startDate, form.endDate, holidays);
        const currentUsed = usedDays[form.type] || 0;
        // If editing, subtract the old days
        let adjustment = 0;
        if (isEdit) {
          const oldLeave = getLeaves().find((l) => l.id === id);
          if (oldLeave && oldLeave.type === form.type) {
            adjustment = countLeaveDays(oldLeave.startDate, oldLeave.endDate, holidays);
          }
        }
        const totalUsed = currentUsed - adjustment + newDays;
        const balance = profile.balances?.[form.type] || 0;
        if (totalUsed > balance) {
          setWarning(
            `This will use ${totalUsed} ${LEAVE_TYPES[form.type].label} days but only ${balance} are available (exceeded by ${totalUsed - balance} days).`
          );
        } else {
          setWarning('');
        }
      }
    } else {
      setWarning('');
    }
  }, [form.profileId, form.type, form.startDate, form.endDate, holidays, id, isEdit]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.profileId || !form.startDate || !form.endDate) return;

    saveLeave(isEdit ? { ...form, id } : form);
    onSave();
  }

  const daysCount =
    form.startDate && form.endDate
      ? countLeaveDays(form.startDate, form.endDate, holidays)
      : 0;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Edit Leave' : 'Add Leave'}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Team Member
          </label>
          <select
            value={form.profileId}
            onChange={(e) => setForm({ ...form, profileId: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          >
            <option value="">Select a person...</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

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
            Working days: <strong>{daysCount}</strong>{' '}
            <span className="text-gray-400">(excludes weekends & holidays)</span>
          </div>
        )}

        {warning && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-medium">
            {warning}
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
          {isEdit ? 'Update Leave' : 'Add Leave'}
        </button>
      </form>
    </div>
  );
}
