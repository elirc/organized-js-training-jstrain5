import type { OperationCommand } from "@/lib/operations/commands/base";

export const customer_plan_change: OperationCommand = {
  key: "customer.plan.change",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for customer-plan-change.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for customer-plan-change.",
  }),
};