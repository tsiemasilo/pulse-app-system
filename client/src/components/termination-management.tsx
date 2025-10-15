import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, Calendar, User, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Termination, User as UserType } from "@shared/schema";

export default function TerminationManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: terminations = [] } = useQuery<Termination[]>({
    queryKey: ["/api/terminations"],
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

  const totalPages = Math.ceil(filteredTerminations.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedTerminations = filteredTerminations.slice(startIndex, endIndex);

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
  }, [searchQuery, typeFilter]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserX className="h-5 w-5 mr-2" />
          Employee Terminations
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Termination records are automatically created when team leaders mark employees as AWOL, Suspended, or Resignation in the attendance tab.
        </p>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Section */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-terminations"
            />
          </div>
          
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
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTerminations.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredTerminations.length)} of {filteredTerminations.length} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#1a1f5c' }}>
                <tr>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Employee</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status Type</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Comment</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Processed By</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Effective Date</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedTerminations.length === 0 ? (
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
