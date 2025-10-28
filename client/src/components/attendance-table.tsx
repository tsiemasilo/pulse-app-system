import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Attendance, User, Team, Termination } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AttendanceAuditLog from "./attendance-audit-log";

interface AttendanceRecord extends Attendance {
  user?: User;
}

export default function AttendanceTable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const processedUsersRef = useRef<Set<string>>(new Set());
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [terminationDialogOpen, setTerminationDialogOpen] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);
  const [pendingTermination, setPendingTermination] = useState<{
    attendanceId: string;
    status: string;
    userId: string;
    userName: string;
  } | null>(null);
  const [terminationComment, setTerminationComment] = useState("");
  const [backToWorkDialogOpen, setBackToWorkDialogOpen] = useState(false);
  const [pendingBackToWork, setPendingBackToWork] = useState<{
    attendanceId: string;
    newStatus: string;
    userId?: string;
    userName: string;
    currentStatus: string;
    willClearRecord?: boolean;
  } | null>(null);

  const { data: attendanceRecords = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/range", selectedDate ? format(selectedDate, "yyyy-MM-dd") : "today"],
    queryFn: async () => {
      if (selectedDate) {
        // Format date to YYYY-MM-DD for the specific day
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const response = await fetch(`/api/attendance/range?start=${dateStr}&end=${dateStr}`);
        if (!response.ok) throw new Error("Failed to fetch attendance");
        return response.json();
      } else {
        // Fetch today's attendance
        const response = await fetch(`/api/attendance/today`);
        if (!response.ok) throw new Error("Failed to fetch attendance");
        return response.json();
      }
    },
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

  // Fetch termination records
  const { data: terminations = [], isSuccess: terminationsLoaded } = useQuery<Termination[]>({
    queryKey: ["/api/terminations"],
    enabled: user?.role === 'team_leader' && !!user?.id,
  });

  // Helper function to get the last termination status for a user
  const getLastTerminationStatus = (userId: string): string | null => {
    if (!terminations.length) return null;
    
    // Filter terminations for this user
    const userTerminations = terminations
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    if (userTerminations.length === 0) return null;
    
    const lastTermination = userTerminations[0];
    const terminationStatuses = ['AWOL', 'suspended', 'resignation', 'terminated'];
    
    if (terminationStatuses.includes(lastTermination.statusType)) {
      return lastTermination.statusType;
    }
    
    return null;
  };

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
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/range"] });
      queryClient.invalidateQueries({ queryKey: ["/api/terminations"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/range"] });
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
      // Only auto-create for today's date, not historical dates
      const today = new Date();
      const isViewingToday = !selectedDate || 
        format(new Date(selectedDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

      if (!isViewingToday) return; // Skip auto-creation for historical dates

      // CRITICAL: Wait for terminations to load before auto-creating
      if (!terminationsLoaded) return;

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
            
            // Check if user has a recent termination status
            const terminationStatus = getLastTerminationStatus(member.id);
            const statusToUse = terminationStatus || 'at work';
            
            await apiRequest("POST", `/api/attendance/clock-in-for-user`, {
              userId: member.id,
              status: statusToUse
            });
          } catch (error) {
            console.error(`Failed to create attendance for ${member.username}:`, error);
            processedUsersRef.current.delete(member.id);
          }
        }
        // Refresh attendance records after creating all
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/range"] });
      })();
    }
  }, [user?.role, teamMembers, attendanceRecords, terminationsLoaded, terminations]);

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
            // Check if user has a recent termination status
            const terminationStatus = getLastTerminationStatus(member.id);
            const statusToUse = terminationStatus || 'at work';
            
            return {
              id: `placeholder-${member.id}`,
              userId: member.id,
              date: new Date(),
              clockIn: null,
              clockOut: null,
              status: statusToUse,
              hoursWorked: 0,
              createdAt: new Date(),
              user: member,
            } as AttendanceRecord;
          }
        })
    : attendanceRecords;

  // Apply search and filter
  const filteredRecords = useMemo(() => {
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
      
      // Date filtering - compare only the date part (YYYY-MM-DD)
      const matchesDate = !selectedDate || (
        record.date && 
        format(new Date(record.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      );
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [allDisplayRecords, searchTerm, statusFilter, selectedDate]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const displayRecords = filteredRecords.slice(startIndex, endIndex);

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedDate]);

  if (isLoading) {
    return <div className="text-center py-8">Loading attendance data...</div>;
  }

  // Check if the selected date is today
  const isViewingToday = () => {
    if (!selectedDate) return true; // No date selected means viewing today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() === today.getTime();
  };

  const handleStatusChange = async (attendanceId: string, newStatus: string, userId?: string, userName?: string) => {
    // Find the current status of this record
    const currentRecord = allDisplayRecords.find(r => r.id === attendanceId);
    const currentStatus = currentRecord?.status;
    const currentDate = currentRecord?.date;
    
    const terminationStatuses = ['AWOL', 'suspended', 'resignation', 'terminated'];
    
    // Check if changing FROM a termination status TO another status
    if (currentStatus && terminationStatuses.includes(currentStatus) && !terminationStatuses.includes(newStatus) && userId) {
      // Get the user's most recent termination to check the date
      const lastTermination = getLastTerminationStatus(userId);
      
      if (lastTermination && terminations.length > 0) {
        // Find the actual termination record with the date
        const userTerminations = terminations
          .filter(t => t.userId === userId && terminationStatuses.includes(t.statusType))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        if (userTerminations.length > 0) {
          const mostRecentTermination = userTerminations[0];
          const terminationDate = new Date(mostRecentTermination.effectiveDate);
          const today = new Date();
          const attendanceDate = currentDate ? new Date(currentDate) : today;
          
          // Set to start of day for comparison
          terminationDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          attendanceDate.setHours(0, 0, 0, 0);
          
          const isTerminationToday = terminationDate.getTime() === today.getTime();
          const isAttendanceToday = attendanceDate.getTime() === today.getTime();
          
          // Show back-to-work confirmation dialog with appropriate message
          setPendingBackToWork({
            attendanceId,
            newStatus,
            userId,
            userName: userName || 'Unknown User',
            currentStatus,
            willClearRecord: isTerminationToday && isAttendanceToday
          });
          setBackToWorkDialogOpen(true);
          return;
        }
      }
      
      // If no termination found, just show the regular dialog
      setPendingBackToWork({
        attendanceId,
        newStatus,
        userId,
        userName: userName || 'Unknown User',
        currentStatus,
        willClearRecord: false
      });
      setBackToWorkDialogOpen(true);
      return;
    }
    
    // Check if this is a termination status (AWOL/suspended/resignation)
    if (terminationStatuses.includes(newStatus) && userId) {
      // Show termination dialog
      setPendingTermination({
        attendanceId,
        status: newStatus,
        userId,
        userName: userName || 'Unknown User'
      });
      setTerminationDialogOpen(true);
    } else {
      // Regular status update
      updateStatusMutation.mutate({ attendanceId, status: newStatus, userId });
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

  const handleBackToWorkConfirm = () => {
    if (!pendingBackToWork) return;
    
    // Update the status
    updateStatusMutation.mutate({
      attendanceId: pendingBackToWork.attendanceId,
      status: pendingBackToWork.newStatus,
      userId: pendingBackToWork.userId,
    });
    
    // Close dialog and reset state
    setBackToWorkDialogOpen(false);
    setPendingBackToWork(null);
  };

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="bg-card rounded-lg border border-border shadow-sm mb-6">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-foreground">Today's Attendance</h2>
            
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
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-[180px] justify-start text-left font-normal"
                    data-testid="button-date-filter"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date)}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedDate(undefined)}
                        data-testid="button-clear-date"
                      >
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="at work">At Work</SelectItem>
                    <SelectItem value="at work (remote)">At Work (Remote)</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="on leave">On Leave</SelectItem>
                    <SelectItem value="AWOL">AWOL</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="resignation">Resignation</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredRecords.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
          </p>
        </div>

        <div className="overflow-x-auto">
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
                        {!isViewingToday() ? (
                          <span className="text-sm font-medium text-foreground" data-testid={`text-status-readonly-${record.id}`}>
                            {record.status || '-'}
                          </span>
                        ) : (
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
                              <SelectItem value="at work (remote)">At Work (Remote)</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="sick">Sick</SelectItem>
                              <SelectItem value="on leave">On Leave</SelectItem>
                              <SelectItem value="AWOL">AWOL</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="resignation">Resignation</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
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

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
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

      <Dialog open={backToWorkDialogOpen} onOpenChange={setBackToWorkDialogOpen}>
        <DialogContent data-testid="dialog-back-to-work-confirm">
          <DialogHeader>
            <DialogTitle>Confirm Employee Return</DialogTitle>
            <DialogDescription>
              <strong>{pendingBackToWork?.userName}</strong> is currently marked as <strong>{pendingBackToWork?.currentStatus}</strong>.
              <br />
              <br />
              Are you sure <strong>{pendingBackToWork?.userName}</strong> is back to work?
              <br />
              <br />
              {pendingBackToWork?.willClearRecord ? (
                <span className="text-amber-600 dark:text-amber-400">
                  Note: This will clear the termination record from the Employee Terminations table because the status was changed on the same day it was marked.
                </span>
              ) : (
                <span className="text-blue-600 dark:text-blue-400">
                  Note: The termination record will be kept in the Employee Terminations table for historical tracking.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBackToWorkDialogOpen(false);
                setPendingBackToWork(null);
              }}
              data-testid="button-cancel-back-to-work"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBackToWorkConfirm}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-back-to-work"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={auditLogDialogOpen} onOpenChange={setAuditLogDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-attendance-audit-log">
          <DialogHeader>
            <DialogTitle>Attendance Audit Log</DialogTitle>
            <DialogDescription>
              View the complete history of status changes for this attendance record.
            </DialogDescription>
          </DialogHeader>
          {selectedAttendanceId && (
            <AttendanceAuditLog attendanceId={selectedAttendanceId} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
