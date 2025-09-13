import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Restaurant } from "@shared/schema";
import QRCodeGenerator from "@/components/qr-code-generator";
import { Plus, Utensils, Settings, LogOut } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/my"],
    retry: false,
    enabled: isAuthenticated,
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest("POST", "/api/restaurants", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/my"] });
      toast({
        title: "Success",
        description: "Restaurant created successfully!",
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
        description: "Failed to create restaurant",
        variant: "destructive",
      });
    },
  });

  if (isLoading || restaurantLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleCreateRestaurant = () => {
    const name = prompt("Enter restaurant name:");
    if (name?.trim()) {
      createRestaurantMutation.mutate({ name: name.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Navigation */}
      <nav className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary">TableOrder</h1>
              {restaurant && (
                <span className="text-muted-foreground">— {restaurant.name}</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground" data-testid="text-welcome">
                Welcome, {(user as any)?.firstName || (user as any)?.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!restaurant ? (
          /* Restaurant Setup */
          <div className="text-center">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-center">
                  <Utensils className="h-8 w-8 text-primary mr-3" />
                  Setup Your Restaurant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Create your restaurant profile to start managing tables and orders.
                </p>
                <Button 
                  onClick={handleCreateRestaurant}
                  disabled={createRestaurantMutation.isPending}
                  className="w-full"
                  data-testid="button-create-restaurant"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Restaurant
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Restaurant Dashboard */
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-card-foreground" data-testid="text-restaurant-name">
                  {restaurant.name}
                </h1>
                <p className="text-muted-foreground">Restaurant Management Dashboard</p>
              </div>
              <div className="flex space-x-4">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = `/restaurant/${restaurant.id}/kitchen`}
                  data-testid="button-kitchen-dashboard"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Kitchen Dashboard
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* QR Code Management */}
              <Card>
                <CardHeader>
                  <CardTitle>QR Code Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <QRCodeGenerator restaurantId={restaurant.id} />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Restaurant ID</span>
                      <span className="font-mono text-sm" data-testid="text-restaurant-id">
                        {restaurant.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-sm">
                        {new Date(restaurant.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
