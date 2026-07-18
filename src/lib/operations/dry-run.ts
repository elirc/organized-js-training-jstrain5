export async function simulateOperation(command: string, targetIds: string[]) {
  return {
    command,
    targetCount: targetIds.length,
    blockers: [],
    warnings: [],
  };
}