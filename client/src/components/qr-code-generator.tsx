import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table } from "@shared/schema";
import { QrCode, Plus, Copy } from "lucide-react";

interface QRCodeGeneratorProps {
  restaurantId: string;
}

export default function QRCodeGenerator({ restaurantId }: QRCodeGeneratorProps) {
  const [tableNumber, setTableNumber] = useState("");
  const { toast } = useToast();

  // Fetch existing tables
  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ["/api/restaurants", restaurantId, "tables"],
  });

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (data: { tableNumber: string }) => {
      const response = await apiRequest("POST", `/api/restaurants/${restaurantId}/tables`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "tables"] });
      setTableNumber("");
      toast({
        title: "Success",
        description: "Table created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create table",
        variant: "destructive",
      });
    },
  });

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (tableNumber.trim()) {
      createTableMutation.mutate({ tableNumber: tableNumber.trim() });
    }
  };

  const copyQRCode = (qrCode: string) => {
    const url = `${window.location.origin}/table/${qrCode}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Copied!",
        description: "QR code URL copied to clipboard",
      });
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading tables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Table */}
      <form onSubmit={handleCreateTable} className="space-y-4">
        <div>
          <Label htmlFor="tableNumber">Table Number</Label>
          <Input
            id="tableNumber"
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g., Table 1, A1, Patio-1"
            required
            data-testid="input-table-number"
          />
        </div>
        <Button 
          type="submit" 
          disabled={createTableMutation.isPending}
          data-testid="button-create-table"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Table
        </Button>
      </form>

      {/* Existing Tables */}
      {tables.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Existing Tables</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map((table) => (
              <Card key={table.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-muted rounded-md mx-auto mb-3 flex items-center justify-center">
                      <QrCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-card-foreground mb-1" data-testid={`text-table-${table.id}`}>
                      {table.tableNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3 font-mono" data-testid={`text-qr-${table.id}`}>
                      {table.qrCode}
                    </p>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyQRCode(table.qrCode)}
                        className="w-full"
                        data-testid={`button-copy-${table.id}`}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy URL
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => window.open(`/table/${table.qrCode}`, '_blank')}
                        className="w-full"
                        data-testid={`button-preview-${table.id}`}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tables.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No tables created yet. Create your first table above.</p>
        </div>
      )}
    </div>
  );
}
