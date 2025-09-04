import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import type { User } from "@shared/schema";

export default function UserManagementTable() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        const response = await apiRequest(`/api/users/${userId}`, {
          method: "DELETE",
        });
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
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const roleColorMap = {
    admin: "bg-purple-100 text-purple-800",
    hr: "bg-blue-100 text-blue-800",
    contact_center_ops_manager: "bg-green-100 text-green-800",
    contact_center_manager: "bg-green-100 text-green-800",
    team_leader: "bg-yellow-100 text-yellow-800",
    agent: "bg-gray-100 text-gray-800",
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">User Access Management</h2>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="button-create-user"
          >
            <span className="mr-2">+</span>Create User
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Team</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} data-testid={`row-user-${user.id}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
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
                    className={roleColorMap[user.role as keyof typeof roleColorMap] || "bg-gray-100 text-gray-800"}
                    data-testid={`badge-role-${user.id}`}
                  >
                    {user.role}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge 
                    className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    data-testid={`badge-status-${user.id}`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-muted-foreground" data-testid={`text-team-${user.id}`}>
                    {user.role === 'agent' ? 'Agent' : user.role === 'team_leader' ? 'Team Leader' : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-800"
                      data-testid={`button-edit-${user.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-800"
                      disabled={deleteUserMutation.isPending}
                      data-testid={`button-delete-${user.id}`}
                    >
                      {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
}
