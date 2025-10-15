import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
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
  const processedUsersRef = useRef<Set<string>>(new Set());
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [terminationDialogOpen, setTerminationDialogOpen] = useState(false);
  const [pendingTermination, setPendingTermination] = useState<{
    attendanceId: string;
    status: string;
    userId: string;
    userName: string;
  } | null>(null);
  const [terminationComment, setTerminationComment] = useState("");

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

  const createTerminationMutation = useMutation({
    mutationFn: async ({ attendanceId, status, userId, comment }: { 
      attendanceId: string; 
      status: string; 
      userId: string;
      comment: string;
    }) => {
      const res = await apiRequest("POST", `/api/attendance/${attendanceId}/terminate`, { 
        status,
        userId,
        comment 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/terminations"] });
      setTerminationDialogOpen(false);
      setPendingTermination(null);
      setTerminationComment("");
      toast({
        title: "Termination Recorded",
        description: "Employee termination has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Record Termination",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTime = (date: Date | null) => {
    return "-";
  };

  // Auto-create attendance records for team members without records
  useEffect(() => {
    if (user?.role === 'team_leader' && teamMembers.length > 0 && attendanceRecords) {
      const agentMembers = teamMembers.filter(member => member.role === 'agent');
      const membersWithoutRecords = agentMembers.filter(
        member => !attendanceRecords.some(record => record.userId === member.id) &&
                  !processedUsersRef.current.has(member.id)
      );

      if (membersWithoutRecords.length === 0) return;

      // Create attendance records for members without records
      (async () => {
        for (const member of membersWithoutRecords) {
          try {
            processedUsersRef.current.add(member.id);
            await apiRequest("POST", `/api/attendance/clock-in-for-user`, {
              userId: member.id,
              status: 'at work'
            });
          } catch (error) {
            console.error(`Failed to create attendance for ${member.username}:`, error);
            processedUsersRef.current.delete(member.id);
          }
        }
        // Refresh attendance records after creating all
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      })();
    }
  }, [user?.role, teamMembers, attendanceRecords]);

  // For team leaders: show all team members with their attendance (or create placeholder if no attendance)
  const allDisplayRecords = user?.role === 'team_leader' 
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

  // Apply search and filter
  const displayRecords = useMemo(() => {
    return allDisplayRecords.filter(record => {
      const userName = record.user?.firstName && record.user?.lastName 
        ? `${record.user.firstName} ${record.user.lastName}`
        : record.user?.username || '';
      
      const matchesSearch = searchTerm === "" || 
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.status?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "at work" && (record.status === "at work" || record.status === "present")) ||
        record.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [allDisplayRecords, searchTerm, statusFilter]);

  if (isLoading) {
    return <div className="text-center py-8">Loading attendance data...</div>;
  }

  const handleStatusChange = (attendanceId: string, status: string, userId?: string, userName?: string) => {
    // Check if this is a termination status
    if (['AWOL', 'suspended', 'resignation'].includes(status) && userId) {
      // Show termination dialog
      setPendingTermination({
        attendanceId,
        status,
        userId,
        userName: userName || 'Unknown User'
      });
      setTerminationDialogOpen(true);
    } else {
      // Regular status update
      updateStatusMutation.mutate({ attendanceId, status, userId });
    }
  };

  const handleTerminationSubmit = () => {
    if (!pendingTermination || !terminationComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please enter a comment for this termination.",
        variant: "destructive",
      });
      return;
    }

    createTerminationMutation.mutate({
      attendanceId: pendingTermination.attendanceId,
      status: pendingTermination.status,
      userId: pendingTermination.userId,
      comment: terminationComment.trim(),
    });
  };

  return (
    <>
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-foreground">Today's Attendance</h2>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-[200px]"
                  data-testid="input-search-attendance"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="at work">At Work</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="on leave">On Leave</SelectItem>
                    <SelectItem value="AWOL">AWOL</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="resignation">Resignation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead style={{ backgroundColor: '#1a1f5c' }}>
              <tr>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Employee</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Clock In</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Clock Out</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Hours</th>
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
                displayRecords.map((record) => {
                  const userName = record.user?.firstName && record.user?.lastName 
                    ? `${record.user.firstName} ${record.user.lastName}`
                    : record.user?.username || 'Unknown User';
                  
                  return (
                    <tr key={record.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-attendance-${record.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                            {((record.user?.firstName?.[0] || '') + (record.user?.lastName?.[0] || '')).toUpperCase() || 'U'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground" data-testid={`text-employee-name-${record.id}`}>
                              {userName}
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
                          onValueChange={(value) => handleStatusChange(record.id, value, record.userId, userName)}
                          disabled={user?.role !== 'team_leader' && user?.role !== 'admin' && user?.role !== 'hr'}
                        >
                          <SelectTrigger 
                            className="w-[130px]" 
                            data-testid={`select-status-${record.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="item-aligned">
                            <SelectItem value="-">-</SelectItem>
                            <SelectItem value="at work">At Work</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="sick">Sick</SelectItem>
                            <SelectItem value="on leave">On Leave</SelectItem>
                            <SelectItem value="AWOL">AWOL</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="resignation">Resignation</SelectItem>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={terminationDialogOpen} onOpenChange={setTerminationDialogOpen}>
        <DialogContent data-testid="dialog-termination-comment">
          <DialogHeader>
            <DialogTitle>Add Termination Comment</DialogTitle>
            <DialogDescription>
              You are marking <strong>{pendingTermination?.userName}</strong> as <strong>{pendingTermination?.status}</strong>. 
              Please provide a reason or comment for this action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                data-testid="textarea-termination-comment"
                placeholder="Enter reason for termination..."
                value={terminationComment}
                onChange={(e) => setTerminationComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTerminationDialogOpen(false);
                setPendingTermination(null);
                setTerminationComment("");
              }}
              data-testid="button-cancel-termination"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTerminationSubmit}
              disabled={createTerminationMutation.isPending}
              data-testid="button-submit-termination"
            >
              {createTerminationMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
