import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "super_admin",
  "ops_lead",
  "ops_engineer",
  "support",
  "finance",
  "viewer",
]);

export const planEnum = pgEnum("plan", ["free", "starter", "business", "enterprise"]);
export const customerStatusEnum = pgEnum("customer_status", ["active", "suspended", "churned"]);
export const regionEnum = pgEnum("region", ["us-east", "us-west", "eu-west", "ap-south"]);
export const serviceStatusEnum = pgEnum("service_status", [
  "operational",
  "degraded",
  "major_outage",
  "maintenance",
]);
export const incidentSeverityEnum = pgEnum("incident_severity", ["sev1", "sev2", "sev3", "sev4"]);
export const incidentStatusEnum = pgEnum("incident_status", [
  "declared",
  "investigating",
  "monitoring",
  "resolved",
  "postmortem",
]);
export const operationStatusEnum = pgEnum("operation_status", [
  "draft",
  "pending_approval",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "rolled_back",
]);
export const dangerLevelEnum = pgEnum("danger_level", ["safe", "moderate", "dangerous", "critical"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "expired"]);
export const flagTypeEnum = pgEnum("flag_type", ["boolean", "percentage", "targeted"]);

export const operators = pgTable(
  "operators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: roleEnum("role").notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("operators_email_uidx").on(table.email),
  }),
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 120 }).notNull(),
    description: text("description"),
  },
  (table) => ({
    keyIdx: uniqueIndex("permissions_key_uidx").on(table.key),
  }),
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    role: roleEnum("role").notNull(),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.role, table.permissionId] }),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: varchar("company_name", { length: 180 }).notNull(),
    ownerName: varchar("owner_name", { length: 120 }).notNull(),
    ownerEmail: varchar("owner_email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerEmailIdx: index("accounts_owner_email_idx").on(table.ownerEmail),
  }),
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyName: varchar("company_name", { length: 180 }).notNull(),
    plan: planEnum("plan").notNull(),
    status: customerStatusEnum("status").notNull().default("active"),
    region: regionEnum("region").notNull(),
    industry: varchar("industry", { length: 80 }).notNull().default("other"),
    mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
    churnRiskScore: numeric("churn_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
    healthScore: numeric("health_score", { precision: 5, scale: 4 }).notNull().default("1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index("customers_account_idx").on(table.accountId),
    planIdx: index("customers_plan_idx").on(table.plan),
    statusIdx: index("customers_status_idx").on(table.status),
    regionIdx: index("customers_region_idx").on(table.region),
  }),
);

export const customerApiKeys = pgTable(
  "customer_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    tokenPrefix: varchar("token_prefix", { length: 20 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("customer_api_keys_customer_idx").on(table.customerId),
  }),
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    serviceType: varchar("service_type", { length: 40 }).notNull(),
    quantity: integer("quantity").notNull(),
    totalCost: numeric("total_cost", { precision: 12, scale: 4 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("usage_records_customer_idx").on(table.customerId),
    recordedAtIdx: index("usage_records_recorded_at_idx").on(table.recordedAt),
  }),
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("invoices_customer_idx").on(table.customerId),
  }),
);

export const creditAdjustments = pgTable(
  "credit_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => operators.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("credit_adjustments_customer_idx").on(table.customerId),
  }),
);

export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull().default("open"),
    reason: text("reason").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => ({
    customerIdx: index("disputes_customer_idx").on(table.customerId),
  }),
);

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  ownerTeam: varchar("owner_team", { length: 120 }).notNull(),
  status: serviceStatusEnum("status").notNull().default("operational"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceHealthChecks = pgTable(
  "service_health_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    region: regionEnum("region").notNull(),
    latencyP50Ms: numeric("latency_p50_ms", { precision: 10, scale: 2 }).notNull(),
    latencyP95Ms: numeric("latency_p95_ms", { precision: 10, scale: 2 }).notNull(),
    errorRate: numeric("error_rate", { precision: 8, scale: 5 }).notNull(),
    cpuPercent: numeric("cpu_percent", { precision: 5, scale: 2 }).notNull(),
    memoryPercent: numeric("memory_percent", { precision: 5, scale: 2 }).notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    serviceIdx: index("service_health_checks_service_idx").on(table.serviceId),
    checkedAtIdx: index("service_health_checks_checked_at_idx").on(table.checkedAt),
  }),
);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 240 }).notNull(),
    summary: text("summary").notNull(),
    severity: incidentSeverityEnum("severity").notNull(),
    status: incidentStatusEnum("status").notNull().default("declared"),
    commanderId: uuid("commander_id").references(() => operators.id, { onDelete: "set null" }),
    affectedRegions: text("affected_regions")
      .array()
      .notNull()
      .default(["us-east"]),
    affectedCustomerCount: integer("affected_customer_count").notNull().default(0),
    declaredAt: timestamp("declared_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("incidents_status_idx").on(table.status),
    severityIdx: index("incidents_severity_idx").on(table.severity),
  }),
);

export const incidentTimeline = pgTable(
  "incident_timeline",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    entryType: varchar("entry_type", { length: 40 }).notNull(),
    message: text("message").notNull(),
    createdBy: uuid("created_by").references(() => operators.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    incidentIdx: index("incident_timeline_incident_idx").on(table.incidentId),
  }),
);

export const operations = pgTable(
  "operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    command: varchar("command", { length: 120 }).notNull(),
    status: operationStatusEnum("status").notNull().default("draft"),
    dangerLevel: dangerLevelEnum("danger_level").notNull().default("safe"),
    dryRun: boolean("dry_run").notNull().default(true),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => operators.id),
    approvedBy: uuid("approved_by").references(() => operators.id, { onDelete: "set null" }),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("operations_status_idx").on(table.status),
    idempotencyKeyIdx: uniqueIndex("operations_idempotency_key_uidx").on(table.idempotencyKey),
  }),
);

export const operationLogs = pgTable(
  "operation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationId: uuid("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 120 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    message: text("message").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operationIdx: index("operation_logs_operation_idx").on(table.operationId),
  }),
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationId: uuid("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => operators.id),
    reviewerId: uuid("reviewer_id").references(() => operators.id, { onDelete: "set null" }),
    status: approvalStatusEnum("status").notNull().default("pending"),
    decisionNote: text("decision_note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operationIdx: index("approvals_operation_idx").on(table.operationId),
    statusIdx: index("approvals_status_idx").on(table.status),
  }),
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 140 }).notNull(),
    description: text("description").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => operators.id),
    flagType: flagTypeEnum("flag_type").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(false),
    rolloutPercentage: integer("rollout_percentage").notNull().default(0),
    targetingRules: jsonb("targeting_rules").notNull().default([]),
    staleThresholdDays: integer("stale_threshold_days").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: uniqueIndex("feature_flags_key_uidx").on(table.key),
  }),
);

export const runbooks = pgTable(
  "runbooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    steps: jsonb("steps").notNull().default([]),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => operators.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    titleIdx: index("runbooks_title_idx").on(table.title),
  }),
);

export const runbookExecutions = pgTable(
  "runbook_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runbookId: uuid("runbook_id")
      .notNull()
      .references(() => runbooks.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull().default("running"),
    context: jsonb("context").notNull().default({}),
    startedBy: uuid("started_by")
      .notNull()
      .references(() => operators.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => ({
    runbookIdx: index("runbook_executions_runbook_idx").on(table.runbookId),
  }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => operators.id),
    action: varchar("action", { length: 150 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceId: varchar("resource_id", { length: 120 }).notNull(),
    resourceLabel: varchar("resource_label", { length: 255 }),
    dangerLevel: dangerLevelEnum("danger_level").notNull().default("safe"),
    requestId: varchar("request_id", { length: 120 }),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
    actionIdx: index("audit_log_action_idx").on(table.action),
    resourceTypeIdx: index("audit_log_resource_type_idx").on(table.resourceType),
  }),
);
