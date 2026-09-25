import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const privacySettingsTable = pgTable("privacy_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  profileVisible: boolean("profile_visible").notNull().default(true),
  photoVisibility: text("photo_visibility").notNull().default("all_members"),
  contactVisibility: text("contact_visibility").notNull().default("private"),
  showOnlineStatus: boolean("show_online_status").notNull().default(false),
  interestPermissions: text("interest_permissions")
    .notNull()
    .default("all_members"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPrivacySettingsSchema = createInsertSchema(
  privacySettingsTable,
).omit({ updatedAt: true });
export type InsertPrivacySettings = z.infer<typeof insertPrivacySettingsSchema>;
export type PrivacySettings = typeof privacySettingsTable.$inferSelect;