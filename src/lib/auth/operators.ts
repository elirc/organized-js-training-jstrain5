import type { Role } from "@/lib/auth/rbac";

export type OperatorRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
};

export const operators: OperatorRecord[] = [
  {
    id: "op_001",
    name: "Alex Rivera",
    email: "alex@novacom.internal",
    role: "super_admin",
    department: "Engineering",
  },
  {
    id: "op_002",
    name: "Jordan Lee",
    email: "jordan@novacom.internal",
    role: "ops_lead",
    department: "Operations",
  },
  {
    id: "op_003",
    name: "Morgan Chen",
    email: "morgan@novacom.internal",
    role: "ops_engineer",
    department: "Operations",
  },
  {
    id: "op_004",
    name: "Riley Santos",
    email: "riley@novacom.internal",
    role: "support",
    department: "Support",
  },
  {
    id: "op_005",
    name: "Avery Johnson",
    email: "avery@novacom.internal",
    role: "finance",
    department: "Finance",
  },
];

export const DEFAULT_OPERATOR_PASSWORD = "password123";
