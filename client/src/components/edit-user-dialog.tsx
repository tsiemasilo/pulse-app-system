import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User, Team, UserRole, Division, Department, Section, UserDepartmentAssignment } from "@shared/schema";
import { canRoleLogin } from "@shared/schema";

const editUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(['admin', 'hr', 'contact_center_ops_manager', 'contact_center_manager', 'team_leader', 'agent']),
  isActive: z.boolean(),
  password: z.string().optional().or(z.literal("")),
  reportsTo: z.string().optional().or(z.literal("")),
  divisionId: z.string().optional(),
  departmentId: z.string().optional(),
  sectionId: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>("none");
  const [selectedReportsTo, setSelectedReportsTo] = useState<string>("none");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch divisions, departments, and sections
  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
    enabled: open,
  });

  const { data: allDepartments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: open,
  });

  const { data: allSections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
    enabled: open,
  });

  // Fetch user's current department assignment
  const { data: userDepartmentAssignment } = useQuery<UserDepartmentAssignment>({
    queryKey: ["/api/user-department-assignments", user?.id],
    enabled: open && !!user?.id,
  });

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "agent",
      isActive: true,
      password: "",
      reportsTo: "",
      divisionId: "none",
      departmentId: "none",
      sectionId: "none",
    },
  });

  const selectedDivisionId = form.watch("divisionId");
  const selectedDepartmentId = form.watch("departmentId");

  const filteredDepartments = allDepartments.filter(
    dept => !selectedDivisionId || selectedDivisionId === 'none' || dept.divisionId === selectedDivisionId
  );

  const filteredSections = allSections.filter(
    section => !selectedDepartmentId || selectedDepartmentId === 'none' || section.departmentId === selectedDepartmentId
  );

  // Fetch all users for team leader lookup
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  // Fetch all user department assignments for team leader lookup
  const { data: allUserDepartmentAssignments = [] } = useQuery<UserDepartmentAssignment[]>({
    queryKey: ["/api/user-department-assignments"],
    enabled: open,
  });

  const getTeamLeaderForSection = (sectionId: string) => {
    const assignmentsForSection = allUserDepartmentAssignments.filter(a => a.sectionId === sectionId);
    for (const assignment of assignmentsForSection) {
      const assignedUser = allUsers.find(u => u.id === assignment.userId);
      if (assignedUser && assignedUser.role === 'team_leader') {
        return assignedUser;
      }
    }
    return null;
  };

  const getUsersAssignedToDivision = (divisionId: string) => {
    const assignments = allUserDepartmentAssignments.filter(a => a.divisionId === divisionId);
    return assignments
      .map(a => allUsers.find(u => u.id === a.userId))
      .filter((u): u is User => u !== undefined && u.role === 'team_leader');
  };

  const getUsersAssignedToDepartment = (departmentId: string) => {
    const assignments = allUserDepartmentAssignments.filter(a => a.departmentId === departmentId);
    return assignments
      .map(a => allUsers.find(u => u.id === a.userId))
      .filter((u): u is User => u !== undefined && u.role === 'team_leader');
  };

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role: user.role as any,
        isActive: user.isActive,
        password: "",
        reportsTo: user.reportsTo || "",
        divisionId: userDepartmentAssignment?.divisionId || "none",
        departmentId: userDepartmentAssignment?.departmentId || "none",
        sectionId: userDepartmentAssignment?.sectionId || "none",
      });
      setSelectedReportsTo(user.reportsTo || "none");
    }
  }, [user, form, userDepartmentAssignment]);

  // Get team leaders for reassignment
  const { data: teamLeaders = [] } = useQuery<User[]>({
    queryKey: ["/api/team-leaders"],
    enabled: open,
  });

  // Get managers for team leader reporting (contact center managers and ops managers)
  const { data: managers = [] } = useQuery<User[]>({
    queryKey: ["/api/managers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      const users = await response.json() as User[];
      return users.filter(u => 
        u.role === 'contact_center_ops_manager' || 
        u.role === 'contact_center_manager'
      );
    },
    enabled: open,
  });

  // Get current team assignment for agents only
  const { data: userTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/users", user?.id, "teams"],
    enabled: open && !!user?.id && user?.role === 'agent',
  });

  useEffect(() => {
    if (userTeams.length > 0) {
      setSelectedTeamLeader(userTeams[0].leaderId || "none");
    } else {
      setSelectedTeamLeader("none");
    }
  }, [userTeams]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: EditUserFormData) => {
      if (!user) throw new Error("No user selected");
      
      // Update user details
      const updatePayload: any = {
        username: data.username,
        email: data.email || null,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
        reportsTo: data.role === 'team_leader' && selectedReportsTo !== 'none' ? selectedReportsTo : null,
      };
      
      // Only include password if it's provided and not empty
      if (data.password && data.password.trim() !== "") {
        updatePayload.password = data.password;
      }
      
      const updatedUser = await apiRequest("PATCH", `/api/users/${user.id}`, updatePayload) as any;

      // Handle department assignment changes
      const validDivisionId = data.divisionId && data.divisionId !== 'none' ? data.divisionId : null;
      const validDepartmentId = data.departmentId && data.departmentId !== 'none' ? data.departmentId : null;
      const validSectionId = data.sectionId && data.sectionId !== 'none' ? data.sectionId : null;

      // If user had a department assignment before
      if (userDepartmentAssignment) {
        // If all department fields are now "none", delete the assignment
        if (!validDivisionId && !validDepartmentId && !validSectionId) {
          await apiRequest("DELETE", `/api/user-department-assignments/${user.id}`);
        } else {
          // Update the existing assignment
          await apiRequest("DELETE", `/api/user-department-assignments/${user.id}`);
          await apiRequest("POST", "/api/user-department-assignments", {
            userId: user.id,
            divisionId: validDivisionId,
            departmentId: validDepartmentId,
            sectionId: validSectionId,
            assignedBy: user.id,
          });
        }
      } else {
        // Create new assignment if any department field is selected
        if (validDivisionId || validDepartmentId || validSectionId) {
          await apiRequest("POST", "/api/user-department-assignments", {
            userId: user.id,
            divisionId: validDivisionId,
            departmentId: validDepartmentId,
            sectionId: validSectionId,
            assignedBy: user.id,
          });
        }
      }

      // Only allow team assignment for agents - remove team assignment if role changes from agent
      if (user.role === 'agent' && data.role !== 'agent') {
        // Remove from team when role changes from agent to something else
        await apiRequest("POST", `/api/users/${user.id}/reassign-team-leader`, {
          teamLeaderId: null,
        });
      } else if (data.role === 'agent' && selectedTeamLeader !== (userTeams[0]?.leaderId || "none")) {
        // Only assign team if user is/becomes an agent
        if (selectedTeamLeader && selectedTeamLeader !== "none") {
          await apiRequest("POST", `/api/users/${user.id}/reassign-team-leader`, {
            teamLeaderId: selectedTeamLeader,
          });
        }
      }

      return updatedUser;
    },
    onSuccess: async (updatedUser) => {
      // Invalidate all user-related queries to ensure UI updates everywhere
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "teams"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments", user?.id] });
      
      // If role changed to/from team_leader, invalidate team leaders cache
      if (updatedUser.role === 'team_leader' || user?.role === 'team_leader') {
        await queryClient.invalidateQueries({ queryKey: ["/api/team-leaders"] });
      }
      
      // Force refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["/api/users"] });
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditUserFormData) => {
    updateUserMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-user">
        <DialogHeader>
          <DialogTitle data-testid="title-edit-user">Edit User: {user.firstName} {user.lastName}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show password field for roles that can log in */}
            {canRoleLogin(form.watch('role') as UserRole) && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (leave blank to keep current)</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Enter new password" data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Division Selection */}
            <FormField
              control={form.control}
              name="divisionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("departmentId", "none");
                      form.setValue("sectionId", "none");
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-division">
                        <SelectValue placeholder="Select a division" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {divisions.map((division) => {
                        const assignedUsers = getUsersAssignedToDivision(division.id);
                        const userNames = assignedUsers.slice(0, 3).map(u => `${u.firstName || ''} ${u.lastName || ''}`.trim()).join(', ');
                        return (
                          <SelectItem key={division.id} value={division.id}>
                            <div className="flex flex-col">
                              <span>{division.name}</span>
                              {assignedUsers.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {userNames}{assignedUsers.length > 3 ? ` +${assignedUsers.length - 3} more` : ''}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department Selection */}
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("sectionId", "none");
                    }} 
                    value={field.value}
                    disabled={(!selectedDivisionId || selectedDivisionId === 'none') && filteredDepartments.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-department">
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {filteredDepartments.map((department) => {
                        const assignedUsers = getUsersAssignedToDepartment(department.id);
                        const userNames = assignedUsers.slice(0, 3).map(u => `${u.firstName || ''} ${u.lastName || ''}`.trim()).join(', ');
                        return (
                          <SelectItem key={department.id} value={department.id}>
                            <div className="flex flex-col">
                              <span>{department.name}</span>
                              {assignedUsers.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {userNames}{assignedUsers.length > 3 ? ` +${assignedUsers.length - 3} more` : ''}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section Selection */}
            <FormField
              control={form.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section (Optional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={(!selectedDepartmentId || selectedDepartmentId === 'none') && filteredSections.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-section">
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {filteredSections.map((section) => {
                        const teamLeader = getTeamLeaderForSection(section.id);
                        return (
                          <SelectItem key={section.id} value={section.id}>
                            <div className="flex flex-col">
                              <span>{section.name}</span>
                              {teamLeader ? (
                                <span className="text-xs text-muted-foreground">
                                  {teamLeader.firstName} {teamLeader.lastName}
                                </span>
                              ) : (
                                <span className="text-xs text-destructive">No team leader assigned</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      data-testid="select-role"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="contact_center_ops_manager">CC Ops Manager</SelectItem>
                        <SelectItem value="contact_center_manager">CC Manager</SelectItem>
                        <SelectItem value="team_leader">Team Leader</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "true")} 
                      defaultValue={field.value.toString()}
                      data-testid="select-status"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Team Leader Assignment for Agents Only */}
            {form.watch("role") === "agent" && (
              <div>
                <Label htmlFor="teamLeader">Assign to Team Leader</Label>
                <Select 
                  value={selectedTeamLeader} 
                  onValueChange={setSelectedTeamLeader}
                  data-testid="select-team-leader"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team leader" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team Leader</SelectItem>
                    {teamLeaders.map((leader) => (
                      <SelectItem key={leader.id} value={leader.id}>
                        {leader.firstName} {leader.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground mt-1">
                  Current team leaders available: {teamLeaders.length}
                </div>
              </div>
            )}

            {/* Manager Assignment for Team Leaders Only */}
            {form.watch("role") === "team_leader" && (
              <div>
                <Label htmlFor="reportsTo">Team Leader Reports To</Label>
                <Select 
                  value={selectedReportsTo} 
                  onValueChange={setSelectedReportsTo}
                  data-testid="select-reports-to"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        <span className="text-sm">
                          {manager.firstName} {manager.lastName} ({manager.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground mt-1">
                  Available managers: {managers.length}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
                data-testid="button-save"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}