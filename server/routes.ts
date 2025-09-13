import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertRestaurantSchema, insertTableSchema, insertMenuItemSchema, insertOrderSchema, secureOrderSchema } from "@shared/schema";
import { randomBytes } from "crypto";

// Helper function to validate auth token and extract user ID
const validateAuthToken = async (authToken: string): Promise<string | null> => {
  try {
    // For production, implement proper JWT validation here
    // For now, we'll use a simplified approach that works with the existing auth system
    
    // The auth token should be the session ID or a way to identify the authenticated user
    // Since we're using express-session, we need to validate against the session store
    // For now, we'll implement a basic check - in production you'd want full JWT validation
    
    if (!authToken || authToken.length < 10) {
      return null;
    }
    
    // For demonstration, we'll return null to force proper implementation
    // In a real implementation, you'd decode the JWT or validate against session store
    return null;
  } catch (error) {
    console.error('Auth token validation error:', error);
    return null;
  }
};

// Helper function to validate restaurant ownership via WebSocket
const validateRestaurantOwnership = async (restaurantId: string, authToken: string): Promise<boolean> => {
  try {
    const userId = await validateAuthToken(authToken);
    if (!userId) {
      console.log('WebSocket auth: Invalid or missing auth token');
      return false;
    }
    
    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) {
      console.log(`WebSocket auth: Restaurant ${restaurantId} not found`);
      return false;
    }
    
    if (restaurant.ownerId !== userId) {
      console.log(`WebSocket auth: User ${userId} does not own restaurant ${restaurantId}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Restaurant ownership validation error:', error);
    return false;
  }
};

interface AuthenticatedRequest extends Express.Request {
  user?: any;
  body: any;
}

// Authorization middleware to verify restaurant ownership
const requireRestaurantOwnership = async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const restaurantId = req.params.restaurantId;
    const userId = req.user!.claims.sub;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (restaurant.ownerId !== userId) {
      return res.status(403).json({ message: "Access denied: You do not own this restaurant" });
    }

    next();
  } catch (error) {
    console.error("Error verifying restaurant ownership:", error);
    res.status(500).json({ message: "Failed to verify restaurant access" });
  }
};

// Authorization middleware to verify order belongs to user's restaurant
const requireOrderOwnership = async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.claims.sub;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const restaurant = await storage.getRestaurant(order.restaurantId);
    if (!restaurant || restaurant.ownerId !== userId) {
      return res.status(403).json({ message: "Access denied: This order does not belong to your restaurant" });
    }

    next();
  } catch (error) {
    console.error("Error verifying order ownership:", error);
    res.status(500).json({ message: "Failed to verify order access" });
  }
};

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
  app.get('/api/restaurants/:restaurantId/tables', isAuthenticated, requireRestaurantOwnership, async (req, res) => {
    try {
      const tables = await storage.getRestaurantTables(req.params.restaurantId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.post('/api/restaurants/:restaurantId/tables', isAuthenticated, requireRestaurantOwnership, async (req, res) => {
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

  app.post('/api/restaurants/:restaurantId/menu', isAuthenticated, requireRestaurantOwnership, async (req, res) => {
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
      // Parse request using secure schema (only accepts item IDs and quantities)
      const secureOrderData = secureOrderSchema.parse(req.body);
      
      // CRITICAL: Validate table belongs to the specified restaurant
      const table = await storage.getTable(secureOrderData.tableId);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      
      if (table.restaurantId !== secureOrderData.restaurantId) {
        return res.status(403).json({ 
          message: "Table does not belong to the specified restaurant"
        });
      }
      
      // CRITICAL: If session ID is provided, validate it belongs to the table and is not expired
      if (secureOrderData.sessionId) {
        const session = await storage.getTableSession(secureOrderData.sessionId);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }
        
        if (session.tableId !== secureOrderData.tableId) {
          return res.status(403).json({ 
            message: "Session does not belong to the specified table"
          });
        }
        
        if (session.expiresAt <= new Date()) {
          return res.status(403).json({ 
            message: "Session has expired"
          });
        }
      }
      
      // Extract menu item IDs from the order
      const menuItemIds = secureOrderData.items.map(item => item.menuItemId);
      
      // Fetch authoritative menu items from database
      const menuItems = await storage.getMenuItemsByIds(menuItemIds);
      
      // Validate all items exist and are available
      if (menuItems.length !== menuItemIds.length) {
        const foundIds = menuItems.map(item => item.id);
        const missingIds = menuItemIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({ 
          message: "Invalid or unavailable menu items", 
          missingItems: missingIds 
        });
      }
      
      // Validate all items belong to the same restaurant as the order
      const invalidItems = menuItems.filter(item => item.restaurantId !== secureOrderData.restaurantId);
      if (invalidItems.length > 0) {
        return res.status(400).json({ 
          message: "Menu items do not belong to the specified restaurant",
          invalidItems: invalidItems.map(item => item.id)
        });
      }
      
      // Create order items with server-computed pricing
      let totalAmount = 0;
      const orderItems = secureOrderData.items.map(orderItem => {
        const menuItem = menuItems.find(mi => mi.id === orderItem.menuItemId)!;
        const itemPrice = parseFloat(menuItem.price);
        const itemTotal = itemPrice * orderItem.quantity;
        totalAmount += itemTotal;
        
        return {
          id: orderItem.menuItemId,
          name: menuItem.name,
          price: itemPrice,
          quantity: orderItem.quantity,
          total: itemTotal,
        };
      });
      
      // Create order with server-computed pricing
      const orderData = {
        tableId: secureOrderData.tableId,
        restaurantId: secureOrderData.restaurantId,
        sessionId: secureOrderData.sessionId || null,
        items: orderItems,
        totalAmount: totalAmount.toFixed(2),
        status: 'received' as const,
        specialInstructions: secureOrderData.specialInstructions,
      };
      
      // Validate the server-computed order data before database insertion
      const order = await storage.createOrder(insertOrderSchema.parse(orderData));
      
      // Broadcast new order to restaurant dashboard
      if (order.restaurantId) {
        (req as any).broadcast?.(order.restaurantId, {
          type: 'new_order',
          order
        });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/restaurants/:restaurantId/orders', isAuthenticated, requireRestaurantOwnership, async (req, res) => {
    try {
      const orders = await storage.getActiveOrders(req.params.restaurantId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.put('/api/orders/:id/status', isAuthenticated, requireOrderOwnership, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Broadcast order status update to restaurant dashboard
      if (order.restaurantId) {
        (req as any).broadcast?.(order.restaurantId, {
          type: 'order_update',
          order
        });
      }
      
      // Broadcast status update to customer table session if available
      if (order.sessionId) {
        (req as any).broadcast?.(order.sessionId, {
          type: 'order_status_update',
          status: order.status,
          orderId: order.id
        });
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

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, restaurantId, sessionKey, authToken } = data;

        // Subscribe to updates for a specific restaurant or session
        if (type === 'subscribe') {
          let authorized = false;
          let subscriptionKey = null;

          // Customer session subscription - validate session key
          if (sessionKey) {
            const session = await storage.getTableSession(sessionKey);
            if (session && session.expiresAt > new Date()) {
              authorized = true;
              subscriptionKey = sessionKey;
              console.log(`Customer subscribed to session: ${sessionKey}`);
            } else {
              console.log(`Invalid or expired session key: ${sessionKey}`);
            }
          }
          
          // Restaurant staff subscription - validate restaurant ownership  
          else if (restaurantId && authToken) {
            try {
              // CRITICAL: Validate restaurant ownership with proper authentication
              authorized = await validateRestaurantOwnership(restaurantId, authToken);
              
              if (authorized) {
                subscriptionKey = restaurantId;
                console.log(`Restaurant staff subscribed to restaurant: ${restaurantId}`);
              } else {
                console.log(`Restaurant subscription rejected for restaurant: ${restaurantId}`);
              }
            } catch (error) {
              console.log(`Failed to validate restaurant auth: ${error}`);
              authorized = false;
            }
          }

          // Add client to authorized channel or reject
          if (authorized && subscriptionKey) {
            if (!clients.has(subscriptionKey)) {
              clients.set(subscriptionKey, new Set());
            }
            clients.get(subscriptionKey)!.add(ws);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'subscription_confirmed',
              key: subscriptionKey
            }));
          } else {
            // Reject unauthorized subscription
            ws.send(JSON.stringify({
              type: 'subscription_rejected',
              message: 'Unauthorized or invalid subscription request'
            }));
            ws.close();
            return;
          }
        }
        
        // Handle cart updates and broadcast to session participants
        if (type === 'cart_update' && sessionKey) {
          // Validate session key before processing cart update
          const session = await storage.getTableSession(sessionKey);
          if (!session || session.expiresAt <= new Date()) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid or expired session'
            }));
            return;
          }

          // Update the cart data in the database session
          const { cartItems, participants } = data;
          storage.updateTableSessionCart(sessionKey, { items: cartItems }, participants)
            .then(() => {
              // Broadcast cart update to all session participants
              broadcast(sessionKey, {
                type: 'cart_update',
                cartItems,
                participants,
                sessionKey
              });
            })
            .catch(error => {
              console.error('Failed to update cart data:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to update cart'
              }));
            });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
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
