import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, ShoppingCart, Minus, Plus, X } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface CollaborativeCartProps {
  cartItems: CartItem[];
  participants: number;
  totalAmount: number;
  onUpdateItem: (id: string, quantity: number) => void;
  sessionKey?: string | null;
  tableId?: string;
  restaurantId: string;
  onOrderPlaced?: (status: string) => void;
}

export default function CollaborativeCart({
  cartItems,
  participants,
  totalAmount,
  onUpdateItem,
  sessionKey,
  tableId,
  restaurantId,
  onOrderPlaced,
}: CollaborativeCartProps) {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { toast } = useToast();

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before placing an order",
        variant: "destructive",
      });
      return;
    }

    setIsPlacingOrder(true);

    try {
      // Create order
      const orderData = {
        tableId,
        restaurantId,
        sessionId: sessionKey ?? null, // Include sessionKey if available
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
        })),
        totalAmount: totalAmount.toFixed(2),
        status: 'received',
      };

      const response = await apiRequest("POST", "/api/orders", orderData);
      const order = await response.json();

      toast({
        title: "Order Placed!",
        description: "Your order has been sent to the kitchen",
      });

      onOrderPlaced?.('received');

      // Clear cart after successful order
      cartItems.forEach(item => onUpdateItem(item.id, 0));

    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const incrementItem = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      onUpdateItem(id, item.quantity + 1);
    }
  };

  const decrementItem = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item && item.quantity > 0) {
      onUpdateItem(id, item.quantity - 1);
    }
  };

  const removeItem = (id: string) => {
    onUpdateItem(id, 0);
  };

  return (
    <div className="floating-cart">
      <Card className="mx-4 max-w-sm shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Table Order
            </div>
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              <span data-testid="text-cart-participants">{participants}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Cart Items */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <div className="flex-1">
                  <p className="font-medium text-sm" data-testid={`text-cart-item-${item.id}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${item.price.toFixed(2)} each
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => decrementItem(item.id)}
                    className="h-6 w-6 p-0"
                    data-testid={`button-decrement-${item.id}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="w-8 text-center text-sm font-medium" data-testid={`text-quantity-${item.id}`}>
                    {item.quantity}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => incrementItem(item.id)}
                    className="h-6 w-6 p-0"
                    data-testid={`button-increment-${item.id}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="ml-2 text-sm font-medium" data-testid={`text-item-total-${item.id}`}>
                  ${item.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Total */}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Total</span>
              <span data-testid="text-cart-total">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Place Order Button */}
          <Button 
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder || cartItems.length === 0}
            className="w-full font-semibold py-3"
            data-testid="button-place-order"
          >
            {isPlacingOrder ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Placing Order...
              </div>
            ) : (
              "Place Order"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
