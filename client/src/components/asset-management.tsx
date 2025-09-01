import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Asset } from "@shared/schema";

interface AssetManagementProps {
  userId?: string;
  showActions?: boolean;
}

export default function AssetManagement({ userId, showActions = false }: AssetManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: userId ? ["/api/assets/user", userId] : ["/api/assets"],
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ assetId, status }: { assetId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/assets/${assetId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset status updated successfully",
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
        description: "Failed to update asset status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return "bg-green-100 text-green-800";
      case 'assigned':
        return "bg-blue-100 text-blue-800";
      case 'maintenance':
        return "bg-yellow-100 text-yellow-800";
      case 'missing':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading assets...</div>;
  }

  if (userId && assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No assets assigned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {userId ? (
        <Card>
          <CardHeader>
            <CardTitle>My Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assets.map((asset) => (
                <div 
                  key={asset.id} 
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  data-testid={`asset-card-${asset.id}`}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground" data-testid={`text-asset-name-${asset.id}`}>
                      {asset.name}
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-asset-id-${asset.id}`}>
                      Asset ID: {asset.id.slice(-8)}
                    </div>
                  </div>
                  <Badge 
                    className={getStatusColor(asset.status)}
                    data-testid={`badge-asset-status-${asset.id}`}
                  >
                    {asset.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Asset Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned To</th>
                  {showActions && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={showActions ? 5 : 4} className="px-6 py-8 text-center text-muted-foreground">
                      No assets found
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset.id} data-testid={`row-asset-${asset.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground" data-testid={`text-asset-name-${asset.id}`}>
                          {asset.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {asset.serialNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-asset-type-${asset.id}`}>
                        {asset.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          className={getStatusColor(asset.status)}
                          data-testid={`badge-asset-status-${asset.id}`}
                        >
                          {asset.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {asset.assignedToUserId ? asset.assignedToUserId.slice(-8) : "Unassigned"}
                      </td>
                      {showActions && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateAssetMutation.mutate({ 
                              assetId: asset.id, 
                              status: asset.status === 'available' ? 'maintenance' : 'available'
                            })}
                            disabled={updateAssetMutation.isPending}
                            data-testid={`button-toggle-asset-${asset.id}`}
                          >
                            {asset.status === 'available' ? 'Mark Maintenance' : 'Mark Available'}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
