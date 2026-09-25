import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const profilesTable = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    gender: text("gender").notNull(),
    heightCm: integer("height_cm").notNull(),
    weightKg: integer("weight_kg"),
    motherTongue: text("mother_tongue").notNull().default(""),
    maritalStatus: text("marital_status").notNull().default(""),
    location: text("location").notNull().default(""),
    country: text("country").notNull().default("India"),
    introduction: text("introduction").notNull().default(""),
    published: boolean("published").notNull().default(false),
    verificationStatus: text("verification_status")
      .notNull()
      .default("unverified"),
    verificationNote: text("verification_note"),
    verificationSubmittedAt: timestamp("verification_submitted_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("profiles_user_id_unique").on(table.userId),
    index("profiles_discovery_idx").on(
      table.published,
      table.verificationStatus,
      table.location,
    ),
  ],
);

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;

export const profilePhotosTable = pgTable(
  "profile_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    objectPath: text("object_path").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    visibility: text("visibility").notNull().default("all_members"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("profile_photos_profile_idx").on(table.profileId)],
);

export const insertProfilePhotoSchema = createInsertSchema(
  profilePhotosTable,
).omit({ id: true, createdAt: true });
export type InsertProfilePhoto = z.infer<typeof insertProfilePhotoSchema>;
export type ProfilePhoto = typeof profilePhotosTable.$inferSelect;