import type { OperationCommand } from "@/lib/operations/commands/base";

export const billing_refund: OperationCommand = {
  key: "billing.refund",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for billing-refund.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for billing-refund.",
  }),
};