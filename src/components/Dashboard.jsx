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
