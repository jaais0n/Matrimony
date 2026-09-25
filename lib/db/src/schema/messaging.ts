import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileAId: uuid("profile_a_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    profileBId: uuid("profile_b_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // 'active' | 'ended' | 'blocked'
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("conversations_participants_unique").on(
      table.profileAId,
      table.profileBId,
    ),
    index("conversations_profile_a_idx").on(table.profileAId),
    index("conversations_profile_b_idx").on(table.profileBId),
  ],
);

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;

export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderProfileId: uuid("sender_profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    read: boolean("read").notNull().default(false),
    delivered: boolean("delivered").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId, table.createdAt),
  ],
);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
