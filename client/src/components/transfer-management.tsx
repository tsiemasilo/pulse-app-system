import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertTransferSchema } from "@shared/schema";
import { ArrowRightLeft, Calendar, User, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { z } from "zod";
import type { Transfer, User as UserType, Team } from "@shared/schema";
import TransfersAuditLog from "./transfers-audit-log";

const transferFormSchema = insertTransferSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
}).omit({
  fromDepartmentId: true,
  toDepartmentId: true,
  fromRole: true,
  toRole: true,
  approvedBy: true,
  status: true,
});

const AVAILABLE_LOCATIONS = [
  { id: 'thandanani', name: 'Thandanani' },
  { id: '16th', name: '16th' },
];

export default function TransferManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: leaderTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams/leader", user?.id],
    enabled: !!user?.id,
  });

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
      return allMembers.filter(member => 
        member.role === 'agent' && member.id !== user?.id
      );
    },
    enabled: leaderTeams.length > 0,
  });

  const { data: allTeamLeaders = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users/team-leaders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      const users = await response.json() as UserType[];
      return users.filter(u => u.role === 'team_leader' && u.id !== user?.id && u.isActive);
    },
  });

  const getTeamIdForLeader = (leaderId: string): string | undefined => {
    const team = allTeams.find(t => t.leaderId === leaderId);
    return team?.id;
  };

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: allTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: transfers = [] } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  const totalPages = Math.ceil(transfers.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedTransfers = transfers.slice(startIndex, endIndex);

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

  const form = useForm({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      userId: "",
      fromTeamId: "",
      toTeamId: "",
      location: "",
      transferType: "temporary",
      startDate: "",
      endDate: "",
      requestedBy: user?.id || "",
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
    const toTeamId = data.toTeamId ? getTeamIdForLeader(data.toTeamId) : undefined;
    
    if (!toTeamId) {
      toast({
        title: "Error",
        description: "Selected team leader does not have a team. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }
    
    const transferData = {
      ...data,
      toTeamId,
    };
    
    transferMutation.mutate(transferData);
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
  };

  const getTeamLeaderName = (teamId: string | null | undefined) => {
    if (!teamId) return 'Unknown';
    const team = allTeams.find(t => t.id === teamId);
    if (!team || !team.leaderId) return 'Unknown';
    return getUserName(team.leaderId);
  };

  const getLocationName = (locationId: string | null | undefined) => {
    if (!locationId) return 'Not specified';
    const location = AVAILABLE_LOCATIONS.find(l => l.id === locationId);
    return location?.name || locationId;
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                    name="fromTeamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Team Leader</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-from-team">
                              <SelectValue placeholder="Select current team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leaderTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name} ({user?.firstName} {user?.lastName})
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
                    name="toTeamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Team Leader</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-to-team">
                              <SelectValue placeholder="Select destination team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allTeamLeaders.map((teamLeader) => (
                              <SelectItem key={teamLeader.id} value={teamLeader.id}>
                                {teamLeader.firstName} {teamLeader.lastName}
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
              Showing {transfers.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, transfers.length)} of {transfers.length} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#1a1f5c' }}>
                <tr>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Agent</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Type</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">From Team</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">To Team</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Location</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Start Date</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">End Date</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Requested By</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground">
                      No agent transfers found. Create a new transfer to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedTransfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-transfer-${transfer.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-user-${transfer.id}`}>
                            {getUserName(transfer.userId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" data-testid={`badge-type-${transfer.id}`}>
                          {transfer.transferType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getTeamLeaderName(transfer.fromTeamId)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getTeamLeaderName(transfer.toTeamId)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getLocationName(transfer.location)}
                      </td>
                      <td className="px-6 py-4 text-sm" data-testid={`text-start-date-${transfer.id}`}>
                        {new Date(transfer.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm" data-testid={`text-end-date-${transfer.id}`}>
                        {transfer.endDate ? new Date(transfer.endDate).toLocaleDateString() : 'Permanent'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" data-testid={`badge-status-${transfer.id}`}>
                          {transfer.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm" data-testid={`text-requested-by-${transfer.id}`}>
                        {getUserName(transfer.requestedBy)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTransferId(transfer.id);
                            setAuditLogDialogOpen(true);
                          }}
                          data-testid={`button-audit-log-${transfer.id}`}
                          title="View Audit Log"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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

      <Dialog open={auditLogDialogOpen} onOpenChange={setAuditLogDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-transfers-audit-log">
          <DialogHeader>
            <DialogTitle>Transfer Audit Log</DialogTitle>
          </DialogHeader>
          {selectedTransferId && (
            <TransfersAuditLog transferId={selectedTransferId} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
