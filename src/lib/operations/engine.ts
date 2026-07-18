export async function executeOperation(operationId: string) {
  return { operationId, status: "queued" as const };
}