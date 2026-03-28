import { useState, useEffect } from 'react';
import { saveSettings } from '../store.js';

const AVAILABLE_COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CN', name: 'China' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GR', name: 'Greece' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IN', name: 'India' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'US', name: 'United States' },
  { code: 'ZA', name: 'South Africa' },
];

export default function SettingsPage({ settings, onSave }) {
  const [countries, setCountries] = useState(settings.countries || []);
  const [year, setYear] = useState(settings.year || new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);

  function toggleCountry(code) {
    setCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setSaved(false);
  }

  function handleSave() {
    saveSettings({ countries, year });
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const filtered = AVAILABLE_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">Calendar Year</h3>
        <input
          type="number"
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value));
            setSaved(false);
          }}
          min={2020}
          max={2030}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">Public Holiday Countries</h3>
        <p className="text-sm text-gray-500">
          Select one or more countries to import their public holidays. These days will
          not count as leave days.
        </p>

        {countries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {countries.map((code) => {
              const country = AVAILABLE_COUNTRIES.find((c) => c.code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm"
                >
                  {country?.name || code}
                  <button
                    onClick={() => toggleCountry(code)}
                    className="ml-1 text-indigo-400 hover:text-indigo-700"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <input
          type="text"
          placeholder="Search countries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />

        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
          {filtered.map((c) => (
            <label
              key={c.code}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
            >
              <input
                type="checkbox"
                checked={countries.includes(c.code)}
                onChange={() => toggleCountry(c.code)}
                className="rounded text-indigo-600"
              />
              <span className="text-sm text-gray-700">
                {c.name}{' '}
                <span className="text-gray-400">({c.code})</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-2 px-4 rounded-md font-medium text-white ${
          saved
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
