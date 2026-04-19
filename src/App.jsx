import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import CalendarView from './components/CalendarView.jsx';
import GanttView from './components/GanttView.jsx';
import LeaveForm from './components/LeaveForm.jsx';
import ExternalForm from './components/ExternalForm.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import LoginPage from './components/LoginPage.jsx';
import Spinner from './components/Spinner.jsx';
import Toast from './components/Toast.jsx';
import { fetchLeaves, fetchProfiles, fetchSettings } from './api.js';
import { getCachedHolidays, setCachedHolidays, getCurrentUserId } from './store.js';

function App() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('lp_authenticated') === 'true'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [settings, setSettings] = useState({ countries: [], year: new Date().getFullYear() });
  const [holidays, setHolidays] = useState([]);
  const [currentUserId, setCurrentUserIdState] = useState(getCurrentUserId());
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [l, p, s] = await Promise.all([fetchLeaves(), fetchProfiles(), fetchSettings()]);
      setLeaves(l);
      setProfiles(p);
      setSettings(s);
    } catch {
      setError('Could not load data — please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  // UN-approved holidays for Ukraine (UNCT Member Organisations), keyed by year.
  // These override the national calendar — only this subset is guaranteed for UN staff.
  const UN_HOLIDAYS_UA = {
    2026: [
      { date: '2026-01-01', name: 'New Year' },
      { date: '2026-03-09', name: "International Women's Day (observed)" },
      { date: '2026-03-20', name: 'Eid al-Fitr' },
      { date: '2026-04-13', name: 'Easter (observed)' },
      { date: '2026-05-26', name: 'Eid al-Adha' },
      { date: '2026-06-01', name: 'Holy Trinity (observed)' },
      { date: '2026-06-29', name: 'Constitution Day (observed)' },
      { date: '2026-08-24', name: 'Independence Day of Ukraine' },
      { date: '2026-10-01', name: 'Defender of Ukraine Day' },
      { date: '2026-12-25', name: 'Christmas' },
    ],
  };

  // Fetch holidays when countries/year change
  useEffect(() => {
    async function fetchHolidays() {
      if (!settings.countries || settings.countries.length === 0) {
        setHolidays([]);
        return;
      }
      const year = settings.year || new Date().getFullYear();
      const cached = getCachedHolidays();
      const cacheKey = `${settings.countries.sort().join(',')}_${year}`;
      if (cached[cacheKey]) { setHolidays(cached[cacheKey]); return; }
      try {
        const allHolidays = [];
        for (const country of settings.countries) {
          if (country === 'UA') {
            // Use UN-approved holiday list; fall back to Nager.at if year not defined
            const unList = UN_HOLIDAYS_UA[year];
            if (unList) {
              allHolidays.push(...unList.map((h) => ({ ...h, country: 'UA' })));
              continue;
            }
          }
          const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
          if (res.ok) {
            const data = await res.json();
            allHolidays.push(...data.map((h) => ({ date: h.date, name: h.localName || h.name, country })));
          }
        }
        const unique = allHolidays.filter(
          (h, i, arr) => arr.findIndex((x) => x.date === h.date && x.country === h.country) === i
        );
        cached[cacheKey] = unique;
        setCachedHolidays(cached);
        setHolidays(unique);
      } catch { /* holidays are non-critical */ }
    }
    fetchHolidays();
  }, [settings.countries, settings.year]);

  const handleLogout = () => {
    sessionStorage.removeItem('lp_authenticated');
    setAuthenticated(false);
  };

  const refresh = useCallback(() => {
    setCurrentUserIdState(getCurrentUserId());
    return loadData();
  }, [loadData]);

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  if (loading) return <Spinner fullPage />;

  const navItems = [
    { to: '/', label: '🏠 Dashboard' },
    { to: '/calendar', label: '📅 Calendar' },
    { to: '/gantt', label: '📊 Gantt' },
    { to: '/add', label: '+ Add Leave' },
    { to: '/profile', label: '👤 Profile' },
    { to: '/settings', label: '⚙️ Settings' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <Toast message={error} onDismiss={() => setError('')} />
      <nav className="bg-white shadow-sm border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <span className="text-xl font-bold text-teal-700">🌿 Leave Planner</span>
            <div className="flex items-center gap-1 flex-wrap">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="ml-3 px-3 py-1.5 rounded-full text-sm font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={
            <Dashboard leaves={leaves} profiles={profiles} holidays={holidays} currentUserId={currentUserId} />
          } />
          <Route path="/calendar" element={
            <CalendarView leaves={leaves} profiles={profiles} holidays={holidays} settings={settings} onRefresh={refresh} />
          } />
          <Route path="/gantt" element={
            <GanttView leaves={leaves} profiles={profiles} holidays={holidays} />
          } />
          <Route path="/add" element={
            <LeaveForm leaves={leaves} profiles={profiles} holidays={holidays}
              onSave={async () => { await refresh(); navigate('/calendar'); }}
              onError={setError} />
          } />
          <Route path="/edit/:id" element={
            <LeaveForm leaves={leaves} profiles={profiles} holidays={holidays}
              onSave={async () => { await refresh(); navigate('/calendar'); }}
              onError={setError} />
          } />
          <Route path="/form" element={
            <ExternalForm profiles={profiles} holidays={holidays} onSave={refresh} onError={setError} />
          } />
          <Route path="/profile" element={
            <ProfilePage profiles={profiles} holidays={holidays} leaves={leaves}
              currentUserId={currentUserId}
              onSave={(newCurrentUserId) => {
                if (newCurrentUserId !== undefined) setCurrentUserIdState(newCurrentUserId);
                return refresh();
              }}
              onError={setError} />
          } />
          <Route path="/settings" element={
            <SettingsPage settings={settings} onSave={refresh} onError={setError} />
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
