export default function Spinner({ fullPage = false }) {
  const spinner = (
    <div className="flex items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      <span className="text-stone-500 text-sm font-medium">Loading…</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
