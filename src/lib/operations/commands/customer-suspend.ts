import type { OperationCommand } from "@/lib/operations/commands/base";

export const customer_suspend: OperationCommand = {
  key: "customer.suspend",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for customer-suspend.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for customer-suspend.",
  }),
};