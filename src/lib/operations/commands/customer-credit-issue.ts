import type { OperationCommand } from "@/lib/operations/commands/base";

export const customer_credit_issue: OperationCommand = {
  key: "customer.credit.issue",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for customer-credit-issue.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for customer-credit-issue.",
  }),
};