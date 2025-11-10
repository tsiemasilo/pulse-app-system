import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertTransferSchema, insertUserDepartmentAssignmentSchema } from "@shared/schema";
import { ArrowRightLeft, Calendar, User, ChevronLeft, ChevronRight, Eye, Search, ChevronDown, UserPlus, UserMinus, Check, X, CheckCircle, CheckCircle2, XCircle, Building2, Layers, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { motion } from "framer-motion";
import type { Transfer, User as UserType, Team, Division, Department, Section, UserDepartmentAssignment } from "@shared/schema";
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

const departmentAssignmentFormSchema = insertUserDepartmentAssignmentSchema.omit({
  assignedBy: true,
}).extend({
  userId: z.string().min(1, "Agent is required"),
  divisionId: z.string().optional(),
  departmentId: z.string().optional(),
  sectionId: z.string().optional(),
});

const AVAILABLE_LOCATIONS = [
  { id: 'thandanani', name: 'Thandanani' },
  { id: '16th', name: '16th' },
];

type UnifiedRecord = {
  id: string;
  type: 'transfer' | 'department';
  agentName: string;
  agentId: string;
  details: string;
  date: Date;
  status?: string;
  transfer?: Transfer;
  assignment?: UserDepartmentAssignment;
};

export default function TransferManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isRemoveDepartmentOpen, setIsRemoveDepartmentOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject' | 'complete' | 'delete', transferId: string } | null>(null);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [pendingTransferData, setPendingTransferData] = useState<any>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  
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

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: userDepartmentAssignments = [] } = useQuery<UserDepartmentAssignment[]>({
    queryKey: ["/api/user-department-assignments"],
  });

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

  const getDivisionName = (divisionId: string | null | undefined) => {
    if (!divisionId) return 'N/A';
    const division = divisions.find(d => d.id === divisionId);
    return division?.name || 'Unknown';
  };

  const getDepartmentName = (departmentId: string | null | undefined) => {
    if (!departmentId) return 'N/A';
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'Unknown';
  };

  const getSectionName = (sectionId: string | null | undefined) => {
    if (!sectionId) return 'N/A';
    const section = sections.find(s => s.id === sectionId);
    return section?.name || 'Unknown';
  };

  const unifiedRecords = useMemo(() => {
    const records: UnifiedRecord[] = [];

    transfers.forEach(transfer => {
      const details = `${getTeamLeaderName(transfer.fromTeamId)} → ${getTeamLeaderName(transfer.toTeamId)} | ${getLocationName(transfer.location)} | ${transfer.transferType}`;
      records.push({
        id: transfer.id,
        type: 'transfer',
        agentName: getUserName(transfer.userId),
        agentId: transfer.userId,
        details,
        date: new Date(transfer.startDate),
        status: transfer.status,
        transfer,
      });
    });

    userDepartmentAssignments.forEach(assignment => {
      const divName = getDivisionName(assignment.divisionId);
      const deptName = getDepartmentName(assignment.departmentId);
      const sectName = getSectionName(assignment.sectionId);
      const details = `${divName} > ${deptName} > ${sectName}`;
      records.push({
        id: assignment.id,
        type: 'department',
        agentName: getUserName(assignment.userId),
        agentId: assignment.userId,
        details,
        date: assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(),
        assignment,
      });
    });

    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transfers, userDepartmentAssignments, users, allTeams, divisions, departments, sections]);

  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter(record => {
      const matchesSearch = searchTerm === "" || 
        record.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.details.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "all" || record.type === typeFilter;
      
      const matchesStatus = statusFilter === "all" || 
        (record.type === 'transfer' && record.status?.toLowerCase() === statusFilter.toLowerCase());
      
      const matchesDate = !selectedDate || 
        record.date.toDateString() === selectedDate.toDateString();
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [unifiedRecords, searchTerm, typeFilter, statusFilter, selectedDate]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, selectedDate]);

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

  const addDepartmentForm = useForm({
    resolver: zodResolver(departmentAssignmentFormSchema),
    defaultValues: {
      userId: "",
      divisionId: "",
      departmentId: "",
      sectionId: "",
    },
  });

  const removeDepartmentForm = useForm({
    defaultValues: {
      userId: "",
    },
  });

  const selectedAddDivisionId = addDepartmentForm.watch("divisionId");
  const selectedAddDepartmentId = addDepartmentForm.watch("departmentId");
  const selectedRemoveUserId = removeDepartmentForm.watch("userId");

  const filteredDepartments = useMemo(() => {
    if (!selectedAddDivisionId) return [];
    return departments.filter(d => d.divisionId === selectedAddDivisionId);
  }, [selectedAddDivisionId, departments]);

  const filteredSections = useMemo(() => {
    if (!selectedAddDepartmentId) return [];
    return sections.filter(s => s.departmentId === selectedAddDepartmentId);
  }, [selectedAddDepartmentId, sections]);

  const selectedUserAssignment = useMemo(() => {
    if (!selectedRemoveUserId) return null;
    return userDepartmentAssignments.find(a => a.userId === selectedRemoveUserId);
  }, [selectedRemoveUserId, userDepartmentAssignments]);

  const agentsWithAssignments = useMemo(() => {
    const assignedUserIds = new Set(userDepartmentAssignments.map(a => a.userId));
    return teamMembers.filter(member => assignedUserIds.has(member.id));
  }, [teamMembers, userDepartmentAssignments]);

  const transferMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transferFormSchema> & { newDepartmentId?: string }) => {
      const { newDepartmentId, ...formData } = data;
      const transferData = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        newDepartmentId,
      };
      const res = await apiRequest("POST", "/api/transfers", transferData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/leader"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/members"] });
      setIsOpen(false);
      setShowDepartmentDialog(false);
      setPendingTransferData(null);
      setSelectedDepartmentId("");
      form.reset();
      toast({
        title: "Transfer Created",
        description: "Agent has been successfully transferred to the new team leader.",
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

  const addDepartmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof departmentAssignmentFormSchema>) => {
      const assignmentData = {
        ...data,
        assignedBy: user?.id,
      };
      const res = await apiRequest("POST", "/api/user-department-assignments", assignmentData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      setIsAddDepartmentOpen(false);
      addDepartmentForm.reset();
      toast({
        title: "Department Assigned",
        description: "Agent has been successfully assigned to department.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeDepartmentMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/user-department-assignments/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      setIsRemoveDepartmentOpen(false);
      removeDepartmentForm.reset();
      toast({
        title: "Department Removed",
        description: "Agent's department assignment has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await apiRequest("PATCH", `/api/transfers/${transferId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      setConfirmAction(null);
      toast({
        title: "Transfer Approved",
        description: "The transfer has been successfully approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await apiRequest("PATCH", `/api/transfers/${transferId}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      setConfirmAction(null);
      toast({
        title: "Transfer Rejected",
        description: "The transfer has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await apiRequest("POST", `/api/transfers/${transferId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      setConfirmAction(null);
      toast({
        title: "Transfer Completed",
        description: "The transfer has been marked as completed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Completion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await apiRequest("DELETE", `/api/transfers/${transferId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/leader"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/members"] });
      setConfirmAction(null);
      toast({
        title: "Transfer Deleted",
        description: "The transfer record has been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
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
    
    // Get the agent's current department
    const agent = users.find(u => u.id === data.userId);
    const currentDepartmentId = agent?.departmentId || "";
    setSelectedDepartmentId(currentDepartmentId);
    
    // Store pending transfer data and show department confirmation dialog
    setPendingTransferData(transferData);
    setShowDepartmentDialog(true);
  };
  
  const handleDepartmentConfirmation = (keepDepartment: boolean) => {
    if (!pendingTransferData) return;
    
    if (keepDepartment) {
      // Transfer with the same department
      transferMutation.mutate(pendingTransferData);
    } else {
      // User needs to select a new department - show the department selection in the dialog
      // The department selection will be handled in the dialog itself
    }
  };
  
  const handleTransferWithNewDepartment = () => {
    if (!pendingTransferData || !selectedDepartmentId) {
      toast({
        title: "Error",
        description: "Please select a department",
        variant: "destructive",
      });
      return;
    }
    
    transferMutation.mutate({
      ...pendingTransferData,
      newDepartmentId: selectedDepartmentId,
    });
  };

  const onAddDepartmentSubmit = (data: z.infer<typeof departmentAssignmentFormSchema>) => {
    addDepartmentMutation.mutate(data);
  };

  const onRemoveDepartmentSubmit = (data: { userId: string }) => {
    removeDepartmentMutation.mutate(data.userId);
  };

  const canPerformAction = (transfer: Transfer, action: 'approve' | 'reject' | 'complete') => {
    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'contact_center_manager';
    
    if (action === 'approve' || action === 'reject') {
      return (isAdmin || isManager) && transfer.status === 'pending';
    }
    
    if (action === 'complete') {
      return isAdmin && transfer.status === 'approved';
    }
    
    return false;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    
    switch (confirmAction.type) {
      case 'approve':
        approveMutation.mutate(confirmAction.transferId);
        break;
      case 'reject':
        rejectMutation.mutate(confirmAction.transferId);
        break;
      case 'complete':
        completeMutation.mutate(confirmAction.transferId);
        break;
      case 'delete':
        deleteMutation.mutate(confirmAction.transferId);
        break;
    }
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center">
          <ArrowRightLeft className="h-5 w-5 mr-2" />
          Transfer Management
        </CardTitle>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="button-transfer-actions">
                Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsOpen(true)} data-testid="menu-item-new-transfer">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                New Transfer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddDepartmentOpen(true)} data-testid="menu-item-add-department">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Department
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRemoveDepartmentOpen(true)} data-testid="menu-item-remove-department">
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Department
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative lg:flex-[2] lg:min-w-[400px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by agent name or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full lg:w-[160px]" data-testid="select-type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="transfer">Team Transfers</SelectItem>
              <SelectItem value="department">Department Assignments</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[160px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full lg:w-[180px] justify-start text-left font-normal" data-testid="button-date-filter">
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Filter by Date</span>}
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
                    Clear Date Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
              Showing {filteredRecords.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#1a1f5c' }}>
                <tr>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Type</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Agent</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Details</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Date</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status/Info</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      {searchTerm || typeFilter !== "all" || statusFilter !== "all" || selectedDate
                        ? "No records match your filters."
                        : "No transfers or assignments found. Create a new transfer or assignment to get started."}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={`${record.type}-${record.id}`} className="hover:bg-muted/20 transition-colors" data-testid={`row-${record.type}-${record.id}`}>
                      <td className="px-6 py-4">
                        <Badge variant="outline" data-testid={`badge-type-${record.id}`}>
                          {record.type === 'transfer' ? (
                            <><ArrowRightLeft className="h-3 w-3 mr-1 inline" />Transfer</>
                          ) : (
                            <><Building2 className="h-3 w-3 mr-1 inline" />Department</>
                          )}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-agent-${record.id}`}>
                            {record.agentName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4" data-testid={`text-details-${record.id}`}>
                        {record.type === 'transfer' && record.transfer ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground font-medium">From:</span>
                              <span className="font-medium">{getTeamLeaderName(record.transfer.fromTeamId)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground font-medium">To:</span>
                              <span className="font-medium">{getTeamLeaderName(record.transfer.toTeamId)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {getLocationName(record.transfer.location)}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{record.transfer.transferType}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-xs text-muted-foreground">Division / Department / Section</div>
                            <div className="text-sm font-medium">
                              {getDivisionName(record.assignment?.divisionId)} 
                              <span className="text-muted-foreground mx-1">›</span>
                              {getDepartmentName(record.assignment?.departmentId)}
                              <span className="text-muted-foreground mx-1">›</span>
                              {getSectionName(record.assignment?.sectionId)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm" data-testid={`text-date-${record.id}`}>
                        {record.date.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {record.type === 'transfer' && record.status ? (
                          <Badge 
                            variant="outline"
                            data-testid={`badge-status-${record.id}`}
                          >
                            {record.status}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground" data-testid={`text-assigned-by-${record.id}`}>
                            {record.assignment?.assignedBy ? `By ${getUserName(record.assignment.assignedBy)}` : 'Active'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record.type === 'transfer' && record.transfer && (
                          <div className="flex items-center gap-2">
                            {canPerformAction(record.transfer, 'approve') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction({ type: 'approve', transferId: record.id })}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                data-testid={`button-approve-${record.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {canPerformAction(record.transfer, 'reject') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction({ type: 'reject', transferId: record.id })}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                data-testid={`button-reject-${record.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {canPerformAction(record.transfer, 'complete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction({ type: 'complete', transferId: record.id })}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                data-testid={`button-complete-${record.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'delete', transferId: record.id })}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              data-testid={`button-delete-${record.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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

    <Dialog open={auditLogDialogOpen} onOpenChange={setAuditLogDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-transfers-audit-log">
        <DialogHeader>
          <DialogTitle>Transfer Audit Log</DialogTitle>
          <DialogDescription>
            View the complete history and audit trail for this transfer
          </DialogDescription>
        </DialogHeader>
        {selectedTransferId && (
          <TransfersAuditLog transferId={selectedTransferId} />
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Agent Transfer</DialogTitle>
          <DialogDescription>
            Transfer an agent from your team to another team leader
          </DialogDescription>
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
                      <SelectTrigger data-testid="select-transfer-user">
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
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} data-testid="button-cancel-transfer">
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

    <Dialog open={isAddDepartmentOpen} onOpenChange={setIsAddDepartmentOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Department Assignment</DialogTitle>
          <DialogDescription>
            Assign an agent to a division, department, and section
          </DialogDescription>
        </DialogHeader>
        <Form {...addDepartmentForm}>
          <form onSubmit={addDepartmentForm.handleSubmit(onAddDepartmentSubmit)} className="space-y-4">
            <FormField
              control={addDepartmentForm.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Agent</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-add-dept-agent">
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

            <FormField
              control={addDepartmentForm.control}
              name="divisionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-division">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {divisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={addDepartmentForm.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedAddDivisionId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-department">
                        <SelectValue placeholder={selectedAddDivisionId ? "Select department" : "Select division first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={addDepartmentForm.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedAddDepartmentId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-section">
                        <SelectValue placeholder={selectedAddDepartmentId ? "Select section" : "Select department first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDepartmentOpen(false)} data-testid="button-cancel-add-dept">
                Cancel
              </Button>
              <Button type="submit" disabled={addDepartmentMutation.isPending} data-testid="button-submit-add-dept">
                {addDepartmentMutation.isPending ? "Assigning..." : "Assign Department"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog open={isRemoveDepartmentOpen} onOpenChange={setIsRemoveDepartmentOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Remove Department Assignment</DialogTitle>
          <DialogDescription>
            Remove an agent's department assignment
          </DialogDescription>
        </DialogHeader>
        <Form {...removeDepartmentForm}>
          <form onSubmit={removeDepartmentForm.handleSubmit(onRemoveDepartmentSubmit)} className="space-y-4">
            <FormField
              control={removeDepartmentForm.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Agent</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-remove-dept-agent">
                        <SelectValue placeholder="Select agent with department assignment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agentsWithAssignments.map((agent) => (
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

            {selectedUserAssignment && (
              <div className="p-4 bg-muted rounded-lg space-y-2" data-testid="current-assignment-details">
                <h4 className="font-semibold">Current Assignment:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Division:</span>{' '}
                    <span data-testid="text-current-division">
                      {divisions.find(d => d.id === selectedUserAssignment.divisionId)?.name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Department:</span>{' '}
                    <span data-testid="text-current-department">
                      {departments.find(d => d.id === selectedUserAssignment.departmentId)?.name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Section:</span>{' '}
                    <span data-testid="text-current-section">
                      {sections.find(s => s.id === selectedUserAssignment.sectionId)?.name || 'N/A'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-destructive font-medium mt-4">
                  Are you sure you want to remove this department assignment?
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsRemoveDepartmentOpen(false)} data-testid="button-cancel-remove-dept">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={removeDepartmentMutation.isPending || !selectedRemoveUserId} 
                variant="destructive"
                data-testid="button-submit-remove-dept"
              >
                {removeDepartmentMutation.isPending ? "Removing..." : "Remove Assignment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog open={showDepartmentDialog} onOpenChange={(open) => {
      if (!open) {
        setShowDepartmentDialog(false);
        setPendingTransferData(null);
        setSelectedDepartmentId("");
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Department Transfer Confirmation</DialogTitle>
          <DialogDescription>
            Will the agent be transferring with the same department or do you need to update their department?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {pendingTransferData && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-medium">Agent:</span>{' '}
                {getUserName(pendingTransferData.userId)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Current Department:</span>{' '}
                {getDepartmentName(users.find(u => u.id === pendingTransferData.userId)?.departmentId)}
              </p>
              <p className="text-sm">
                <span className="font-medium">New Team Leader:</span>{' '}
                {getTeamLeaderName(pendingTransferData.toTeamId)}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button
              onClick={() => handleDepartmentConfirmation(true)}
              className="w-full"
              data-testid="button-keep-department"
            >
              Keep Same Department
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setShowDepartmentDialog(false);
              setPendingTransferData(null);
              setSelectedDepartmentId("");
            }}
            data-testid="button-cancel-department-dialog"
          >
            Cancel Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmAction?.type === 'approve' && 'Approve Transfer?'}
            {confirmAction?.type === 'reject' && 'Reject Transfer?'}
            {confirmAction?.type === 'complete' && 'Complete Transfer?'}
            {confirmAction?.type === 'delete' && 'Delete Transfer?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmAction?.type === 'approve' && 
              'Are you sure you want to approve this transfer? This will allow the agent to move to the new team.'}
            {confirmAction?.type === 'reject' && 
              'Are you sure you want to reject this transfer? This action will deny the transfer request.'}
            {confirmAction?.type === 'complete' && 
              'Are you sure you want to mark this transfer as completed? This indicates the agent has successfully moved to the new team.'}
            {confirmAction?.type === 'delete' && 
              'Are you sure you want to permanently delete this transfer record? This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmAction}
            data-testid="button-confirm-action"
            className={
              confirmAction?.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
              confirmAction?.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
              confirmAction?.type === 'complete' ? 'bg-blue-600 hover:bg-blue-700' :
              confirmAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
              ''
            }
          >
            {confirmAction?.type === 'approve' && 'Approve'}
            {confirmAction?.type === 'reject' && 'Reject'}
            {confirmAction?.type === 'complete' && 'Complete'}
            {confirmAction?.type === 'delete' && 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
