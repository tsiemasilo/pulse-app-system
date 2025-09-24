import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertTransferSchema } from "@shared/schema";
import { ArrowRightLeft, Calendar, User, Building2 } from "lucide-react";
import { z } from "zod";
import type { Transfer, User as UserType, Department, Team } from "@shared/schema";

const transferFormSchema = insertTransferSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

// Predefined roles for transfer
const AVAILABLE_ROLES = [
  { id: 'taking_calls', name: 'Taking Calls' },
  { id: 'administrative_work', name: 'Administrative Work' },
  { id: 'quality_compliance', name: 'Quality and Compliance Tasks' },
  { id: 'technical_support', name: 'Technical and Support Roles' },
  { id: 'training_development', name: 'Training and Development' },
  { id: 'operational_support', name: 'Operational Support' },
  { id: 'litigation', name: 'Litigation' },
  { id: 'audit', name: 'Audit' },
];

// Available locations
const AVAILABLE_LOCATIONS = [
  { id: 'thandanani', name: 'Thandanani' },
  { id: '16th', name: '16th' },
];

export default function TransferManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch teams led by current user
  const { data: leaderTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams/leader", user?.id],
    enabled: !!user?.id,
  });

  // Fetch team members (agents) for teams led by current user
  const { data: teamMembers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/teams/members", leaderTeams.map(t => t.id)],
    queryFn: async () => {
      if (leaderTeams.length === 0) return [];
      
      const allMembers: UserType[] = [];
      for (const team of leaderTeams) {
        const response = await apiRequest("GET", `/api/teams/${team.id}/members`);
        const members = await response.json() as UserType[];
        allMembers.push(...members);
      }
      // Filter to only agents (exclude team leader themselves)
      return allMembers.filter(member => 
        member.role === 'agent' && member.id !== user?.id
      );
    },
    enabled: leaderTeams.length > 0,
  });

  // Fetch reporting manager information
  const { data: reportingManager = null } = useQuery<UserType | null>({
    queryKey: ["/api/users", user?.reportsTo],
    queryFn: async () => {
      if (!user?.reportsTo) return null;
      const response = await apiRequest("GET", `/api/users/${user.reportsTo}`);
      return await response.json() as UserType;
    },
    enabled: !!user?.reportsTo,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });


  const { data: transfers = [] } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  const form = useForm({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      userId: "",
      fromDepartmentId: "",
      toDepartmentId: "",
      fromRole: "",
      toRole: "",
      transferType: "temporary",
      startDate: "",
      endDate: "",
      requestedBy: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transferFormSchema>) => {
      const transferData = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      };
      const res = await apiRequest("POST", "/api/transfers", transferData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      setIsOpen(false);
      form.reset();
      toast({
        title: "Transfer Created",
        description: "Agent transfer has been submitted for approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof transferFormSchema>) => {
    transferMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
  };

  const getRoleName = (roleId: string) => {
    const role = AVAILABLE_ROLES.find(r => r.id === roleId);
    return role?.name || 'Unknown';
  };

  const getLocationName = (locationId: string) => {
    const location = AVAILABLE_LOCATIONS.find(l => l.id === locationId);
    return location?.name || 'Unknown';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center">
          <ArrowRightLeft className="h-5 w-5 mr-2" />
          Agent Transfers
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-transfer">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Agent Transfer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent to Transfer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user">
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teamMembers.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.firstName} {agent.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fromDepartmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-from-role">
                              <SelectValue placeholder="Select current role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AVAILABLE_ROLES.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toDepartmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-to-role">
                              <SelectValue placeholder="Select destination role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AVAILABLE_ROLES.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="transferType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-transfer-type">
                            <SelectValue placeholder="Select transfer type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="temporary">Temporary</SelectItem>
                          <SelectItem value="permanent">Permanent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fromRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-location">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AVAILABLE_LOCATIONS.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (for temporary transfers)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>


                <FormField
                  control={form.control}
                  name="requestedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested By</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-requested-by">
                            <SelectValue placeholder="Select requester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Show current team leader */}
                          {user && (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} (Team Leader)
                            </SelectItem>
                          )}
                          {/* Show team leader's manager if available */}
                          {reportingManager && (
                            <SelectItem key={reportingManager.id} value={reportingManager.id}>
                              {reportingManager.firstName} {reportingManager.lastName} (Manager)
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={transferMutation.isPending} data-testid="button-submit-transfer">
                    {transferMutation.isPending ? "Creating..." : "Create Transfer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Employee</TableHead>
                <TableHead>Transfer Type</TableHead>
                <TableHead>From → To Roles</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No agent transfers found. Create a new transfer to get started.
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer) => (
                  <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium" data-testid={`text-user-${transfer.id}`}>
                          {getUserName(transfer.userId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" data-testid={`badge-type-${transfer.id}`}>
                        {transfer.transferType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-sm">
                        <span>{getRoleName(transfer.fromDepartmentId || '')}</span>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <span>{getRoleName(transfer.toDepartmentId)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {transfer.fromRole ? (
                        <span>{getLocationName(transfer.fromRole)}</span>
                      ) : (
                        <span className="text-muted-foreground">No location</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-start-date-${transfer.id}`}>
                      {new Date(transfer.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-end-date-${transfer.id}`}>
                      {transfer.endDate ? new Date(transfer.endDate).toLocaleDateString() : 'Permanent'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(transfer.status)} data-testid={`badge-status-${transfer.id}`}>
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-requested-by-${transfer.id}`}>
                      {getUserName(transfer.requestedBy)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}