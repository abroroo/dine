import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertRestaurantSchema, insertTableSchema, insertMenuItemSchema, insertOrderSchema, secureOrderSchema } from "@shared/schema";
import { randomBytes } from "crypto";

// Demo user ID for bypassing authentication
const DEMO_USER_ID = 'demo-user';
const DEMO_RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000';

interface DemoRequest extends Express.Request {
  user?: { claims: { sub: string } };
  body: any;
}

// Demo middleware that injects a fake user
const injectDemoUser = (req: DemoRequest, res: any, next: any) => {
  req.user = { claims: { sub: DEMO_USER_ID } };
  next();
};

// WebSocket connections storage
const wsConnections = new Map<string, Set<WebSocket>>();

export async function registerDemoRoutes(app: Express): Promise<Server> {
  console.log('🚀 Starting demo mode - authentication bypassed');

  // Configure CORS for production
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://table-order-two.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Auth routes (mocked)
  app.get('/api/auth/user', injectDemoUser, async (req: DemoRequest, res) => {
    try {
      const user = await storage.getUser(DEMO_USER_ID);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Restaurant management routes
  app.get('/api/restaurants/my', injectDemoUser, async (req: DemoRequest, res) => {
    try {
      const restaurant = await storage.getRestaurant(DEMO_RESTAURANT_ID);
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
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
  app.get('/api/restaurants/:restaurantId/tables', async (req, res) => {
    try {
      const tables = await storage.getRestaurantTables(req.params.restaurantId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
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
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // Table join endpoint for collaborative sessions
  app.post('/api/tables/:qrCode/join', async (req, res) => {
    try {
      const { qrCode } = req.params;

      // Get table by QR code
      const table = await storage.getTableByQrCode(qrCode);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Find or create table session
      let session = await storage.getActiveSessionByTableId(table.id);

      if (!session) {
        // Create new session if none exists
        const sessionKey = randomBytes(16).toString('hex');
        const sessionData = {
          tableId: table.id,
          sessionKey,
          participants: 1,
          cartData: {},
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
        };
        session = await storage.createTableSession(sessionData);
      } else {
        // Increment participants
        session = await storage.updateTableSessionCart(session.sessionKey, session.cartData, (session.participants || 1) + 1);
      }

      res.json({
        table,
        session,
        message: "Joined table session successfully"
      });
    } catch (error) {
      console.error("Error joining table:", error);
      res.status(500).json({ message: "Failed to join table" });
    }
  });

  // Table sessions (collaborative cart)
  app.post('/api/table-sessions', async (req, res) => {
    try {
      const { tableId } = req.body;
      const sessionKey = randomBytes(16).toString('hex');

      const sessionData = {
        tableId,
        sessionKey,
        participants: 1,
        cartData: {},
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      const session = await storage.createTableSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating table session:", error);
      res.status(500).json({ message: "Failed to create table session" });
    }
  });

  app.get('/api/table-sessions/:sessionKey', async (req, res) => {
    try {
      const session = await storage.getTableSession(req.params.sessionKey);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching table session:", error);
      res.status(500).json({ message: "Failed to fetch table session" });
    }
  });

  app.put('/api/table-sessions/:sessionKey/cart', async (req, res) => {
    try {
      const { cartData } = req.body;
      const session = await storage.updateTableSessionCart(req.params.sessionKey, cartData, 1);

      // Broadcast cart update via WebSocket
      const wsRoom = `table-${session.tableId}`;
      const connections = wsConnections.get(wsRoom) || new Set();
      const message = JSON.stringify({
        type: 'cart-update',
        data: { cartData, sessionKey: req.params.sessionKey }
      });

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });

      res.json(session);
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ message: "Failed to update cart" });
    }
  });

  // Order management
  app.post('/api/orders', async (req, res) => {
    try {
      const orderData = secureOrderSchema.parse(req.body);

      // Calculate total amount server-side for security
      const menuItems = await storage.getMenuItems(orderData.restaurantId);
      const menuItemsMap = new Map(menuItems.map(item => [item.id, item]));

      let totalAmount = 0;
      const validatedItems = [];

      for (const item of orderData.items) {
        const menuItem = menuItemsMap.get(item.menuItemId);
        if (!menuItem || !menuItem.available) {
          return res.status(400).json({ message: `Invalid or unavailable menu item: ${item.menuItemId}` });
        }

        const itemTotal = parseFloat(menuItem.price) * item.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          menuItemId: item.menuItemId,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          subtotal: itemTotal.toFixed(2)
        });
      }

      const order = await storage.createOrder({
        tableId: orderData.tableId,
        restaurantId: orderData.restaurantId,
        sessionId: orderData.sessionId || null,
        items: validatedItems,
        totalAmount: totalAmount.toFixed(2),
        status: 'received',
        specialInstructions: orderData.specialInstructions || null
      });

      // Broadcast new order via WebSocket
      const wsRoom = `restaurant-${orderData.restaurantId}`;
      const connections = wsConnections.get(wsRoom) || new Set();
      const message = JSON.stringify({
        type: 'new-order',
        data: order
      });

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });

      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/restaurants/:restaurantId/orders', async (req, res) => {
    try {
      const orders = await storage.getRestaurantOrders(req.params.restaurantId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.put('/api/orders/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);

      // Broadcast order status update
      const wsRoom = `restaurant-${order.restaurantId}`;
      const tableRoom = `table-${order.tableId}`;

      const message = JSON.stringify({
        type: 'order-status-update',
        data: order
      });

      [wsRoom, tableRoom].forEach(room => {
        const connections = wsConnections.get(room) || new Set();
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });
      });

      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Create HTTP server and WebSocket server
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);

        if (message.type === 'join-room') {
          const { room } = message;

          if (!wsConnections.has(room)) {
            wsConnections.set(room, new Set());
          }

          wsConnections.get(room)!.add(ws);
          console.log(`Client joined room: ${room}`);

          ws.send(JSON.stringify({
            type: 'room-joined',
            data: { room }
          }));

        } else if (message.type === 'subscribe') {
          // Handle subscribe for backward compatibility
          const { sessionKey } = message;
          const room = `table-${sessionKey}`;

          if (!wsConnections.has(room)) {
            wsConnections.set(room, new Set());
          }

          wsConnections.get(room)!.add(ws);
          console.log(`Client subscribed to room: ${room}`);

          ws.send(JSON.stringify({
            type: 'subscribed',
            data: { sessionKey, room }
          }));

        } else if (message.type === 'cart_update') {
          // Handle real-time cart updates
          const { sessionKey, cartItems, participants } = message;
          const room = `table-${sessionKey}`;

          console.log(`Broadcasting cart update to room: ${room}`, { cartItems: cartItems?.length, participants });

          // Update session cart data in database
          if (sessionKey && cartItems) {
            try {
              await storage.updateTableSessionCart(sessionKey, { items: cartItems }, participants || 1);
            } catch (error) {
              console.error('Failed to update session cart:', error);
            }
          }

          // Broadcast to all clients in the room except sender
          const connections = wsConnections.get(room) || new Set();
          const broadcastMessage = JSON.stringify({
            type: 'cart_update',
            cartItems,
            participants
          });

          connections.forEach(clientWs => {
            if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(broadcastMessage);
            }
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // Remove from all rooms
      wsConnections.forEach((connections, room) => {
        connections.delete(ws);
        if (connections.size === 0) {
          wsConnections.delete(room);
        }
      });
    });
  });

  console.log('✅ Demo routes registered with WebSocket support');
  return server;
}