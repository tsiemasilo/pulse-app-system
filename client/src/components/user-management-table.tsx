import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User, Team } from "@shared/schema";
import { canRoleLogin } from "@shared/schema";
import { Search, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";

export default function UserManagementTable() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roleTypeFilter, setRoleTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const recordsPerPage = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getReportsToUser = (userId: string | null) => {
    if (!userId) return null;
    return users.find(u => u.id === userId);
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        const response = await apiRequest("DELETE", `/api/users/${userId}`);
        return response;
      } catch (error: any) {
        if (isUnauthorizedError(error)) {
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error("Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'System Admin';
      case 'team_leader':
        return 'Team Leader';
      case 'agent':
        return 'Agent';
      case 'hr':
        return 'HR Manager';
      case 'contact_center_ops_manager':
        return 'CC Ops Manager';
      case 'contact_center_manager':
        return 'CC Manager';
      default:
        return 'Unknown Role';
    }
  };

  const roleColorMap = {
    admin: "bg-slate-100 text-slate-700 border border-slate-200",
    hr: "bg-slate-100 text-slate-700 border border-slate-200",
    contact_center_ops_manager: "bg-slate-100 text-slate-700 border border-slate-200",
    contact_center_manager: "bg-slate-100 text-slate-700 border border-slate-200",
    team_leader: "bg-slate-100 text-slate-700 border border-slate-200",
    agent: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getDirectReports = (userId: string) => {
    return users.filter(u => u.reportsTo === userId);
  };

  const hasDirectReports = (userId: string) => {
    return users.some(u => u.reportsTo === userId);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = searchQuery === "" || 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      const matchesRoleType = roleTypeFilter === "all" || 
        (roleTypeFilter === "agents" && user.role === "agent") ||
        (roleTypeFilter === "team_leaders" && user.role === "team_leader") ||
        (roleTypeFilter === "cc_managers" && (user.role === "contact_center_manager" || user.role === "contact_center_ops_manager"));

      return matchesSearch && matchesStatus && matchesRole && matchesRoleType;
    });
  }, [users, searchQuery, statusFilter, roleFilter, roleTypeFilter]);

  const hierarchicalUsers = useMemo(() => {
    const result: Array<{ user: User; level: number; isExpanded: boolean; hasChildren: boolean }> = [];
    
    const roleOrder = {
      'admin': 1,
      'hr': 2,
      'contact_center_ops_manager': 3,
      'contact_center_manager': 4,
      'team_leader': 5,
      'agent': 6
    };

    const addUserWithChildren = (user: User, level: number) => {
      const hasChildren = hasDirectReports(user.id);
      const isExpanded = expandedUsers.has(user.id);
      
      result.push({ user, level, isExpanded, hasChildren });
      
      if (isExpanded && hasChildren) {
        const directReports = getDirectReports(user.id)
          .filter(u => filteredUsers.some(fu => fu.id === u.id))
          .sort((a, b) => {
            const roleComparison = (roleOrder[a.role as keyof typeof roleOrder] || 999) - (roleOrder[b.role as keyof typeof roleOrder] || 999);
            if (roleComparison !== 0) return roleComparison;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          });
        
        directReports.forEach(report => addUserWithChildren(report, level + 1));
      }
    };

    const topLevelUsers = filteredUsers
      .filter(u => !u.reportsTo || !filteredUsers.some(fu => fu.id === u.reportsTo))
      .sort((a, b) => {
        const roleComparison = (roleOrder[a.role as keyof typeof roleOrder] || 999) - (roleOrder[b.role as keyof typeof roleOrder] || 999);
        if (roleComparison !== 0) return roleComparison;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });

    topLevelUsers.forEach(user => addUserWithChildren(user, 0));
    
    return result;
  }, [filteredUsers, expandedUsers, users]);

  const totalPages = Math.ceil(hierarchicalUsers.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedUsers = hierarchicalUsers.slice(startIndex, endIndex);

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
  }, [searchQuery, statusFilter, roleFilter, roleTypeFilter]);

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-muted/30 rounded-lg p-4 sm:p-6 border border-border">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-1">Search & Filter Records</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Find and manage user accounts using the filters below</p>
        
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
              data-testid="input-search"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Select value={roleTypeFilter} onValueChange={setRoleTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px] text-sm" data-testid="select-role-type-filter">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="agents">Agents</SelectItem>
                <SelectItem value="team_leaders">Team Leaders</SelectItem>
                <SelectItem value="cc_managers">CC Managers</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] text-sm" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px] text-sm" data-testid="select-role-filter">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">System Admin</SelectItem>
                <SelectItem value="hr">HR Manager</SelectItem>
                <SelectItem value="contact_center_ops_manager">CC Ops Manager</SelectItem>
                <SelectItem value="contact_center_manager">CC Manager</SelectItem>
                <SelectItem value="team_leader">Team Leader</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">User Access Management</h3>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              data-testid="button-create-user"
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing {hierarchicalUsers.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, hierarchicalUsers.length)} of {hierarchicalUsers.length} records
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#1a1f5c' }}>
              <tr>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">User</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Role</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Reports To</th>
                <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No users found matching your search criteria
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(({ user, level, isExpanded, hasChildren }) => (
                  <tr key={user.id} data-testid={`row-user-${user.id}`} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center" style={{ paddingLeft: `${level * 2}rem` }}>
                        {hasChildren && (
                          <button
                            onClick={() => toggleExpand(user.id)}
                            className="mr-2 p-1 hover:bg-muted rounded transition-colors"
                            data-testid={`button-expand-${user.id}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        {!hasChildren && level > 0 && (
                          <div className="w-6 mr-2" />
                        )}
                        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground" data-testid={`text-name-${user.id}`}>
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        className={roleColorMap[user.role as keyof typeof roleColorMap] || "bg-slate-100 text-slate-700 border border-slate-200"}
                        data-testid={`badge-role-${user.id}`}
                      >
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        className={user.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}
                        data-testid={`badge-status-${user.id}`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground" data-testid={`text-reports-to-${user.id}`}>
                        {user.reportsTo ? (
                          (() => {
                            const manager = getReportsToUser(user.reportsTo);
                            return manager ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{manager.firstName} {manager.lastName}</span>
                                <span className="text-xs text-muted-foreground">({getRoleDisplayName(manager.role)})</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          data-testid={`button-edit-${user.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          disabled={deleteUserMutation.isPending}
                          data-testid={`button-delete-${user.id}`}
                        >
                          {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
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
      
      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <EditUserDialog
        user={selectedUser}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>
                {userToDelete?.firstName} {userToDelete?.lastName}
              </strong>
              's account? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
