import { LEAVE_TYPES, getUsedDays, getProfile, findOverlaps, countLeaveDays } from '../store.js';

export default function Dashboard({ leaves, profiles, holidays, currentUserId }) {
  const currentProfile = currentUserId ? getProfile(currentUserId) : null;
  const usedDays = currentUserId ? getUsedDays(currentUserId, holidays) : {};

  const upcomingLeaves = leaves
    .filter((l) => new Date(l.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 10);

  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const overlaps = findOverlaps(leaves, profiles);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {/* Overlap warnings */}
      {overlaps.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white text-sm font-bold">
              {overlaps.length}
            </span>
            Leave Overlap{overlaps.length > 1 ? 's' : ''} Detected
          </h3>
          <ul className="space-y-2">
            {overlaps.map((o, i) => {
              const days = countLeaveDays(o.overlapStart, o.overlapEnd, holidays);
              return (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-2 text-sm bg-white rounded-md px-3 py-2 border border-amber-200"
                >
                  <span className="font-semibold text-gray-800">{o.personA}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: LEAVE_TYPES[o.typeA]?.bg,
                      color: LEAVE_TYPES[o.typeA]?.color,
                    }}
                  >
                    {LEAVE_TYPES[o.typeA]?.label}
                  </span>
                  <span className="text-gray-400">&</span>
                  <span className="font-semibold text-gray-800">{o.personB}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: LEAVE_TYPES[o.typeB]?.bg,
                      color: LEAVE_TYPES[o.typeB]?.color,
                    }}
                  >
                    {LEAVE_TYPES[o.typeB]?.label}
                  </span>
                  <span className="text-gray-500">
                    overlap {o.overlapStart} to {o.overlapEnd}
                  </span>
                  <span className="text-amber-700 font-medium">
                    ({days} working day{days !== 1 ? 's' : ''})
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {currentProfile && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Leave Balance - {currentProfile.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(LEAVE_TYPES).map(([key, type]) => {
              const used = usedDays[key] || 0;

              if (!type.trackBalance) {
                return (
                  <div key={key} className="rounded-lg p-4 border-2 border-gray-200 bg-white">
                    <div className="text-xs font-medium uppercase text-gray-500">
                      {type.label}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{used}</div>
                    <div className="mt-1 text-xs text-gray-400">days used</div>
                  </div>
                );
              }

              const total = currentProfile.balances?.[key] || 0;
              const remaining = total - used;
              const isOver = remaining < 0;
              return (
                <div
                  key={key}
                  className={`rounded-lg p-4 border-2 ${
                    isOver ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="text-xs font-medium uppercase text-gray-500">
                    {type.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold ${
                        isOver ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {remaining}
                    </span>
                    <span className="text-sm text-gray-400">/ {total}</span>
                  </div>
                  {isOver && (
                    <div className="mt-1 text-xs font-medium text-red-600">
                      Exceeded by {Math.abs(remaining)} day(s)
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-400">{used} used</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!currentProfile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          No profile selected. Go to <strong>Profile</strong> to create one and set your
          leave balances.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Leave</h3>
          {upcomingLeaves.length === 0 ? (
            <p className="text-gray-400">No upcoming leave planned.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingLeaves.map((l) => {
                const profile = profiles.find((p) => p.id === l.profileId);
                const type = LEAVE_TYPES[l.type];
                return (
                  <li key={l.id} className="flex items-center gap-3 text-sm">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type?.color }}
                    />
                    <span className="font-medium">{profile?.name || 'Unknown'}</span>
                    <span className="text-gray-400">
                      {l.startDate} - {l.endDate}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: type?.bg,
                        color: type?.color,
                      }}
                    >
                      {type?.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Holidays</h3>
          {upcomingHolidays.length === 0 ? (
            <p className="text-gray-400">
              No holidays configured. Go to Settings to add countries.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingHolidays.map((h, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="font-medium">{h.name}</span>
                  <span className="text-gray-400">{h.date}</span>
                  <span className="text-xs text-gray-300 uppercase">{h.country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">External Form Link</h3>
        <p className="text-sm text-gray-500 mb-3">
          Share this link with team members so they can submit leave requests:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm break-all">
            {window.location.origin + window.location.pathname + '#/form'}
          </code>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                window.location.origin + window.location.pathname + '#/form'
              )
            }
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
