import type { OperationCommand } from "@/lib/operations/commands/base";

export const infra_service_toggle: OperationCommand = {
  key: "infra.service.toggle",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for infra-service-toggle.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for infra-service-toggle.",
  }),
};