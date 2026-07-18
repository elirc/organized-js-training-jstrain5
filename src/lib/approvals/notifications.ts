export async function notifyApprovers(approvalId: string) {
  return { approvalId, notified: true };
}