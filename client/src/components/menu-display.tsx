import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MenuItem } from "@shared/schema";
import { Plus, Minus } from "lucide-react";

interface MenuDisplayProps {
  menuItems: MenuItem[];
  onAddToCart: (menuItem: MenuItem, quantity: number) => void;
}

export default function MenuDisplay({ menuItems, onAddToCart }: MenuDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Get unique categories
  const categories = Array.from(new Set(menuItems.map(item => item.category)));
  const sortedCategories = ["appetizers", "mains", "drinks", "desserts"].filter(cat =>
    categories.includes(cat)
  ).concat(categories.filter(cat =>
    !["appetizers", "mains", "drinks", "desserts"].includes(cat)
  ));

  // Set the first available category as default when menu items load
  useEffect(() => {
    if (menuItems.length > 0 && !selectedCategory && sortedCategories.length > 0) {
      setSelectedCategory(sortedCategories[0]);
    }
  }, [menuItems, selectedCategory, sortedCategories]);

  // Filter items by selected category
  const filteredItems = menuItems.filter(item => item.category === selectedCategory);

  const getQuantity = (itemId: string) => quantities[itemId] || 0;

  const updateQuantity = (itemId: string, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, quantity)
    }));
  };

  const handleAddToCart = (menuItem: MenuItem) => {
    const quantity = getQuantity(menuItem.id) || 1;
    onAddToCart(menuItem, quantity);
    updateQuantity(menuItem.id, 0); // Reset quantity after adding
  };

  const categoryLabels: Record<string, string> = {
    appetizers: "Appetizers",
    mains: "Main Dishes", 
    drinks: "Drinks",
    desserts: "Desserts"
  };

  return (
    <div>
      {/* Menu Categories */}
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="flex overflow-x-auto px-4 py-3 space-x-6">
          {sortedCategories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`text-sm font-medium whitespace-nowrap py-2 transition-colors ${
                selectedCategory === category 
                  ? 'menu-category-active text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
              data-testid={`button-category-${category}`}
            >
              {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 pb-32">
        {filteredItems.length > 0 ? (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden shadow-sm">
                {/* Item Image */}
                {item.imageUrl && (
                  <img 
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-40 object-cover"
                    data-testid={`img-item-${item.id}`}
                  />
                )}
                
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-card-foreground" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </h3>
                    <span className="text-lg font-bold text-primary" data-testid={`text-item-price-${item.id}`}>
                      ${parseFloat(item.price).toFixed(2)}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3" data-testid={`text-item-description-${item.id}`}>
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, getQuantity(item.id) - 1)}
                        disabled={getQuantity(item.id) <= 0}
                        className="w-8 h-8 p-0"
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.id}`}>
                        {getQuantity(item.id)}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, getQuantity(item.id) + 1)}
                        className="w-8 h-8 p-0"
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      onClick={() => handleAddToCart(item)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      data-testid={`button-add-to-cart-${item.id}`}
                    >
                      Add to Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No items available in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
