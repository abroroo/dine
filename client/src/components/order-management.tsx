import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Order } from "@shared/schema";
import { Clock, Check, Bell, CheckCheck } from "lucide-react";

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: string) => void;
  isUpdating: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export default function OrderManagement({ orders, onUpdateStatus, isUpdating }: OrderManagementProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'border-primary bg-primary/10';
      case 'preparing': return 'border-orange-400 bg-orange-50';
      case 'ready': return 'border-accent bg-accent/10';
      default: return 'border-border';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge className="bg-primary text-primary-foreground pulse-notification">New</Badge>;
      case 'preparing':
        return <Badge className="bg-orange-500 text-white">Preparing</Badge>;
      case 'ready':
        return <Badge className="bg-accent text-accent-foreground pulse-notification">Ready</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString();
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <Card>
          <CardContent className="p-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No active orders at the moment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {orders.map(order => {
        const items = order.items as OrderItem[];
        const totalAmount = parseFloat(order.totalAmount);
        
        return (
          <Card key={order.id} className={`shadow-lg ${getStatusColor(order.status || 'received')}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg" data-testid={`text-order-title-${order.id}`}>
                  Table • Order #{order.id?.slice(-4) || 'N/A'}
                </CardTitle>
                {getStatusBadge(order.status || 'received')}
              </div>
              <p className="text-sm text-muted-foreground">
                <Clock className="inline h-4 w-4 mr-1" />
                {order.status === 'received' && `Received ${formatTimeAgo((order.createdAt || new Date()).toString())}`}
                {order.status === 'preparing' && `Started ${formatTimeAgo((order.updatedAt || new Date()).toString())}`}
                {order.status === 'ready' && `Ready since ${formatTimeAgo((order.updatedAt || new Date()).toString())}`}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Order Items */}
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span data-testid={`text-order-item-${order.id}-${index}`}>
                      {item.quantity}x {item.name}
                    </span>
                    <span data-testid={`text-order-item-price-${order.id}-${index}`}>
                      ${item.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Special Instructions */}
              {order.specialInstructions && (
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground font-medium">Special Instructions:</p>
                  <p className="text-sm" data-testid={`text-order-instructions-${order.id}`}>
                    {order.specialInstructions}
                  </p>
                </div>
              )}
              
              {/* Total */}
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span data-testid={`text-order-total-${order.id}`}>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
                {order.status === 'received' && (
                  <Button
                    onClick={() => onUpdateStatus(order.id, 'preparing')}
                    disabled={isUpdating}
                    className="flex-1"
                    data-testid={`button-accept-${order.id}`}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept Order
                  </Button>
                )}
                
                {order.status === 'preparing' && (
                  <Button
                    onClick={() => onUpdateStatus(order.id, 'ready')}
                    disabled={isUpdating}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    data-testid={`button-ready-${order.id}`}
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    Mark Ready
                  </Button>
                )}
                
                {order.status === 'ready' && (
                  <Button
                    onClick={() => onUpdateStatus(order.id, 'completed')}
                    disabled={isUpdating}
                    variant="secondary"
                    className="flex-1"
                    data-testid={`button-complete-${order.id}`}
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Complete Order
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
