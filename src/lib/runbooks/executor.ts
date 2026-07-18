export async function executeRunbook(runbookId: string) {
  return { runbookId, status: "running" as const };
}