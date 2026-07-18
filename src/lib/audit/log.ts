type DangerLevel = "safe" | "moderate" | "dangerous" | "critical";

export type AuditLogInput = {
  operatorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  dangerLevel?: DangerLevel;
  operationId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function auditLog(params: AuditLogInput) {
  // Placeholder implementation. In next phase this should write to `audit_log` table.
  if (process.env.NODE_ENV !== "production") {
    console.log("[audit]", params.action, params.resourceType, params.resourceId);
  }
}
