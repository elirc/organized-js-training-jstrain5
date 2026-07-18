import { auth } from "@/auth";
import { hasPermission, type PermissionKey, type Role } from "@/lib/auth/rbac";

export async function requirePermission(permission: PermissionKey) {
  const session = await auth();

  if (!session?.user?.role) {
    return {
      allowed: false,
      reason: "UNAUTHORIZED",
    } as const;
  }

  const allowed = hasPermission(session.user.role as Role, permission);
  return {
    allowed,
    reason: allowed ? null : "FORBIDDEN",
    session,
  } as const;
}
