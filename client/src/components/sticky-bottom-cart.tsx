import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, ShoppingCart, Minus, Plus, X, ChevronUp, ChevronDown } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface StickyBottomCartProps {
  cartItems: CartItem[];
  participants: number;
  totalAmount: number;
  onUpdateItem: (id: string, quantity: number) => void;
  sessionKey?: string | null;
  tableId?: string;
  restaurantId: string;
  onOrderPlaced?: (status: string) => void;
}

export default function StickyBottomCart({
  cartItems,
  participants,
  totalAmount,
  onUpdateItem,
  sessionKey,
  tableId,
  restaurantId,
  onOrderPlaced,
}: StickyBottomCartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { toast } = useToast();

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
      const orderData = {
        tableId,
        restaurantId,
        sessionId: sessionKey,
        items: cartItems.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
        }))
      };

      await apiRequest("POST", "/api/orders", orderData);

      toast({
        title: "Order Placed!",
        description: "Your order has been sent to the kitchen",
      });

      // Clear cart after successful order
      cartItems.forEach(item => onUpdateItem(item.id, 0));
      setIsExpanded(false);

      if (onOrderPlaced) {
        onOrderPlaced("received");
      }
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

  if (cartItems.length === 0) return null;

  return (
    <>
      {/* Overlay when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sticky Bottom Cart */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Collapsed Bar */}
        <div
          className="bg-primary text-primary-foreground p-4 cursor-pointer shadow-2xl"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {itemCount}
                </Badge>
              </div>
              <div className="flex items-center text-sm opacity-90">
                <Users className="h-4 w-4 mr-1" />
                {participants}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="font-bold text-lg" data-testid="text-cart-total">
                ${totalAmount.toFixed(2)}
              </span>
              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </div>
          </div>
        </div>

        {/* Expanded Cart */}
        {isExpanded && (
          <Card className="rounded-t-2xl rounded-b-none max-h-[70vh] flex flex-col">
            <CardHeader className="pb-3 border-b bg-card">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Your Order
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4 py-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm" data-testid={`text-cart-item-${item.id}`}>
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => decrementItem(item.id)}
                          className="h-8 w-8 p-0"
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
                          className="h-8 w-8 p-0"
                          data-testid={`button-increment-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 ml-2 text-destructive hover:text-destructive"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="ml-4 text-sm font-medium" data-testid={`text-item-total-${item.id}`}>
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Collaborative Indicator */}
                <div className="flex items-center justify-center p-3 bg-accent/20 rounded-lg">
                  <Users className="h-4 w-4 mr-2 text-accent-foreground/70" />
                  <span className="text-sm text-accent-foreground/70">
                    {participants} {participants === 1 ? 'person' : 'people'} ordering together
                  </span>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span data-testid="text-expanded-total">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className="w-full h-12 text-lg font-medium"
                  data-testid="button-place-order"
                >
                  {isPlacingOrder ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom padding for page content when cart is present */}
      <div className="h-20" />
    </>
  );
}