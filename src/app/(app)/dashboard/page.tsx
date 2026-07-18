import { KpiCard } from "@/components/kpi-card";
import { dashboardKpis, systemHealthRows } from "@/lib/mock/dashboard";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Operations Dashboard</h2>
          <p className="text-dim mt-1">Live operational pulse across customers, services, and workflows.</p>
        </div>
        <div className="badge badge-danger">Incident bridge active</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} />
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-semibold">Regional Service Health</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Region</th>
                <th className="px-4 py-2">P95 Latency</th>
                <th className="px-4 py-2">Error Rate</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {systemHealthRows.map((row) => (
                <tr key={`${row.service}-${row.region}`} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{row.service}</td>
                  <td className="px-4 py-3">{row.region}</td>
                  <td className="px-4 py-3">{row.latencyP95}ms</td>
                  <td className="px-4 py-3">{row.errorRate.toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        row.status === "operational" ? "badge-safe" : "badge-danger"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
