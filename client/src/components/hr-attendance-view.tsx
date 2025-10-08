import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Search, Filter, Users } from "lucide-react";
import { format } from "date-fns";
import type { Attendance, User } from "@shared/schema";

export default function HRAttendanceView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

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
    const matchesSearch = userInfo.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: filteredRecords.length,
    present: filteredRecords.filter(r => r.status === 'at work').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    onLeave: filteredRecords.filter(r => r.status === 'leave').length,
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Employee Attendance Tracking
        </CardTitle>
        
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
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              data-testid="input-search-employees"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              data-testid="input-attendance-date"
            />
          </div>
          
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
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Clock In</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Clock Out</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Hours</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No attendance records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const userInfo = getUserInfo(record.userId);
                  const hoursWorked = calculateHours(record.clockIn, record.clockOut);
                  
                  return (
                    <tr key={record.id} className="border-b border-border hover:bg-muted/50" data-testid={`row-attendance-${record.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{userInfo.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground capitalize">
                        {userInfo.role.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(record.status)} data-testid={`badge-status-${record.id}`}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm" data-testid={`text-clock-in-${record.id}`}>
                        {formatTime(record.clockIn)}
                      </td>
                      <td className="py-3 px-4 text-sm" data-testid={`text-clock-out-${record.id}`}>
                        {formatTime(record.clockOut)}
                      </td>
                      <td className="py-3 px-4 text-sm" data-testid={`text-hours-${record.id}`}>
                        {hoursWorked.toFixed(1)}h
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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