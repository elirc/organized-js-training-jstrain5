import type { OperationCommand } from "@/lib/operations/commands/base";

export const infra_region_failover: OperationCommand = {
  key: "infra.region.failover",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for infra-region-failover.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for infra-region-failover.",
  }),
};