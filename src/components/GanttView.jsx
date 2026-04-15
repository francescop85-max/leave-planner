import { useMemo, useRef, useEffect, useState } from 'react';
import { LEAVE_TYPES } from '../store.js';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, isWeekend, parseISO, isSameDay } from 'date-fns';

export default function GanttView({ leaves, profiles, holidays }) {
  const containerRef = useRef(null);
  const [viewMonths, setViewMonths] = useState(3);
  const [startMonth, setStartMonth] = useState(() => startOfMonth(new Date()));

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < viewMonths; i++) {
      result.push(addMonths(startMonth, i));
    }
    return result;
  }, [startMonth, viewMonths]);

  const allDays = useMemo(() => {
    if (months.length === 0) return [];
    const first = months[0];
    const last = endOfMonth(months[months.length - 1]);
    return eachDayOfInterval({ start: first, end: last });
  }, [months]);

  const holidaySet = useMemo(() => {
    const set = new Set();
    holidays.forEach((h) => set.add(h.date));
    return set;
  }, [holidays]);

  const profileLeaves = useMemo(() => {
    const map = {};
    profiles.forEach((p) => {
      map[p.id] = {
        profile: p,
        leaves: leaves.filter((l) => l.profileId === p.id),
      };
    });
    return Object.values(map);
  }, [profiles, leaves]);

  const dayWidth = 28;
  const rowHeight = 40;
  const headerHeight = 60;
  const nameColWidth = 150;

  function isDateInRange(date, start, end) {
    const d = date.getTime();
    return d >= parseISO(start).getTime() && d <= parseISO(end).getTime();
  }

  function getLeaveForDay(profileLeaveList, day) {
    return profileLeaveList.find((l) => isDateInRange(day, l.startDate, l.endDate));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-800">Gantt View</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStartMonth((m) => addMonths(m, -1))}
            className="px-3 py-1 text-sm bg-stone-200 rounded hover:bg-stone-300"
          >
            &larr; Prev
          </button>
          <select
            value={viewMonths}
            onChange={(e) => setViewMonths(Number(e.target.value))}
            className="border border-stone-300 rounded px-2 py-1 text-sm"
          >
            <option value={1}>1 Month</option>
            <option value={2}>2 Months</option>
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
          <button
            onClick={() => setStartMonth((m) => addMonths(m, 1))}
            className="px-3 py-1 text-sm bg-stone-200 rounded hover:bg-stone-300"
          >
            Next &rarr;
          </button>
          <button
            onClick={() => setStartMonth(startOfMonth(new Date()))}
            className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(LEAVE_TYPES).map(([key, type]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{ backgroundColor: type.bg, color: type.color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
            {type.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-100 text-orange-600">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          Holiday
        </span>
      </div>

      {profileLeaves.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          No team members found. Create profiles in the Profile page first.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-x-auto" ref={containerRef}>
          <div
            style={{ minWidth: nameColWidth + allDays.length * dayWidth }}
            className="relative"
          >
            {/* Header: month names */}
            <div className="flex border-b border-stone-200 sticky top-0 bg-white z-10">
              <div
                className="flex-shrink-0 border-r border-stone-200 bg-stone-50 font-medium text-sm text-stone-600 flex items-end px-3 pb-1"
                style={{ width: nameColWidth, height: headerHeight }}
              >
                Team Member
              </div>
              <div className="flex flex-col" style={{ height: headerHeight }}>
                {/* Month row */}
                <div className="flex" style={{ height: headerHeight / 2 }}>
                  {months.map((month) => {
                    const daysInMonth = eachDayOfInterval({
                      start: startOfMonth(month),
                      end: endOfMonth(month),
                    }).length;
                    return (
                      <div
                        key={month.toISOString()}
                        className="text-xs font-semibold text-stone-700 border-r border-stone-200 flex items-center justify-center"
                        style={{ width: daysInMonth * dayWidth }}
                      >
                        {format(month, 'MMMM yyyy')}
                      </div>
                    );
                  })}
                </div>
                {/* Day numbers row */}
                <div className="flex" style={{ height: headerHeight / 2 }}>
                  {allDays.map((day) => {
                    const weekend = isWeekend(day);
                    const holiday = holidaySet.has(format(day, 'yyyy-MM-dd'));
                    return (
                      <div
                        key={day.toISOString()}
                        className={`text-[10px] flex items-center justify-center border-r border-stone-100 ${
                          weekend
                            ? 'bg-stone-100 text-stone-400'
                            : holiday
                            ? 'bg-orange-50 text-orange-500'
                            : 'text-stone-500'
                        }`}
                        style={{ width: dayWidth }}
                        title={format(day, 'EEE, MMM d')}
                      >
                        {format(day, 'd')}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rows */}
            {profileLeaves.map(({ profile, leaves: pLeaves }) => (
              <div key={profile.id} className="flex border-b border-stone-100">
                <div
                  className="flex-shrink-0 border-r border-stone-200 bg-stone-50 text-sm text-stone-700 flex items-center px-3 truncate"
                  style={{ width: nameColWidth, height: rowHeight }}
                  title={profile.name}
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2 flex-shrink-0">
                    {profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                  {profile.name}
                </div>
                <div className="flex" style={{ height: rowHeight }}>
                  {allDays.map((day) => {
                    const weekend = isWeekend(day);
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const holiday = holidaySet.has(dateStr);
                    const leave = getLeaveForDay(pLeaves, day);
                    const leaveType = leave ? LEAVE_TYPES[leave.type] : null;

                    let bg = 'bg-white';
                    let style = {};
                    if (weekend) bg = 'bg-stone-50';
                    if (holiday) bg = 'bg-orange-50';
                    if (leave && leaveType) {
                      style = { backgroundColor: leaveType.color + '40' };
                      bg = '';
                    }

                    return (
                      <div
                        key={day.toISOString()}
                        className={`border-r border-stone-50 flex items-center justify-center ${bg}`}
                        style={{ width: dayWidth, height: rowHeight, ...style }}
                        title={
                          leave
                            ? `${leaveType?.label}: ${leave.startDate} - ${leave.endDate}`
                            : holiday
                            ? 'Public Holiday'
                            : format(day, 'EEE, MMM d')
                        }
                      >
                        {leave && leaveType && (
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: leaveType.color }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
