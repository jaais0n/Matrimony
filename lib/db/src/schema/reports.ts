import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { usersTable } from "./users";

export const reportsTable = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    reportedProfileId: uuid("reported_profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("reports_status_created_idx").on(table.status, table.createdAt)],
);
export const insertReportSchema = createInsertSchema(reportsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;