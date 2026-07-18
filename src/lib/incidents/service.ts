export async function createIncident(title: string) {
  return { id: `inc_${Date.now()}`, title, status: "declared" as const };
}