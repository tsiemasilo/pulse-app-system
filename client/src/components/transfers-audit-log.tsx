import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { TransfersAudit, User } from "@shared/schema";
import { FileText } from "lucide-react";

interface TransfersAuditLogProps {
  transferId: string;
}

export default function TransfersAuditLog({ transferId }: TransfersAuditLogProps) {
  const { data: auditLogs = [], isLoading } = useQuery<TransfersAudit[]>({
    queryKey: [`/api/transfers/${transferId}/audit`],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : userId;
  };

  const formatActionBadge = (action: string) => {
    const actionConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'approved': { variant: 'default', label: 'Approved' },
      'rejected': { variant: 'destructive', label: 'Rejected' },
      'completed': { variant: 'secondary', label: 'Completed' },
    };

    const config = actionConfig[action] || { variant: 'outline' as const, label: action };
    return <Badge variant={config.variant} data-testid={`badge-action-${action}`}>{config.label}</Badge>;
  };

  const formatStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" data-testid="badge-status-null">N/A</Badge>;
    
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'pending': { variant: 'outline', label: 'Pending' },
      'approved': { variant: 'default', label: 'Approved' },
      'rejected': { variant: 'destructive', label: 'Rejected' },
      'completed': { variant: 'secondary', label: 'Completed' },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card data-testid="card-transfers-audit-loading">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Transfer Audit Log
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
      <Card data-testid="card-transfers-audit-empty">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Transfer Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4" data-testid="text-no-audit-logs">
            No audit logs available for this transfer.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by most recent first
  const sortedLogs = [...auditLogs].sort((a, b) => 
    new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime()
  );

  return (
    <Card data-testid="card-transfers-audit">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Transfer Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="header-date-time">Date/Time</TableHead>
              <TableHead data-testid="header-action-by">Action By</TableHead>
              <TableHead data-testid="header-action">Action</TableHead>
              <TableHead data-testid="header-change">Status Change</TableHead>
              <TableHead data-testid="header-comment">Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.map((log, index) => (
              <TableRow key={log.id} data-testid={`row-audit-${index}`}>
                <TableCell data-testid={`cell-date-${index}`}>
                  {format(new Date(log.actionAt), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell data-testid={`cell-action-by-${index}`}>
                  {getUserName(log.actionBy)}
                </TableCell>
                <TableCell data-testid={`cell-action-${index}`}>
                  {formatActionBadge(log.action)}
                </TableCell>
                <TableCell data-testid={`cell-change-${index}`}>
                  <div className="flex items-center gap-2">
                    {formatStatusBadge(log.previousStatus)}
                    <span className="text-muted-foreground">→</span>
                    {formatStatusBadge(log.newStatus)}
                  </div>
                </TableCell>
                <TableCell data-testid={`cell-comment-${index}`}>
                  {log.comment || <span className="text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
