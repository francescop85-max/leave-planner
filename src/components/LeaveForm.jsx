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
