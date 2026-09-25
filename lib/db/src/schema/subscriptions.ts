import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("free"), // 'free' | 'premium'
    status: text("status").notNull().default("active"), // 'active' | 'cancelled' | 'expired'
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    interestsQuota: integer("interests_quota").notNull().default(10), // free limit, -1 for unlimited
    canViewContact: boolean("can_view_contact").notNull().default(false),
    canUseAdvancedFilters: boolean("can_use_advanced_filters").notNull().default(false),
    hasProfileBoost: boolean("has_profile_boost").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("subscriptions_user_idx").on(table.userId, table.status)],
);

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
