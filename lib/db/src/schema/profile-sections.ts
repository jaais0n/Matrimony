import {
  boolean,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const faithDetailsTable = pgTable("faith_details", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  religion: text("religion").notNull().default("Christian"),
  denomination: text("denomination").notNull().default(""),
  church: text("church").notNull().default(""),
  baptismStatus: text("baptism_status").notNull().default(""),
  baptismYear: integer("baptism_year"),
  churchInvolvement: text("church_involvement").notNull().default(""),
  ministryInvolvement: text("ministry_involvement").notNull().default(""),
  spiritualExpectations: text("spiritual_expectations").notNull().default(""),
  faithDescription: text("faith_description").notNull().default(""),
});
export const insertFaithDetailsSchema = createInsertSchema(faithDetailsTable);
export type InsertFaithDetails = z.infer<typeof insertFaithDetailsSchema>;
export type FaithDetails = typeof faithDetailsTable.$inferSelect;

export const educationDetailsTable = pgTable("education_details", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  qualification: text("qualification").notNull().default(""),
  degree: text("degree").notNull().default(""),
  institution: text("institution").notNull().default(""),
  fieldOfStudy: text("field_of_study").notNull().default(""),
});
export const insertEducationDetailsSchema =
  createInsertSchema(educationDetailsTable);
export type InsertEducationDetails = z.infer<
  typeof insertEducationDetailsSchema
>;
export type EducationDetails = typeof educationDetailsTable.$inferSelect;

export const employmentDetailsTable = pgTable("employment_details", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  occupation: text("occupation").notNull().default(""),
  company: text("company").notNull().default(""),
  workLocation: text("work_location").notNull().default(""),
  employmentStatus: text("employment_status").notNull().default(""),
  workingAbroad: boolean("working_abroad").notNull().default(false),
  country: text("country").notNull().default("India"),
});
export const insertEmploymentDetailsSchema = createInsertSchema(
  employmentDetailsTable,
);
export type InsertEmploymentDetails = z.infer<
  typeof insertEmploymentDetailsSchema
>;
export type EmploymentDetails = typeof employmentDetailsTable.$inferSelect;

export const familyDetailsTable = pgTable("family_details", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  familyStatus: text("family_status").notNull().default(""),
  fatherOccupation: text("father_occupation").notNull().default(""),
  motherOccupation: text("mother_occupation").notNull().default(""),
  siblings: text("siblings").notNull().default(""),
  background: text("background").notNull().default(""),
  values: text("values").notNull().default(""),
});
export const insertFamilyDetailsSchema = createInsertSchema(familyDetailsTable);
export type InsertFamilyDetails = z.infer<typeof insertFamilyDetailsSchema>;
export type FamilyDetails = typeof familyDetailsTable.$inferSelect;

export const partnerPreferencesTable = pgTable("partner_preferences", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  ageMin: integer("age_min").notNull().default(18),
  ageMax: integer("age_max").notNull().default(60),
  locations: text("locations").array().notNull().default([]),
  denomination: text("denomination").notNull().default(""),
  education: text("education").notNull().default(""),
  occupation: text("occupation").notNull().default(""),
  workLocation: text("work_location").notNull().default(""),
  familyValues: text("family_values").notNull().default(""),
  spiritualExpectations: text("spiritual_expectations").notNull().default(""),
  other: text("other").notNull().default(""),
});
export const insertPartnerPreferencesSchema = createInsertSchema(
  partnerPreferencesTable,
);
export type InsertPartnerPreferences = z.infer<
  typeof insertPartnerPreferencesSchema
>;
export type PartnerPreferences = typeof partnerPreferencesTable.$inferSelect;