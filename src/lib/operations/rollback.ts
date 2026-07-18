export async function rollbackOperation(operationId: string) {
  return { operationId, status: "rollback_queued" as const };
}