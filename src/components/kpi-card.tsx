type KpiCardProps = {
  label: string;
  value: string;
  trend?: string;
};

export function KpiCard({ label, value, trend }: KpiCardProps) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {trend ? <p className="mt-1 text-xs text-slate-500">{trend}</p> : null}
    </div>
  );
}
