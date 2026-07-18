import type { OperationCommand } from "@/lib/operations/commands/base";

export const account_api_key_rotate: OperationCommand = {
  key: "account.api.key.rotate",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for account-api-key-rotate.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for account-api-key-rotate.",
  }),
};