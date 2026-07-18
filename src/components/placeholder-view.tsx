type PlaceholderViewProps = {
  title: string;
  description: string;
  readiness?: "foundation" | "scaffolded";
};

export function PlaceholderView({
  title,
  description,
  readiness = "scaffolded",
}: PlaceholderViewProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-dim mt-1">{description}</p>
      </div>
      <div className="panel p-5">
        <p className="text-sm">
          This page is wired into the OpsForge app shell and route tree. Domain logic and tables will be
          layered in subsequent phases.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Readiness:{" "}
          <span className={readiness === "foundation" ? "badge badge-safe" : "badge bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"}>
            {readiness}
          </span>
        </p>
      </div>
    </section>
  );
}
