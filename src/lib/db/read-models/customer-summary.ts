export async function refreshCustomerSummaryReadModel() {
  return { refreshedAt: new Date().toISOString(), readModel: "customer_summary_mv" };
}
