export async function createApprovalRequest(operationId: string) {
  return { operationId, status: "pending" as const };
}