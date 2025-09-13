import {
  users,
  restaurants,
  tables,
  menuItems,
  tableSessions,
  orders,
  type User,
  type UpsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Table,
  type InsertTable,
  type MenuItem,
  type InsertMenuItem,
  type TableSession,
  type InsertTableSession,
  type Order,
  type InsertOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Restaurant operations
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  
  // Table operations
  getTable(id: string): Promise<Table | undefined>;
  getTableByQrCode(qrCode: string): Promise<Table | undefined>;
  getRestaurantTables(restaurantId: string): Promise<Table[]>;
  createTable(table: InsertTable): Promise<Table>;
  updateTableStatus(id: string, status: string, sessionData?: any): Promise<Table | undefined>;
  
  // Menu operations
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItemsByCategory(restaurantId: string, category: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  getMenuItemsByIds(ids: string[]): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  
  // Table session operations
  getTableSession(sessionKey: string): Promise<TableSession | undefined>;
  getActiveSessionByTableId(tableId: string): Promise<TableSession | undefined>;
  createTableSession(session: InsertTableSession): Promise<TableSession>;
  updateTableSessionCart(sessionKey: string, cartData: any, participants: number): Promise<TableSession | undefined>;
  
  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getRestaurantOrders(restaurantId: string): Promise<Order[]>;
  getActiveOrders(restaurantId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Restaurant operations
  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
    return restaurant;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db
      .insert(restaurants)
      .values(restaurant)
      .returning();
    return newRestaurant;
  }

  // Table operations
  async getTable(id: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table;
  }

  async getTableByQrCode(qrCode: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.qrCode, qrCode));
    return table;
  }

  async getRestaurantTables(restaurantId: string): Promise<Table[]> {
    return await db.select().from(tables).where(eq(tables.restaurantId, restaurantId));
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [newTable] = await db
      .insert(tables)
      .values(table)
      .returning();
    return newTable;
  }

  async updateTableStatus(id: string, status: string, sessionData?: any): Promise<Table | undefined> {
    const updateData: any = { status };
    if (sessionData !== undefined) {
      updateData.sessionData = sessionData;
    }
    
    const [table] = await db
      .update(tables)
      .set(updateData)
      .where(eq(tables.id, id))
      .returning();
    return table;
  }

  // Menu operations
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.available, true)));
  }

  async getMenuItemsByCategory(restaurantId: string, category: string): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, restaurantId),
          eq(menuItems.category, category),
          eq(menuItems.available, true)
        )
      );
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.id, id), eq(menuItems.available, true)));
    return menuItem;
  }

  async getMenuItemsByIds(ids: string[]): Promise<MenuItem[]> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(menuItems)
      .where(and(
        inArray(menuItems.id, ids),
        eq(menuItems.available, true)
      ));
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newMenuItem] = await db
      .insert(menuItems)
      .values(menuItem)
      .returning();
    return newMenuItem;
  }

  // Table session operations
  async getTableSession(sessionKey: string): Promise<TableSession | undefined> {
    const [session] = await db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.sessionKey, sessionKey),
          gt(tableSessions.expiresAt, new Date())
        )
      );
    return session;
  }

  async createTableSession(session: InsertTableSession): Promise<TableSession> {
    const [newSession] = await db
      .insert(tableSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getActiveSessionByTableId(tableId: string): Promise<TableSession | undefined> {
    const [session] = await db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.tableId, tableId),
          gt(tableSessions.expiresAt, new Date())
        )
      )
      .orderBy(desc(tableSessions.createdAt))
      .limit(1);
    return session;
  }

  async updateTableSessionCart(sessionKey: string, cartData: any, participants: number): Promise<TableSession | undefined> {
    const [session] = await db
      .update(tableSessions)
      .set({ cartData, participants })
      .where(eq(tableSessions.sessionKey, sessionKey))
      .returning();
    return session;
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getRestaurantOrders(restaurantId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));
  }

  async getActiveOrders(restaurantId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          // Only get orders that are not completed
          eq(orders.status, 'received') ||
          eq(orders.status, 'preparing') ||
          eq(orders.status, 'ready')
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({
        ...order,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }
}

export const storage = new DatabaseStorage();
