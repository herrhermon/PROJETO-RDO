export function ProgressBar({ value, colorClass = 'bg-eqc-900' }: { value: number; colorClass?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
