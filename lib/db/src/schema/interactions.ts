import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { usersTable } from "./users";

export const interestsTable = pgTable(
  "interests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromProfileId: uuid("from_profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    toProfileId: uuid("to_profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("interests_from_to_unique").on(
      table.fromProfileId,
      table.toProfileId,
    ),
    index("interests_to_status_idx").on(table.toProfileId, table.status),
  ],
);
export const insertInterestSchema = createInsertSchema(interestsTable).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});
export type InsertInterest = z.infer<typeof insertInterestSchema>;
export type InterestRecord = typeof interestsTable.$inferSelect;

export const savedProfilesTable = pgTable(
  "saved_profiles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.profileId] })],
);
export const insertSavedProfileSchema = createInsertSchema(savedProfilesTable);
export type InsertSavedProfile = z.infer<typeof insertSavedProfileSchema>;

export const blockedUsersTable = pgTable(
  "blocked_users",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    blockedUserId: text("blocked_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedUserId] }),
  ],
);
export const insertBlockedUserSchema = createInsertSchema(blockedUsersTable);
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;