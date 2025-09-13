import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import OrderManagement from "@/components/order-management";
import { Restaurant, Order, Table } from "@shared/schema";
import { Clock, Users, LogOut, Bell } from "lucide-react";

export default function RestaurantDashboard() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch restaurant information
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId && isAuthenticated,
  });

  // Fetch active orders
  const { data: initialOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/restaurants", restaurantId, "orders"],
    enabled: !!restaurantId && isAuthenticated,
  });

  // Fetch active tables
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/restaurants", restaurantId, "tables"],
    enabled: !!restaurantId && isAuthenticated,
  });

  // Set initial orders
  useEffect(() => {
    if (initialOrders) {
      setOrders(initialOrders);
    }
  }, [initialOrders]);

  // WebSocket connection for real-time updates
  const websocket = useWebSocket(restaurantId ? `/ws` : null);

  useEffect(() => {
    if (websocket && restaurantId) {
      websocket.onopen = () => {
        websocket.send(JSON.stringify({
          type: 'subscribe',
          restaurantId: restaurantId
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_order') {
          setOrders(prev => [data.order, ...prev]);
          toast({
            title: "New Order",
            description: `New order from ${data.order.table || 'Table'}`,
          });
        } else if (data.type === 'order_update') {
          setOrders(prev => prev.map(order =>
            order.id === data.order.id ? data.order : order
          ));
        }
      };
    }
  }, [websocket, restaurantId, toast]);

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: (updatedOrder) => {
      setOrders(prev => prev.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      ));
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "orders"] });
      
      toast({
        title: "Order Updated",
        description: `Order status updated to ${updatedOrder.status}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  if (isLoading || restaurantLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Restaurant not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeOrders = orders.filter(order => 
    order.status && ['received', 'preparing', 'ready'].includes(order.status)
  );
  const activeTables = tables.filter(table => table.status === 'active');

  return (
    <div className="min-h-screen bg-muted">
      {/* Dashboard Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground" data-testid="text-restaurant-name">
              {restaurant.name} Kitchen
            </h1>
            <p className="text-muted-foreground">
              <span data-testid="text-active-orders">{activeOrders.length} active orders</span> • 
              <span data-testid="text-active-tables">{activeTables.length} tables</span> ordering
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span className="text-sm text-muted-foreground">Live Updates</span>
            </div>
            <Button 
              variant="ghost"
              onClick={() => window.location.href = '/api/logout'}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Active Tables Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Active Tables</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {activeTables.length > 0 ? (
              activeTables.map(table => (
                <Card key={table.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-card-foreground" data-testid={`text-table-${table.tableNumber}`}>
                        {table.tableNumber}
                      </h3>
                      <Badge variant="outline" data-testid={`badge-status-${table.id}`}>
                        {table.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <Users className="inline h-4 w-4 mr-1" />
                      <span data-testid={`text-participants-${table.id}`}>
                        {(table.sessionData as any)?.participants || 1} people
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Started {new Date(table.createdAt!).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No active tables at the moment</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Orders Queue */}
        <div>
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Order Queue</h2>
          <OrderManagement
            orders={activeOrders}
            onUpdateStatus={(orderId, status) => 
              updateOrderMutation.mutate({ orderId, status })
            }
            isUpdating={updateOrderMutation.isPending}
            data-testid="order-management"
          />
        </div>
      </div>
    </div>
  );
}
