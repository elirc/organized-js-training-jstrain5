export function requiresApproval(command: string, targetCount: number) {
  return command.includes("delete") || targetCount > 100;
}