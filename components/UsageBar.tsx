"use client";

interface UsageBarProps {
  used: number;
  limit: number;
  plan: string;
  credits?: number | null;
}

export default function UsageBar({ used, limit, plan, credits }: UsageBarProps) {
  if (plan === 'credits') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-blue-600">{credits}</span> credits left
        </span>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const isWarning = pct >= 80;
  const barColor = isWarning ? 'bg-orange-400' : 'bg-blue-500';
  const textColor = isWarning ? 'text-orange-600' : 'text-gray-600';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs ${textColor} whitespace-nowrap`}>
        {used}/{limit}
        {plan === 'pro' ? ' · Pro' : ' free'}
      </span>
    </div>
  );
}
