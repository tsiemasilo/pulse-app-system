import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { AssetStateAudit, User } from "@shared/schema";
import { FileText } from "lucide-react";

interface AssetAuditLogProps {
  userId: string;
}

export default function AssetAuditLog({ userId }: AssetAuditLogProps) {
  const { data: auditLogs = [], isLoading } = useQuery<AssetStateAudit[]>({
    queryKey: [`/api/assets/audit/${userId}`],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : userId;
  };

  const formatAssetType = (assetType: string) => {
    const typeMap: Record<string, string> = {
      'laptop': 'Laptop',
      'headsets': 'Headsets',
      'dongle': 'Dongle',
      'mouse': 'Mouse',
      'lan_adapter': 'LAN Adapter',
    };
    return typeMap[assetType] || assetType;
  };

  const formatStateBadge = (state: string | null) => {
    if (!state) return <Badge variant="outline" data-testid="badge-state-null">N/A</Badge>;
    
    const stateConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'ready_for_collection': { variant: 'outline', label: 'Ready for Collection' },
      'collected': { variant: 'default', label: 'Collected' },
      'not_collected': { variant: 'destructive', label: 'Not Collected' },
      'returned': { variant: 'secondary', label: 'Returned' },
      'not_returned': { variant: 'destructive', label: 'Not Returned' },
      'lost': { variant: 'destructive', label: 'Lost' },
    };

    const config = stateConfig[state] || { variant: 'outline' as const, label: state };
    return <Badge variant={config.variant} data-testid={`badge-state-${state}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card data-testid="card-asset-audit-loading">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Asset Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" data-testid="skeleton-audit-row-1" />
            <Skeleton className="h-10 w-full" data-testid="skeleton-audit-row-2" />
            <Skeleton className="h-10 w-full" data-testid="skeleton-audit-row-3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <Card data-testid="card-asset-audit-empty">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Asset Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4" data-testid="text-no-audit-logs">
            No audit logs available for this user's assets.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by most recent first
  const sortedLogs = [...auditLogs].sort((a, b) => 
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <Card data-testid="card-asset-audit">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Asset Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="header-date-time">Date/Time</TableHead>
              <TableHead data-testid="header-changed-by">Changed By</TableHead>
              <TableHead data-testid="header-asset-type">Asset Type</TableHead>
              <TableHead data-testid="header-change">State Change</TableHead>
              <TableHead data-testid="header-reason">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.map((log, index) => (
              <TableRow key={log.id} data-testid={`row-audit-${index}`}>
                <TableCell data-testid={`cell-date-${index}`}>
                  {format(new Date(log.changedAt), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell data-testid={`cell-changed-by-${index}`}>
                  {getUserName(log.changedBy)}
                </TableCell>
                <TableCell data-testid={`cell-asset-type-${index}`}>
                  {formatAssetType(log.assetType)}
                </TableCell>
                <TableCell data-testid={`cell-change-${index}`}>
                  <div className="flex items-center gap-2">
                    {formatStateBadge(log.previousState)}
                    <span className="text-muted-foreground">→</span>
                    {formatStateBadge(log.newState)}
                  </div>
                </TableCell>
                <TableCell data-testid={`cell-reason-${index}`}>
                  {log.reason || <span className="text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
