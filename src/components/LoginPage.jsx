import { useState } from 'react';

const PASSWORD_HASH = '136eaa7c3d8505ac05b2726d5c1a1c4a3d582ef5b623542f5b12264ad5f47668';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const hash = await hashPassword(password);
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem('lp_authenticated', 'true');
      onLogin();
    } else {
      setError('Incorrect password. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="text-2xl font-bold text-teal-700">Leave Planner</h1>
          <p className="text-stone-400 text-sm mt-1">Plan time off together</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter team password"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm bg-stone-50"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-teal-600 text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? 'Checking…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
