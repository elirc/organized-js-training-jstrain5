import type { OperationCommand } from "@/lib/operations/commands/base";

export const billing_credit_bulk: OperationCommand = {
  key: "billing.credit.bulk",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for billing-credit-bulk.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for billing-credit-bulk.",
  }),
};