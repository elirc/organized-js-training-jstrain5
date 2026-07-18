import type { OperationCommand } from "@/lib/operations/commands/base";

export const infra_rate_limit_adjust: OperationCommand = {
  key: "infra.rate.limit.adjust",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for infra-rate-limit-adjust.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for infra-rate-limit-adjust.",
  }),
};