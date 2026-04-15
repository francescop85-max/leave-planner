import { useEffect } from 'react';

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-2xl shadow-lg">
      <span>⚠️ {message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 ml-2 text-lg leading-none">×</button>
    </div>
  );
}
