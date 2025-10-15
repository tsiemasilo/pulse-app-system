import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, Calendar, User, Search, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Termination, User as UserType, Attendance } from "@shared/schema";

export default function TerminationManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [managementType, setManagementType] = useState<"terminations" | "attendance">("terminations");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const recordsPerPage = 10;

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: terminations = [] } = useQuery<Termination[]>({
    queryKey: ["/api/terminations"],
  });

  // Fetch all attendance records or by date
  const { data: allAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/range", selectedDate ? format(selectedDate, "yyyy-MM-dd") : "all"],
    queryFn: async () => {
      if (selectedDate) {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(`/api/attendance/range?start=${dateStr}&end=${dateStr}`);
        if (!response.ok) throw new Error("Failed to fetch attendance");
        return response.json();
      } else {
        // Fetch all attendance records - use a wide date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Last year
        const response = await fetch(`/api/attendance/range?start=${format(startDate, "yyyy-MM-dd")}&end=${format(endDate, "yyyy-MM-dd")}`);
        if (!response.ok) throw new Error("Failed to fetch attendance");
        return response.json();
      }
    },
    enabled: managementType === "attendance",
  });

  const getStatusTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'awol':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'suspended':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'resignation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
      case 'at work':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'absent':
      case 'awol':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'sick':
      case 'on leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'suspended':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'resignation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
  };

  // Filter and paginate terminations
  const filteredTerminations = useMemo(() => {
    return terminations.filter((termination) => {
      const userName = getUserName(termination.userId);
      const matchesSearch = searchQuery === "" || 
        userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        termination.comment?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || termination.statusType.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [terminations, searchQuery, typeFilter]);

  // Filter and paginate attendance records
  const filteredAttendance = useMemo(() => {
    return allAttendance.filter((record) => {
      const userName = getUserName(record.userId);
      const matchesSearch = searchQuery === "" || 
        userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.status?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [allAttendance, searchQuery]);

  const currentRecords = managementType === "terminations" ? filteredTerminations : filteredAttendance;
  const totalPages = Math.ceil(currentRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedTerminations = filteredTerminations.slice(startIndex, endIndex);
  const paginatedAttendance = filteredAttendance.slice(startIndex, endIndex);

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
  }, [searchQuery, typeFilter, managementType, selectedDate]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          {managementType === "terminations" ? (
            <>
              <UserX className="h-5 w-5 mr-2" />
              Employee Terminations
            </>
          ) : (
            <>
              <ClipboardList className="h-5 w-5 mr-2" />
              Attendance Management Audit
            </>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          {managementType === "terminations" 
            ? "Termination records are automatically created when team leaders mark employees as AWOL, Suspended, or Resignation in the attendance tab."
            : "View audit log of attendance status changes and records. Filter by date or view all records."
          }
        </p>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Section */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={managementType === "terminations" ? "Search by employee name or comment..." : "Search by employee name or status..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-records"
            />
          </div>
          
          <Select value={managementType} onValueChange={(value: "terminations" | "attendance") => setManagementType(value)}>
            <SelectTrigger className="w-[240px]" data-testid="select-management-type">
              <SelectValue placeholder="Select Management Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="terminations">Terminations Management</SelectItem>
              <SelectItem value="attendance">Attendance Management</SelectItem>
            </SelectContent>
          </Select>

          {managementType === "terminations" ? (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="AWOL">AWOL</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="resignation">Resignation</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[240px] justify-start text-left font-normal"
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
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
              Showing {currentRecords.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, currentRecords.length)} of {currentRecords.length} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#1a1f5c' }}>
                {managementType === "terminations" ? (
                  <tr>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Employee</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status Type</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Comment</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Processed By</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Effective Date</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Employee</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Date</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Clock In</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Clock Out</th>
                    <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Hours</th>
                  </tr>
                )}
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {managementType === "terminations" ? (
                  paginatedTerminations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No terminations found matching your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTerminations.map((termination) => (
                      <tr key={termination.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-termination-${termination.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium" data-testid={`text-user-${termination.id}`}>
                              {getUserName(termination.userId)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusTypeColor(termination.statusType)} data-testid={`badge-type-${termination.id}`}>
                            {termination.statusType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 max-w-xs" data-testid={`text-comment-${termination.id}`}>
                          {termination.comment ? (
                            <span className="truncate block" title={termination.comment}>
                              {termination.comment}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No comment provided</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm" data-testid={`text-processed-by-${termination.id}`}>
                          {getUserName(termination.processedBy)}
                        </td>
                        <td className="px-6 py-4 text-sm" data-testid={`text-effective-date-${termination.id}`}>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(termination.effectiveDate).toLocaleDateString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  paginatedAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        No attendance records found matching your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-attendance-${record.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium" data-testid={`text-user-${record.id}`}>
                              {getUserName(record.userId)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm" data-testid={`text-date-${record.id}`}>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(record.date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getAttendanceStatusColor(record.status)} data-testid={`badge-status-${record.id}`}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm" data-testid={`text-clock-in-${record.id}`}>
                          {record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm" data-testid={`text-clock-out-${record.id}`}>
                          {record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm" data-testid={`text-hours-${record.id}`}>
                          {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                        </td>
                      </tr>
                    ))
                  )
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
      </CardContent>
    </Card>
  );
}
