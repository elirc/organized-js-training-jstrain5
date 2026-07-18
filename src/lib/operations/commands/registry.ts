import type { OperationCommand } from "@/lib/operations/commands/base";

const registry = new Map<string, OperationCommand>();

export function registerCommand(command: OperationCommand) {
  registry.set(command.key, command);
}

export function getCommand(key: string) {
  return registry.get(key);
}