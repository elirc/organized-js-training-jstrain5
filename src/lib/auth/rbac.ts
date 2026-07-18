export const permissionKeys = [
  "dashboard.read",
  "customers.read",
  "customers.write",
  "operations.execute",
  "operations.approve",
  "incidents.manage",
  "billing.manage",
  "feature_flags.manage",
  "settings.manage",
  "audit.read",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export type Role =
  | "super_admin"
  | "ops_lead"
  | "ops_engineer"
  | "support"
  | "finance"
  | "viewer";

const rolePermissions: Record<Role, PermissionKey[]> = {
  super_admin: [...permissionKeys],
  ops_lead: [
    "dashboard.read",
    "customers.read",
    "customers.write",
    "operations.execute",
    "operations.approve",
    "incidents.manage",
    "feature_flags.manage",
    "audit.read",
  ],
  ops_engineer: [
    "dashboard.read",
    "customers.read",
    "customers.write",
    "operations.execute",
    "incidents.manage",
    "feature_flags.manage",
    "audit.read",
  ],
  support: ["dashboard.read", "customers.read", "customers.write", "incidents.manage", "audit.read"],
  finance: ["dashboard.read", "customers.read", "billing.manage", "audit.read"],
  viewer: ["dashboard.read", "customers.read"],
};

export function hasPermission(role: Role, permission: PermissionKey) {
  return rolePermissions[role]?.includes(permission) ?? false;
}
