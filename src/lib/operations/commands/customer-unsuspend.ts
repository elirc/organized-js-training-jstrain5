import type { OperationCommand } from "@/lib/operations/commands/base";

export const customer_unsuspend: OperationCommand = {
  key: "customer.unsuspend",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for customer-unsuspend.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for customer-unsuspend.",
  }),
};