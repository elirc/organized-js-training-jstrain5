export type OperationCommand = {
  key: string;
  dryRun: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  execute: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
};