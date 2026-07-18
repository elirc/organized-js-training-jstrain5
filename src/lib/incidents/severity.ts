export function classifySeverity(errorRate: number) {
  if (errorRate > 0.5) return "sev1";
  if (errorRate > 0.2) return "sev2";
  if (errorRate > 0.08) return "sev3";
  return "sev4";
}