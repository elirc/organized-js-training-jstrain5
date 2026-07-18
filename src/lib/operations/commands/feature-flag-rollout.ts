import type { OperationCommand } from "@/lib/operations/commands/base";

export const feature_flag_rollout: OperationCommand = {
  key: "feature.flag.rollout",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for feature-flag-rollout.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for feature-flag-rollout.",
  }),
};