export async function refreshBillingSummaryReadModel() {
  return { refreshedAt: new Date().toISOString(), readModel: "billing_summary_mv" };
}
