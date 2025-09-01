import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { Attendance, User } from "@shared/schema";

interface AttendanceRecord extends Attendance {
  user?: User;
}

export default function AttendanceTable() {
  const { data: attendanceRecords = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/today"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return "bg-green-100 text-green-800";
      case 'late':
        return "bg-yellow-100 text-yellow-800";
      case 'absent':
        return "bg-red-100 text-red-800";
      case 'leave':
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading attendance data...</div>;
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Today's Attendance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Clock In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Clock Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Hours</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {attendanceRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No attendance records found for today
                </td>
              </tr>
            ) : (
              attendanceRecords.map((record) => (
                <tr key={record.id} data-testid={`row-attendance-${record.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {((record.user?.firstName?.[0] || '') + (record.user?.lastName?.[0] || '')).toUpperCase() || 'U'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground" data-testid={`text-employee-name-${record.id}`}>
                          {record.user?.firstName} {record.user?.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {record.userId.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-clock-in-${record.id}`}>
                    {formatTime(record.clockIn)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-clock-out-${record.id}`}>
                    {formatTime(record.clockOut)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      className={getStatusColor(record.status)}
                      data-testid={`badge-status-${record.id}`}
                    >
                      {record.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-hours-${record.id}`}>
                    {record.hoursWorked || 0}h
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
