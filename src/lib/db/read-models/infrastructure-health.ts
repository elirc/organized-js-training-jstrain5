export async function refreshInfrastructureHealthReadModel() {
  return { refreshedAt: new Date().toISOString(), readModel: "infrastructure_health_mv" };
}
