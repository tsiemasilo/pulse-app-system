import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertUserSchema, canRoleLogin } from "@shared/schema";
import type { User, UserRole } from "@shared/schema";
import { z } from "zod";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamLeaders = [] } = useQuery<User[]>({
    queryKey: ["/api/team-leaders"],
  });

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema
        .omit({ departmentId: true })
        .extend({ 
          teamLeaderId: z.string().optional(),
          password: z.string().optional()
        })
        .refine((data) => {
          if (canRoleLogin(data.role as UserRole) && !data.password) {
            return false;
          }
          return true;
        }, {
          message: "Password is required for roles with login access",
          path: ["password"]
        })
    ),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "agent" as const,
      isActive: true,
      teamLeaderId: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const { teamLeaderId, ...userDataForAPI } = userData;
      const response = await apiRequest("POST", "/api/users", userDataForAPI);
      const user = await response.json();
      
      // If agent role and team leader selected, use the reassign-team-leader endpoint
      // This endpoint automatically creates a team if the team leader doesn't have one
      if (userData.role === 'agent' && teamLeaderId && teamLeaderId !== 'none') {
        await apiRequest("POST", `/api/users/${user.id}/reassign-team-leader`, {
          teamLeaderId: teamLeaderId,
        });
      }
      
      return user;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      // If a team leader was created, also invalidate team leaders cache
      if (newUser.role === 'team_leader') {
        queryClient.invalidateQueries({ queryKey: ["/api/team-leaders"] });
      }
      toast({
        title: "Success",
        description: "User created successfully",
      });
      form.reset();
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
        description: "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createUserMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            {/* Only show password field for roles that can log in */}
            {canRoleLogin(form.watch('role') as UserRole) && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-firstname" />
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
                    <Input {...field} data-testid="input-lastname" />
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
                    <Input type="email" {...field} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">System Admin</SelectItem>
                      <SelectItem value="hr">HR Manager</SelectItem>
                      <SelectItem value="contact_center_ops_manager">Contact Center Ops Manager</SelectItem>
                      <SelectItem value="contact_center_manager">Contact Center Manager</SelectItem>
                      <SelectItem value="team_leader">Team Leader</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Leader Selection - Only show for agents */}
            {form.watch('role') === 'agent' && (
              <FormField
                control={form.control}
                name="teamLeaderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Team Leader (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team-leader">
                          <SelectValue placeholder="Select a team leader" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Team Leader</SelectItem>
                        {teamLeaders.map((leader) => (
                          <SelectItem key={leader.id} value={leader.id}>
                            {leader.firstName} {leader.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                disabled={createUserMutation.isPending}
                data-testid="button-submit"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
