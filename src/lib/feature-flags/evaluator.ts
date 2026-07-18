import { hashToBucket } from "@/lib/feature-flags/rollout";

type FlagType = "boolean" | "percentage" | "targeted";

type FeatureFlag = {
  key: string;
  flagType: FlagType;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetingRules: Array<{ plan?: string; region?: string; customerIds?: string[] }>;
};

type Customer = {
  id: string;
  plan: string;
  region: string;
};

export function evaluateFlag(flag: FeatureFlag, customer: Customer): boolean {
  if (!flag.isEnabled) return false;
  if (flag.flagType === "boolean") return true;

  if (flag.flagType === "percentage") {
    const bucket = hashToBucket(flag.key, customer.id);
    return bucket < flag.rolloutPercentage;
  }

  return flag.targetingRules.some((rule) => {
    if (rule.plan && rule.plan !== customer.plan) return false;
    if (rule.region && rule.region !== customer.region) return false;
    if (rule.customerIds && !rule.customerIds.includes(customer.id)) return false;
    return true;
  });
}