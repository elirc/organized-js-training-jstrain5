export async function checkRateLimit(operatorId: string, command: string) {
  return { allowed: true, remaining: 10, operatorId, command };
}