import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import CalendarView from './components/CalendarView.jsx';
import GanttView from './components/GanttView.jsx';
import LeaveForm from './components/LeaveForm.jsx';
import ExternalForm from './components/ExternalForm.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import {
  getLeaves,
  getProfiles,
  getSettings,
  getCachedHolidays,
  setCachedHolidays,
  getCurrentUserId,
} from './store.js';

function App() {
  const [leaves, setLeaves] = useState(getLeaves());
  const [profiles, setProfiles] = useState(getProfiles());
  const [settings, setSettings] = useState(getSettings());
  const [holidays, setHolidays] = useState([]);
  const [currentUserId, setCurrentUserIdState] = useState(getCurrentUserId());
  const navigate = useNavigate();

  const refresh = useCallback(() => {
    setLeaves(getLeaves());
    setProfiles(getProfiles());
    setSettings(getSettings());
    setCurrentUserIdState(getCurrentUserId());
  }, []);

  // Fetch holidays when countries change
  useEffect(() => {
    async function fetchHolidays() {
      if (!settings.countries || settings.countries.length === 0) {
        setHolidays([]);
        return;
      }
      const year = settings.year || new Date().getFullYear();
      const cached = getCachedHolidays();
      const cacheKey = `${settings.countries.sort().join(',')}_${year}`;

      if (cached[cacheKey]) {
        setHolidays(cached[cacheKey]);
        return;
      }

      try {
        const allHolidays = [];
        for (const country of settings.countries) {
          const res = await fetch(
            `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`
          );
          if (res.ok) {
            const data = await res.json();
            allHolidays.push(
              ...data.map((h) => ({
                date: h.date,
                name: h.localName || h.name,
                country,
              }))
            );
          }
        }
        // Deduplicate by date+country
        const unique = allHolidays.filter(
          (h, i, arr) =>
            arr.findIndex((x) => x.date === h.date && x.country === h.country) === i
        );
        cached[cacheKey] = unique;
        setCachedHolidays(cached);
        setHolidays(unique);
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      }
    }
    fetchHolidays();
  }, [settings.countries, settings.year]);

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/gantt', label: 'Gantt' },
    { to: '/add', label: 'Add Leave' },
    { to: '/profile', label: 'Profile' },
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-indigo-600">Leave Planner</h1>
            <div className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                leaves={leaves}
                profiles={profiles}
                holidays={holidays}
                currentUserId={currentUserId}
              />
            }
          />
          <Route
            path="/calendar"
            element={
              <CalendarView
                leaves={leaves}
                profiles={profiles}
                holidays={holidays}
                settings={settings}
                onRefresh={refresh}
              />
            }
          />
          <Route
            path="/gantt"
            element={
              <GanttView
                leaves={leaves}
                profiles={profiles}
                holidays={holidays}
              />
            }
          />
          <Route
            path="/add"
            element={
              <LeaveForm
                profiles={profiles}
                holidays={holidays}
                onSave={() => {
                  refresh();
                  navigate('/calendar');
                }}
              />
            }
          />
          <Route
            path="/edit/:id"
            element={
              <LeaveForm
                profiles={profiles}
                holidays={holidays}
                onSave={() => {
                  refresh();
                  navigate('/calendar');
                }}
              />
            }
          />
          <Route
            path="/form"
            element={
              <ExternalForm
                profiles={profiles}
                holidays={holidays}
                onSave={refresh}
              />
            }
          />
          <Route
            path="/profile"
            element={<ProfilePage holidays={holidays} onSave={refresh} />}
          />
          <Route
            path="/settings"
            element={<SettingsPage settings={settings} onSave={refresh} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
