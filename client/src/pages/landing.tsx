import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, QrCode, Users, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-muted">
      {/* Navigation */}
      <nav className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary">TableOrder</h1>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Restaurant Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <Utensils className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-card-foreground mb-4">
            Modern Restaurant Ordering System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your restaurant operations with collaborative mobile ordering 
            and real-time kitchen management dashboard.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card>
            <CardContent className="p-6 text-center">
              <QrCode className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-card-foreground mb-2">QR Code Ordering</h3>
              <p className="text-sm text-muted-foreground">
                Customers scan table QR codes to access menu and place orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-semibold text-card-foreground mb-2">Collaborative Ordering</h3>
              <p className="text-sm text-muted-foreground">
                Multiple people at the same table can add items to a shared cart
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="font-semibold text-card-foreground mb-2">Real-time Updates</h3>
              <p className="text-sm text-muted-foreground">
                Live order status updates from kitchen to customer tables
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Utensils className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-card-foreground mb-2">Kitchen Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Tablet-optimized interface for restaurant staff and kitchen management
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-card-foreground mb-4">Try the Demo</h2>
          <p className="text-muted-foreground mb-8">
            Experience the customer ordering interface with a sample table
          </p>
          <Button 
            onClick={() => window.location.href = '/table/demo-table'}
            size="lg"
            data-testid="button-demo"
          >
            View Customer Demo
          </Button>
        </div>
      </div>
    </div>
  );
}
