import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertRestaurantSchema, insertTableSchema, insertMenuItemSchema, insertOrderSchema } from "@shared/schema";
import { randomBytes } from "crypto";

interface AuthenticatedRequest extends Express.Request {
  user?: any;
  body: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Restaurant management routes
  app.get('/api/restaurants/my', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  app.post('/api/restaurants', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const restaurantData = insertRestaurantSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      const restaurant = await storage.createRestaurant(restaurantData);
      res.json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  app.get('/api/restaurants/:id', async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // Table management routes
  app.get('/api/restaurants/:restaurantId/tables', isAuthenticated, async (req, res) => {
    try {
      const tables = await storage.getRestaurantTables(req.params.restaurantId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.post('/api/restaurants/:restaurantId/tables', isAuthenticated, async (req, res) => {
    try {
      const qrCode = `table-${Date.now()}-${randomBytes(4).toString('hex')}`;
      const tableData = insertTableSchema.parse({
        ...req.body,
        restaurantId: req.params.restaurantId,
        qrCode,
      });
      const table = await storage.createTable(tableData);
      res.json(table);
    } catch (error) {
      console.error("Error creating table:", error);
      res.status(500).json({ message: "Failed to create table" });
    }
  });

  app.get('/api/tables/:qrCode', async (req, res) => {
    try {
      const table = await storage.getTableByQrCode(req.params.qrCode);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error) {
      console.error("Error fetching table:", error);
      res.status(500).json({ message: "Failed to fetch table" });
    }
  });

  // Menu routes
  app.get('/api/restaurants/:restaurantId/menu', async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems(req.params.restaurantId);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  app.get('/api/restaurants/:restaurantId/menu/:category', async (req, res) => {
    try {
      const menuItems = await storage.getMenuItemsByCategory(
        req.params.restaurantId,
        req.params.category
      );
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post('/api/restaurants/:restaurantId/menu', isAuthenticated, async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse({
        ...req.body,
        restaurantId: req.params.restaurantId,
      });
      const menuItem = await storage.createMenuItem(menuItemData);
      res.json(menuItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // Table session routes
  app.post('/api/tables/:qrCode/join', async (req, res) => {
    try {
      const table = await storage.getTableByQrCode(req.params.qrCode);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Generate session key
      const sessionKey = `session-${Date.now()}-${randomBytes(8).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

      const session = await storage.createTableSession({
        tableId: table.id,
        sessionKey,
        participants: 1,
        cartData: { items: [] },
        expiresAt,
      });

      // Update table status
      await storage.updateTableStatus(table.id, 'active');

      res.json({ session, table });
    } catch (error) {
      console.error("Error joining table:", error);
      res.status(500).json({ message: "Failed to join table" });
    }
  });

  app.get('/api/sessions/:sessionKey', async (req, res) => {
    try {
      const session = await storage.getTableSession(req.params.sessionKey);
      if (!session) {
        return res.status(404).json({ message: "Session not found or expired" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.put('/api/sessions/:sessionKey/cart', async (req, res) => {
    try {
      const { cartData, participants } = req.body;
      const session = await storage.updateTableSessionCart(
        req.params.sessionKey,
        cartData,
        participants
      );
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ message: "Failed to update cart" });
    }
  });

  // Order routes
  app.post('/api/orders', async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/restaurants/:restaurantId/orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getActiveOrders(req.params.restaurantId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.put('/api/orders/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, restaurantId, sessionKey } = data;

        // Subscribe to updates for a specific restaurant or session
        if (type === 'subscribe') {
          const key = restaurantId || sessionKey;
          if (key) {
            if (!clients.has(key)) {
              clients.set(key, new Set());
            }
            clients.get(key)!.add(ws);
            console.log(`Client subscribed to ${key}`);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from all subscriptions
      clients.forEach((clientSet, key) => {
        clientSet.delete(ws);
        if (clientSet.size === 0) {
          clients.delete(key);
        }
      });
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (key: string, data: any) => {
    const clientSet = clients.get(key);
    if (clientSet) {
      const message = JSON.stringify(data);
      clientSet.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };

  // Middleware to add broadcast function to request
  app.use((req, res, next) => {
    (req as any).broadcast = broadcast;
    next();
  });

  return httpServer;
}
