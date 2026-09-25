import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { usersTable } from "./users";

export const denominationsTable = pgTable("denominations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const churchesTable = pgTable(
  "churches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    denominationId: uuid("denomination_id").references(
      () => denominationsTable.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    location: text("location").notNull(),
    seniorPastor: text("senior_pastor"),
    contactPhone: text("contact_phone"),
    verified: boolean("verified").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("churches_name_loc_idx").on(table.name, table.location)],
);

export const verificationRequestsTable = pgTable(
  "verification_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    identityDocumentType: text("identity_document_type"),
    identityDocumentUrl: text("identity_document_url"),
    churchLetterUrl: text("church_letter_url"),
    pastorContact: text("pastor_contact"),
    status: text("status").notNull().default("under_review"), // 'unverified' | 'under_review' | 'verified' | 'rejected'
    reviewerId: text("reviewer_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [index("verification_requests_status_idx").on(table.status)],
);

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // 'user.created', 'profile.verified', 'interest.sent', 'user.blocked'
    targetId: text("target_id"),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("audit_logs_action_created_idx").on(table.action, table.createdAt)],
);

export const insertDenominationSchema = createInsertSchema(denominationsTable);
export const insertChurchSchema = createInsertSchema(churchesTable);
export const insertVerificationRequestSchema = createInsertSchema(verificationRequestsTable);
export const insertAuditLogSchema = createInsertSchema(auditLogsTable);
