import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { AttendanceAudit, User } from "@shared/schema";
import { FileText } from "lucide-react";

interface AttendanceAuditLogProps {
  attendanceId: string;
}

interface AttendanceAuditWithUser extends AttendanceAudit {
  changedByUser?: User;
}

export default function AttendanceAuditLog({ attendanceId }: AttendanceAuditLogProps) {
  const { data: auditLogs = [], isLoading } = useQuery<AttendanceAudit[]>({
    queryKey: [`/api/attendance/${attendanceId}/audit`],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : userId;
  };

  const formatStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" data-testid="badge-status-null">N/A</Badge>;
    
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'at work': { variant: 'default', label: 'At Work' },
      'at work (remote)': { variant: 'secondary', label: 'At Work (Remote)' },
      'sick': { variant: 'destructive', label: 'Sick' },
      'on leave': { variant: 'secondary', label: 'On Leave' },
      'AWOL': { variant: 'destructive', label: 'AWOL' },
      'suspended': { variant: 'destructive', label: 'Suspended' },
      'resignation': { variant: 'outline', label: 'Resignation' },
      'terminated': { variant: 'destructive', label: 'Terminated' },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card data-testid="card-attendance-audit-loading">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Attendance Audit Log
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
      <Card data-testid="card-attendance-audit-empty">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Attendance Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4" data-testid="text-no-audit-logs">
            No audit logs available for this attendance record.
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
    <Card data-testid="card-attendance-audit">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Attendance Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="header-date-time">Date/Time</TableHead>
              <TableHead data-testid="header-changed-by">Changed By</TableHead>
              <TableHead data-testid="header-change">Change</TableHead>
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
                <TableCell data-testid={`cell-change-${index}`}>
                  <div className="flex items-center gap-2">
                    {formatStatusBadge(log.previousStatus)}
                    <span className="text-muted-foreground">→</span>
                    {formatStatusBadge(log.newStatus)}
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
