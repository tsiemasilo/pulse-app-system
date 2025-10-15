import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Clock, Calendar, Search, Filter, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { Attendance, User, Team } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function HRAttendanceView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const { user } = useAuth();

  // Fetch team leader's teams
  const { data: leaderTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams/leader", user?.id],
    enabled: user?.role === 'team_leader' && !!user?.id,
  });

  // Fetch team members for ALL teams the leader manages
  const teamMembersQueries = useQueries({
    queries: leaderTeams.map(team => ({
      queryKey: ["/api/teams", team.id, "members"],
      enabled: user?.role === 'team_leader',
    })),
  });

  // Aggregate all team members from all teams
  const teamMembers = useMemo(() => {
    const allMembers: User[] = [];
    const seenIds = new Set<string>();
    
    teamMembersQueries.forEach(query => {
      if (query.data) {
        const members = query.data as User[];
        members.forEach(member => {
          if (!seenIds.has(member.id)) {
            seenIds.add(member.id);
            allMembers.push(member);
          }
        });
      }
    });
    
    return allMembers;
  }, [teamMembersQueries]);

  // Fetch attendance records with date range support
  const { data: fetchedAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/range", selectedDate ? format(selectedDate, "yyyy-MM-dd") : "all"],
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
        // Fetch all attendance records - use a wide date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Last year
        
        const endYear = endDate.getFullYear();
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        const endDay = String(endDate.getDate()).padStart(2, '0');
        const endDateStr = `${endYear}-${endMonth}-${endDay}`;
        
        const startYear = startDate.getFullYear();
        const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
        const startDay = String(startDate.getDate()).padStart(2, '0');
        const startDateStr = `${startYear}-${startMonth}-${startDay}`;
        
        const response = await fetch(`/api/attendance/range?start=${startDateStr}&end=${endDateStr}`);
        if (!response.ok) throw new Error("Failed to fetch attendance");
        return response.json();
      }
    },
  });

  // Filter attendance by team leader's team members
  const attendanceRecords = useMemo(() => {
    if (user?.role === 'team_leader') {
      // Filter for team leaders to show only their team members
      const teamMemberIds = teamMembers.map(m => m.id);
      return fetchedAttendance.filter(a => teamMemberIds.includes(a.userId));
    }
    // Non-team-leaders (admin, HR, etc.) see all records
    return fetchedAttendance;
  }, [fetchedAttendance, teamMembers, user?.role]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getUserInfo = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? {
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      role: user.role,
      department: user.departmentId
    } : { name: 'Unknown', role: 'unknown', department: null };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatTime = (dateString: string | Date | null) => {
    if (!dateString) return '--:--';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, 'HH:mm');
  };

  const calculateHours = (clockIn: string | Date | null, clockOut: string | Date | null) => {
    if (!clockIn) return 0;
    const start = typeof clockIn === 'string' ? new Date(clockIn) : clockIn;
    const end = clockOut ? (typeof clockOut === 'string' ? new Date(clockOut) : clockOut) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(0, hours);
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const userInfo = getUserInfo(record.userId);
    const matchesSearch = searchTerm === "" || 
      userInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.status?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "present" && (record.status === "present" || record.status === "at work")) ||
      record.status === statusFilter;
    const matchesRole = roleFilter === "all" || userInfo.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

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
  }, [searchTerm, statusFilter, roleFilter, selectedDate]);

  const summary = {
    total: filteredRecords.length,
    present: filteredRecords.filter(r => r.status === 'at work' || r.status === 'present').length,
    absent: filteredRecords.filter(r => r.status !== 'at work' && r.status !== 'present' && r.status !== 'late').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    onLeave: filteredRecords.filter(r => r.status === 'leave').length,
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Employee Attendance Management
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          View and search attendance records. Filter by date, status, or role to find specific records.
        </p>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{summary.present}</div>
            <div className="text-xs text-green-600">Present</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
            <div className="text-xs text-red-600">Absent</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.late}</div>
            <div className="text-xs text-yellow-600">Late</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.onLeave}</div>
            <div className="text-xs text-purple-600">On Leave</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              data-testid="input-search-employees"
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[200px] justify-start text-left font-normal"
                data-testid="button-calendar-filter"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>All Records</span>}
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
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40" data-testid="select-role-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="team_leader">Team Leader</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead style={{ backgroundColor: '#1a1f5c' }}>
                <tr>
                  <th className="text-left py-5 px-6 text-sm font-semibold text-white uppercase tracking-wide">Employee</th>
                  <th className="text-left py-5 px-6 text-sm font-semibold text-white uppercase tracking-wide">Date</th>
                  <th className="text-left py-5 px-6 text-sm font-semibold text-white uppercase tracking-wide">Role</th>
                  <th className="text-left py-5 px-6 text-sm font-semibold text-white uppercase tracking-wide">Status</th>
                  <th className="text-left py-5 px-6 text-sm font-semibold text-white uppercase tracking-wide">Clock In</th>
                  <th className="text-left py-5 px-6 text-sm font-semibold text-white uppercase tracking-wide">Clock Out</th>
                  <th className="text-left py-5 px-6 text-sm font-semibold text-white uppercase tracking-wide">Hours</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => {
                    const userInfo = getUserInfo(record.userId);
                    const hoursWorked = calculateHours(record.clockIn, record.clockOut);
                    
                    return (
                      <tr key={record.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-attendance-${record.id}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{userInfo.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm" data-testid={`text-date-${record.id}`}>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(record.date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-muted-foreground capitalize">
                          {userInfo.role.replace('_', ' ')}
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={getStatusColor(record.status)} data-testid={`badge-status-${record.id}`}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-sm" data-testid={`text-clock-in-${record.id}`}>
                          {formatTime(record.clockIn)}
                        </td>
                        <td className="py-4 px-6 text-sm" data-testid={`text-clock-out-${record.id}`}>
                          {formatTime(record.clockOut)}
                        </td>
                        <td className="py-4 px-6 text-sm" data-testid={`text-hours-${record.id}`}>
                          {hoursWorked.toFixed(1)}h
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

        {/* Export/Action buttons */}
        <div className="flex justify-end mt-6 space-x-2">
          <Button variant="outline" data-testid="button-export-attendance">
            Export Report
          </Button>
          <Button variant="outline" data-testid="button-refresh-attendance">
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}