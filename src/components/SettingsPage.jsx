import { useState } from 'react';
import { persistSettings } from '../api.js';

const AVAILABLE_COUNTRIES = [
  { code: 'AT', name: 'Austria' }, { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'BR', name: 'Brazil' }, { code: 'CA', name: 'Canada' },
  { code: 'CH', name: 'Switzerland' }, { code: 'CN', name: 'China' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' }, { code: 'EE', name: 'Estonia' },
  { code: 'ES', name: 'Spain' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'GR', name: 'Greece' }, { code: 'HR', name: 'Croatia' },
  { code: 'HU', name: 'Hungary' }, { code: 'IE', name: 'Ireland' },
  { code: 'IN', name: 'India' }, { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' }, { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' }, { code: 'LV', name: 'Latvia' },
  { code: 'MX', name: 'Mexico' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' }, { code: 'SE', name: 'Sweden' },
  { code: 'SI', name: 'Slovenia' }, { code: 'SK', name: 'Slovakia' },
  { code: 'TR', name: 'Turkey' }, { code: 'UA', name: 'Ukraine' },
  { code: 'US', name: 'United States' }, { code: 'ZA', name: 'South Africa' },
];

export default function SettingsPage({ settings, onSave, onError }) {
  const [countries, setCountries] = useState(settings.countries || []);
  const [year, setYear] = useState(settings.year || new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleCountry(code) {
    setCountries((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await persistSettings({ countries, year });
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      onError('Could not save settings — please try again.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = AVAILABLE_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-stone-800">Settings</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
        <h3 className="text-base font-semibold text-stone-700">Calendar Year</h3>
        <input type="number" value={year} min={2020} max={2030}
          onChange={(e) => { setYear(Number(e.target.value)); setSaved(false); }}
          className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 w-32 focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-4">
        <h3 className="text-base font-semibold text-stone-700">Public Holiday Countries</h3>
        <p className="text-sm text-stone-400">Select countries to import their public holidays — these won't count as leave days.</p>

        {countries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {countries.map((code) => {
              const country = AVAILABLE_COUNTRIES.find((c) => c.code === code);
              return (
                <span key={code} className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium">
                  {country?.name || code}
                  <button onClick={() => toggleCountry(code)} className="ml-1 text-teal-400 hover:text-teal-600 text-base leading-none">×</button>
                </span>
              );
            })}
          </div>
        )}

        <input type="text" placeholder="Search countries…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400" />

        <div className="max-h-64 overflow-y-auto border border-stone-100 rounded-xl">
          {filtered.map((c) => (
            <label key={c.code} className="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 cursor-pointer border-b border-stone-50 last:border-0">
              <input type="checkbox" checked={countries.includes(c.code)} onChange={() => toggleCountry(c.code)}
                className="rounded text-teal-600 focus:ring-teal-400" />
              <span className="text-sm text-stone-700">{c.name} <span className="text-stone-400">({c.code})</span></span>
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className={`w-full py-2.5 px-4 rounded-xl font-medium text-white text-sm transition-colors disabled:opacity-50 ${saved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}>
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
