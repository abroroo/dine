import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurant management
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurant tables
export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  tableNumber: varchar("table_number", { length: 50 }).notNull(),
  qrCode: varchar("qr_code", { length: 100 }).unique().notNull(),
  status: varchar("status", { length: 20 }).default('available'), // available, active, occupied
  sessionData: jsonb("session_data").default({}),
  sessionExpiresAt: timestamp("session_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Menu items
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("image_url"),
  available: boolean("available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table sessions for collaboration
export const tableSessions = pgTable("table_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: uuid("table_id").references(() => tables.id).notNull(),
  sessionKey: varchar("session_key", { length: 100 }).unique().notNull(),
  participants: integer("participants").default(0),
  cartData: jsonb("cart_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: uuid("table_id").references(() => tables.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  sessionId: uuid("session_id").references(() => tableSessions.id),
  items: jsonb("items").notNull(), // Array of order items with quantities
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default('received'), // received, preparing, ready, completed
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const restaurantRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, {
    fields: [restaurants.ownerId],
    references: [users.id],
  }),
  tables: many(tables),
  menuItems: many(menuItems),
  orders: many(orders),
}));

export const tableRelations = relations(tables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
  sessions: many(tableSessions),
  orders: many(orders),
}));

export const menuItemRelations = relations(menuItems, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
}));

export const tableSessionRelations = relations(tableSessions, ({ one, many }) => ({
  table: one(tables, {
    fields: [tableSessions.tableId],
    references: [tables.id],
  }),
  orders: many(orders),
}));

export const orderRelations = relations(orders, ({ one }) => ({
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  session: one(tableSessions, {
    fields: [orders.sessionId],
    references: [tableSessions.id],
  }),
}));

// Insert schemas
export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  createdAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
});

export const insertTableSessionSchema = createInsertSchema(tableSessions).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Secure order schema that only accepts item IDs and quantities from clients
export const secureOrderSchema = z.object({
  tableId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  sessionId: z.string().uuid().nullable().optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })),
  specialInstructions: z.string().optional(),
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type TableSession = typeof tableSessions.$inferSelect;
export type InsertTableSession = z.infer<typeof insertTableSessionSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type SecureOrder = z.infer<typeof secureOrderSchema>;
