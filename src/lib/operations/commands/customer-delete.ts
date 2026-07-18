import type { OperationCommand } from "@/lib/operations/commands/base";

export const customer_delete: OperationCommand = {
  key: "customer.delete",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for customer-delete.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for customer-delete.",
  }),
};