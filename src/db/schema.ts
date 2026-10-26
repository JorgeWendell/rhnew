import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const accountsTable = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verificationsTable = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const punchTypeEnum = pgEnum("punch_type", [
  "entry",
  "lunch_out",
  "lunch_in",
  "exit",
]);

export const punchSourceEnum = pgEnum("punch_source", ["facial", "manual"]);

export const companiesTable = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    cnpj: varchar("cnpj", { length: 18 }),
    contact: varchar("contact", { length: 150 }),
    whatsapp: varchar("whatsapp", { length: 20 }),
    email: varchar("email", { length: 150 }),
    active: boolean("active").default(true).notNull(),
    notes: text("notes"),
    toleranceMinutes: integer("tolerance_minutes").default(10).notNull(),
    nightStart: varchar("night_start", { length: 5 }).default("22:00").notNull(),
    nightEnd: varchar("night_end", { length: 5 }).default("05:00").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [index("companies_name_idx").on(table.name)],
);

export const workdayRulesTable = pgTable(
  "workday_rules",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    expectedMinutes: integer("expected_minutes").notNull(),
    firstOvertimeMinutes: integer("first_overtime_minutes").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.companyId, table.weekday] }),
  ],
);

export const holidaysTable = pgTable(
  "holidays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    holidayDate: date("holiday_date", { mode: "string" }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("holidays_company_date_uq").on(table.companyId, table.holidayDate),
    index("holidays_company_idx").on(table.companyId),
  ],
);

export const employeesTable = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    registration: varchar("registration", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    admissionDate: date("admission_date", { mode: "string" }).notNull(),
    active: boolean("active").default(true).notNull(),
    faceDescriptor: jsonb("face_descriptor").$type<number[]>(),
    facePhoto: text("face_photo"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("employees_company_registration_uq").on(
      table.companyId,
      table.registration,
    ),
    index("employees_company_idx").on(table.companyId),
    index("employees_name_idx").on(table.name),
  ],
);

export const punchesTable = pgTable(
  "punches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employeesTable.id, { onDelete: "cascade" }),
    type: punchTypeEnum("type").notNull(),
    punchedAt: timestamp("punched_at", { withTimezone: true }).notNull(),
    source: punchSourceEnum("source").notNull(),
    faceDistance: real("face_distance"),
    createdByUserId: text("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("punches_employee_punched_at_idx").on(table.employeeId, table.punchedAt),
    uniqueIndex("punches_employee_type_day_uidx").on(
      table.employeeId,
      table.type,
      sql`((${table.punchedAt} AT TIME ZONE 'America/Sao_Paulo')::date)`,
    ),
  ],
);

export const dayMarksTable = pgTable(
  "day_marks",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employeesTable.id, { onDelete: "cascade" }),
    workDate: date("work_date", { mode: "string" }).notNull(),
    abono: boolean("abono").default(false).notNull(),
    status: varchar("status", { length: 20 }).default("normal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.employeeId, table.workDate] })],
);
