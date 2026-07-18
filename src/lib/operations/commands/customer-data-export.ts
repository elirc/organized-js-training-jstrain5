import type { OperationCommand } from "@/lib/operations/commands/base";

export const customer_data_export: OperationCommand = {
  key: "customer.data.export",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for customer-data-export.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for customer-data-export.",
  }),
};