export const dashboardKpis = [
  { label: "Active Customers", value: "44,983", trend: "+0.8% vs 7d" },
  { label: "MRR", value: "$6.92M", trend: "+1.7% vs 30d" },
  { label: "API Calls Today", value: "1.84M", trend: "-2.1% vs yesterday" },
  { label: "Error Rate (5m)", value: "0.42%", trend: "Within SLO" },
  { label: "Active Incidents", value: "2", trend: "1 SEV2, 1 SEV3" },
  { label: "Pending Approvals", value: "5", trend: "2 expire < 6h" },
  { label: "Operations Today", value: "113", trend: "8 running now" },
  { label: "High Churn Risk", value: "4,982", trend: "11.1% of active accounts" },
] as const;

export const systemHealthRows = [
  { service: "Voice API", region: "us-east", latencyP95: 118, errorRate: 0.38, status: "operational" },
  { service: "SMS Gateway", region: "eu-west", latencyP95: 241, errorRate: 1.22, status: "degraded" },
  { service: "Billing Service", region: "us-west", latencyP95: 134, errorRate: 0.29, status: "operational" },
  { service: "Data Pipeline", region: "ap-south", latencyP95: 387, errorRate: 3.84, status: "investigating" },
] as const;
