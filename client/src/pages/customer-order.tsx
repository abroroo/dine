import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MenuDisplay from "@/components/menu-display";
import StickyBottomCart from "@/components/sticky-bottom-cart";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Table, Restaurant, MenuItem, TableSession } from "@shared/schema";
import { Users, Clock, CheckCircle } from "lucide-react";
import { config } from "@/lib/config";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export default function CustomerOrder() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [participants, setParticipants] = useState(1);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  // Fetch table information
  const { data: table, isLoading: tableLoading } = useQuery<Table>({
    queryKey: ["/api/tables", qrCode],
    enabled: !!qrCode && qrCode !== "demo-table",
  });

  // Fetch restaurant information
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", table?.restaurantId],
    enabled: !!table?.restaurantId,
  });

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", table?.restaurantId, "menu"],
    enabled: !!table?.restaurantId,
  });

  // Join table session
  const { data: sessionData } = useQuery({
    queryKey: ["/api/tables", qrCode, "join"],
    queryFn: async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/tables/${qrCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to join table");
      return response.json();
    },
    enabled: !!qrCode && !sessionKey, // Remove demo-table exclusion
  });

  // Set session key when we get session data
  useEffect(() => {
    if (sessionData?.session) {
      setSessionKey(sessionData.session.sessionKey);
      setSessionId(sessionData.session.id);
      setParticipants(sessionData.session.participants || 1);
    }
  }, [sessionData]);

  // WebSocket connection for real-time updates
  const websocket = useWebSocket(sessionKey ? `/ws` : null);

  useEffect(() => {
    if (websocket && sessionKey) {
      websocket.onopen = () => {
        websocket.send(JSON.stringify({
          type: 'subscribe',
          sessionKey: sessionKey
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'cart_update') {
          setCartItems(data.cartItems || []);
          setParticipants(data.participants || 1);
        } else if (data.type === 'order_status_update') {
          setOrderStatus(data.status);
        }
      };
    }
  }, [websocket, sessionKey]);

  // Demo data for demo-table
  const isDemoTable = qrCode === "demo-table";
  const demoRestaurant = { id: "demo", name: "Bella Vista Restaurant" };
  const demoMenuItems: MenuItem[] = [
    {
      id: "1",
      restaurantId: "demo",
      category: "appetizers",
      name: "Classic Burger",
      description: "Juicy beef patty with fresh lettuce, tomato, onion, and our special sauce",
      price: "12.99",
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      available: true,
      createdAt: new Date(),
    },
    {
      id: "2", 
      restaurantId: "demo",
      category: "mains",
      name: "Margherita Pizza",
      description: "Fresh mozzarella, tomato sauce, and basil on our homemade dough",
      price: "16.99",
      imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      available: true,
      createdAt: new Date(),
    },
    {
      id: "3",
      restaurantId: "demo", 
      category: "appetizers",
      name: "Caesar Salad",
      description: "Crisp romaine lettuce with parmesan, croutons, and classic Caesar dressing",
      price: "9.99",
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      available: true,
      createdAt: new Date(),
    },
  ];

  const displayRestaurant = isDemoTable ? demoRestaurant : restaurant;
  const displayMenuItems = isDemoTable ? demoMenuItems : menuItems;
  const tableNumber = isDemoTable ? "Demo Table" : table?.tableNumber || "Unknown";

  if (tableLoading && !isDemoTable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading table information...</p>
        </div>
      </div>
    );
  }

  const addToCart = (menuItem: MenuItem, quantity: number = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === menuItem.id);
      let updatedCart;
      if (existing) {
        updatedCart = prev.map(item =>
          item.id === menuItem.id
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                total: (item.quantity + quantity) * parseFloat(menuItem.price)
              }
            : item
        );
      } else {
        updatedCart = [...prev, {
          id: menuItem.id,
          name: menuItem.name,
          price: parseFloat(menuItem.price),
          quantity,
          total: quantity * parseFloat(menuItem.price)
        }];
      }
      
      // Broadcast cart update via WebSocket
      if (websocket && sessionKey) {
        websocket.send(JSON.stringify({
          type: 'cart_update',
          sessionKey,
          cartItems: updatedCart,
          participants
        }));
      }
      
      return updatedCart;
    });
  };

  const updateCartItem = (id: string, quantity: number) => {
    setCartItems(prev => {
      let updatedCart;
      if (quantity <= 0) {
        updatedCart = prev.filter(item => item.id !== id);
      } else {
        updatedCart = prev.map(item =>
          item.id === id
            ? { ...item, quantity, total: quantity * item.price }
            : item
        );
      }
      
      // Broadcast cart update via WebSocket
      if (websocket && sessionKey) {
        websocket.send(JSON.stringify({
          type: 'cart_update',
          sessionKey,
          cartItems: updatedCart,
          participants
        }));
      }
      
      return updatedCart;
    });
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Table Info */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-restaurant-name">
              {displayRestaurant?.name || "Restaurant"}
            </h1>
            <p className="text-sm opacity-90">
              <Users className="inline h-4 w-4 mr-1" />
              <span data-testid="text-participants">{participants} people</span> at{" "}
              <span data-testid="text-table-number">{tableNumber}</span>
            </p>
          </div>
          <div className="collaborative-indicator">
            <div className="w-3 h-3 bg-accent rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Order Status Notification */}
      {orderStatus && (
        <div className="fixed top-20 left-4 right-4 z-50">
          <div className={`text-white p-3 rounded-lg shadow-lg pulse-notification ${
            orderStatus === 'preparing' ? 'order-status-preparing' :
            orderStatus === 'ready' ? 'order-status-ready' : 'bg-primary'
          }`}>
            <div className="flex items-center">
              {orderStatus === 'preparing' && <Clock className="mr-2" />}
              {orderStatus === 'ready' && <CheckCircle className="mr-2" />}
              <span className="font-medium">
                {orderStatus === 'preparing' && "Your order is being prepared"}
                {orderStatus === 'ready' && "Your order is ready for pickup!"}
                {orderStatus === 'received' && "Order received"}
              </span>
              <span className="ml-auto text-sm opacity-90">
                {orderStatus === 'preparing' && "Est. 15 min"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Menu Display */}
      <MenuDisplay 
        menuItems={displayMenuItems}
        onAddToCart={addToCart}
        data-testid="menu-display"
      />

      {/* Sticky Bottom Cart */}
      <StickyBottomCart
        cartItems={cartItems}
        participants={participants}
        totalAmount={totalAmount}
        onUpdateItem={updateCartItem}
        sessionKey={sessionKey}
        sessionId={sessionId}
        tableId={table?.id}
        restaurantId={displayRestaurant?.id || "demo"}
        onOrderPlaced={(status) => setOrderStatus(status)}
      />
    </div>
  );
}
