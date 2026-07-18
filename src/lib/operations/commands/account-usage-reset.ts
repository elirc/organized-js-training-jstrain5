import type { OperationCommand } from "@/lib/operations/commands/base";

export const account_usage_reset: OperationCommand = {
  key: "account.usage.reset",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for account-usage-reset.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for account-usage-reset.",
  }),
};