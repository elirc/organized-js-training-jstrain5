export type CustomerStatus = "active" | "suspended" | "churned";
export type CustomerPlan = "free" | "starter" | "business" | "enterprise";
export type Region = "us-east" | "us-west" | "eu-west" | "ap-south";

export type MockCustomer = {
  id: string;
  companyName: string;
  plan: CustomerPlan;
  status: CustomerStatus;
  region: Region;
  mrr: number;
  churnRiskScore: number;
  healthScore: number;
};

export const mockCustomers: MockCustomer[] = [
  {
    id: "cus_001",
    companyName: "Acme Telecom Labs",
    plan: "enterprise",
    status: "active",
    region: "us-east",
    mrr: 4200,
    churnRiskScore: 0.11,
    healthScore: 0.92,
  },
  {
    id: "cus_002",
    companyName: "Northwind Retail Cloud",
    plan: "business",
    status: "active",
    region: "us-west",
    mrr: 390,
    churnRiskScore: 0.27,
    healthScore: 0.71,
  },
  {
    id: "cus_003",
    companyName: "Helio Health Systems",
    plan: "starter",
    status: "suspended",
    region: "eu-west",
    mrr: 79,
    churnRiskScore: 0.81,
    healthScore: 0.39,
  },
  {
    id: "cus_004",
    companyName: "Orbit Education Group",
    plan: "free",
    status: "active",
    region: "ap-south",
    mrr: 0,
    churnRiskScore: 0.43,
    healthScore: 0.61,
  },
  {
    id: "cus_005",
    companyName: "Pioneer Payments Co",
    plan: "enterprise",
    status: "active",
    region: "us-east",
    mrr: 3180,
    churnRiskScore: 0.18,
    healthScore: 0.89,
  },
];
