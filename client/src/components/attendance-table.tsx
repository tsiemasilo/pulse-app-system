import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Attendance, User, Team } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord extends Attendance {
  user?: User;
}

export default function AttendanceTable() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: attendanceRecords = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/today"],
  });

  // Fetch team leader's teams
  const { data: leaderTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams/leader", user?.id],
    enabled: user?.role === 'team_leader' && !!user?.id,
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/teams", leaderTeams[0]?.id, "members"],
    enabled: user?.role === 'team_leader' && leaderTeams.length > 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ attendanceId, status, userId }: { attendanceId: string; status: string; userId?: string }) => {
      // If this is a placeholder record, create attendance first
      if (attendanceId.startsWith('placeholder-') && userId) {
        // Clock in the user first to create an attendance record
        const clockInRes = await apiRequest("POST", `/api/attendance/clock-in-for-user`, { 
          userId,
          status 
        });
        return await clockInRes.json();
      } else {
        // Update existing attendance record
        const res = await apiRequest("PATCH", `/api/attendance/${attendanceId}/status`, { status });
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Status Updated",
        description: "Attendance status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTime = (date: Date | null) => {
    return "-";
  };

  // For team leaders: show all team members with their attendance (or create placeholder if no attendance)
  const displayRecords = user?.role === 'team_leader' 
    ? teamMembers
        .filter(member => member.role === 'agent')
        .map(member => {
          const attendanceRecord = attendanceRecords.find(record => record.userId === member.id);
          if (attendanceRecord) {
            return { ...attendanceRecord, user: member };
          } else {
            // Create a placeholder record for team members who haven't clocked in
            return {
              id: `placeholder-${member.id}`,
              userId: member.id,
              date: new Date(),
              clockIn: null,
              clockOut: null,
              status: 'at work',
              hoursWorked: 0,
              createdAt: new Date(),
              user: member,
            } as AttendanceRecord;
          }
        })
    : attendanceRecords;

  if (isLoading) {
    return <div className="text-center py-8">Loading attendance data...</div>;
  }

  const handleStatusChange = (attendanceId: string, status: string, userId?: string) => {
    updateStatusMutation.mutate({ attendanceId, status, userId });
  };

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
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Clock In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Clock Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Hours</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {displayRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No team members found
                </td>
              </tr>
            ) : (
              displayRecords.map((record) => (
                <tr key={record.id} data-testid={`row-attendance-${record.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {((record.user?.firstName?.[0] || '') + (record.user?.lastName?.[0] || '')).toUpperCase() || 'U'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground" data-testid={`text-employee-name-${record.id}`}>
                          {record.user?.firstName && record.user?.lastName 
                            ? `${record.user.firstName} ${record.user.lastName}`
                            : record.user?.username || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{record.user?.username || record.userId.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={record.status}
                      onValueChange={(value) => handleStatusChange(record.id, value, record.userId)}
                      disabled={user?.role !== 'team_leader' && user?.role !== 'admin' && user?.role !== 'hr'}
                    >
                      <SelectTrigger 
                        className="w-[130px]" 
                        data-testid={`select-status-${record.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
                        <SelectItem value="-">-</SelectItem>
                        <SelectItem value="at work">At Work</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="on leave">On Leave</SelectItem>
                        <SelectItem value="AWOL">AWOL</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-clock-in-${record.id}`}>
                    {formatTime(record.clockIn)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-clock-out-${record.id}`}>
                    {formatTime(record.clockOut)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-hours-${record.id}`}>
                    -
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
