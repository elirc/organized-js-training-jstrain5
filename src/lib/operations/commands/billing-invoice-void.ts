import type { OperationCommand } from "@/lib/operations/commands/base";

export const billing_invoice_void: OperationCommand = {
  key: "billing.invoice.void",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for billing-invoice-void.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for billing-invoice-void.",
  }),
};