import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { LEAVE_TYPES, deleteLeave } from '../store.js';
import { useState } from 'react';

export default function CalendarView({ leaves, profiles, holidays, settings, onRefresh }) {
  const navigate = useNavigate();
  const [selectedLeave, setSelectedLeave] = useState(null);

  const leaveEvents = leaves.map((l) => {
    const profile = profiles.find((p) => p.id === l.profileId);
    const type = LEAVE_TYPES[l.type];
    // FullCalendar end is exclusive, so add one day
    const endDate = new Date(l.endDate);
    endDate.setDate(endDate.getDate() + 1);
    return {
      id: l.id,
      title: `${profile?.name || 'Unknown'} - ${type?.label || l.type}`,
      start: l.startDate,
      end: endDate.toISOString().split('T')[0],
      backgroundColor: type?.color || '#999',
      borderColor: type?.color || '#999',
      extendedProps: { leave: l },
    };
  });

  const holidayEvents = holidays.map((h) => ({
    id: `holiday-${h.date}-${h.country}`,
    title: `${h.name} (${h.country.toUpperCase()})`,
    start: h.date,
    allDay: true,
    backgroundColor: '#f97316',
    borderColor: '#f97316',
    display: 'background',
    extendedProps: { isHoliday: true },
  }));

  // Also add holiday labels
  const holidayLabels = holidays.map((h) => ({
    id: `holiday-label-${h.date}-${h.country}`,
    title: `${h.name} (${h.country.toUpperCase()})`,
    start: h.date,
    allDay: true,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: '#ea580c',
    extendedProps: { isHoliday: true },
  }));

  const allEvents = [...leaveEvents, ...holidayEvents, ...holidayLabels];

  function handleEventClick(info) {
    const leave = info.event.extendedProps.leave;
    if (leave) {
      setSelectedLeave(leave);
    }
  }

  function handleDelete() {
    if (selectedLeave) {
      deleteLeave(selectedLeave.id);
      setSelectedLeave(null);
      onRefresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-800">Calendar View</h2>
        <div className="flex gap-2">
          {Object.entries(LEAVE_TYPES).map(([key, type]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{ backgroundColor: type.bg, color: type.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: type.color }}
              />
              {type.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-100 text-orange-600">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Holiday
          </span>
        </div>
      </div>

      {selectedLeave && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm border-stone-100 p-4 flex items-center justify-between">
          <div>
            <span className="font-medium">
              {profiles.find((p) => p.id === selectedLeave.profileId)?.name}
            </span>
            {' - '}
            <span>{LEAVE_TYPES[selectedLeave.type]?.label}</span>
            {' | '}
            <span className="text-stone-500">
              {selectedLeave.startDate} to {selectedLeave.endDate}
            </span>
            {selectedLeave.notes && (
              <span className="text-stone-400"> - {selectedLeave.notes}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/edit/${selectedLeave.id}`)}
              className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedLeave(null)}
              className="px-3 py-1 text-sm bg-stone-200 text-stone-700 rounded hover:bg-stone-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
        <FullCalendar
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,multiMonthYear',
          }}
          events={allEvents}
          eventClick={handleEventClick}
          height="auto"
          firstDay={1}
        />
      </div>
    </div>
  );
}
