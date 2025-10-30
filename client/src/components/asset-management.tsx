import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Laptop, Headphones, Usb, Check, X, Eye, AlertTriangle, RotateCcw, Mouse, Cable, ChevronLeft, ChevronRight, Search, Calendar } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import type { User, AssetDailyState } from "@shared/schema";
import AssetAuditLog from "./asset-audit-log";

interface AssetManagementProps {
  userId?: string;
  showActions?: boolean;
}

// Asset type configuration
const ASSET_TYPES = [
  { id: 'laptop', name: 'Laptop', icon: Laptop },
  { id: 'headsets', name: 'Headsets', icon: Headphones },
  { id: 'dongle', name: 'Dongle', icon: Usb },
  { id: 'mouse', name: 'Mouse', icon: Mouse },
  { id: 'lan_adapter', name: 'LAN Adapter', icon: Cable },
] as const;

type AssetType = typeof ASSET_TYPES[number]['id'];

// State configuration with colors and labels
const STATE_CONFIG = {
  ready_for_collection: { 
    label: 'Ready for Collection', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    description: 'Asset is available for collection'
  },
  collected: { 
    label: 'Collected from Team Leader', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    description: 'Asset has been collected'
  },
  not_collected: { 
    label: 'Not Collected from Team Leader', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    description: 'Asset was not collected'
  },
  returned: { 
    label: 'Returned to Team Leader', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    description: 'Asset has been returned'
  },
  not_returned: { 
    label: 'Not Returned', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    description: 'Asset was not returned'
  },
  lost: { 
    label: 'Lost', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    description: 'Asset is lost'
  },
} as const;

export default function AssetManagement({ userId, showActions = false }: AssetManagementProps) {
  const [activeTab, setActiveTab] = useState('book_in');
  const [bookInPage, setBookInPage] = useState(1);
  const [bookOutPage, setBookOutPage] = useState(1);
  const [lostAssetsPage, setLostAssetsPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const recordsPerPage = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [showBookInConfirm, setShowBookInConfirm] = useState(false);
  const [showBookOutConfirm, setShowBookOutConfirm] = useState(false);
  const [showBookOutStatusDialog, setShowBookOutStatusDialog] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showViewReasonDialog, setShowViewReasonDialog] = useState(false);
  const [showMarkFoundDialog, setShowMarkFoundDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Pending action states
  const [pendingBookIn, setPendingBookIn] = useState<{
    userId: string;
    assetType: AssetType;
    status: 'collected' | 'not_collected';
    agentName: string;
  } | null>(null);

  const [pendingBookOut, setPendingBookOut] = useState<{
    userId: string;
    assetType: AssetType;
    status: 'returned' | 'not_returned' | 'lost';
    agentName: string;
  } | null>(null);

  const [pendingMarkFound, setPendingMarkFound] = useState<{
    userId: string;
    assetType: AssetType;
    agentName: string;
    date: string;
  } | null>(null);

  const [reasonInput, setReasonInput] = useState('');
  const [viewReason, setViewReason] = useState('');
  const [selectedResetAgent, setSelectedResetAgent] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');

  // Helper function to get current date (timezone-safe)
  const getCurrentDate = () => {
    return format(new Date(), 'yyyy-MM-dd'); // YYYY-MM-DD format
  };

  // Check if we're viewing today's date
  const isViewingToday = () => {
    if (!selectedDate) return true; // No date selected means viewing today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() === today.getTime();
  };

  // Fetch current user for role checking
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // For user-specific view (agents seeing their own assets)
  if (userId) {
    const { data: userAssets = [], isLoading: assetsLoading } = useQuery<any[]>({
      queryKey: [`/api/assets/user/${userId}`],
    });

    const { data: userDailyStates = [], isLoading: statesLoading } = useQuery<AssetDailyState[]>({
      queryKey: [`/api/assets/daily-states/user/${userId}/date/${getCurrentDate()}`],
    });

    // Show loading state while data is being fetched
    if (assetsLoading || statesLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>My Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">Loading assets...</p>
          </CardContent>
        </Card>
      );
    }

    // Transform daily states for easier lookup
    const statesByAssetType = userDailyStates.reduce((acc, state) => {
      acc[state.assetType] = state;
      return acc;
    }, {} as Record<string, AssetDailyState>);

    if (userAssets.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>My Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">No assets assigned</p>
          </CardContent>
        </Card>
      );
    }

    // Helper function to get asset status from daily states
    const getAssetStatus = (assetName: string) => {
      // Map asset names to asset types
      const assetTypeMapping: Record<string, AssetType> = {
        'laptop': 'laptop',
        'headset': 'headsets',
        'headsets': 'headsets',
        'dongle': 'dongle',
        'usb dongle': 'dongle',
        'mouse': 'mouse',
        'lan adapter': 'lan_adapter',
        'lan': 'lan_adapter'
      };
      
      const assetType = assetTypeMapping[assetName.toLowerCase()];
      const dailyState = statesByAssetType[assetType];
      
      if (dailyState) {
        const config = STATE_CONFIG[dailyState.currentState as keyof typeof STATE_CONFIG];
        return {
          status: config?.label || dailyState.currentState,
          color: config?.color || 'bg-gray-100 text-gray-800'
        };
      }
      
      return {
        status: 'Ready for Collection',
        color: 'bg-blue-100 text-blue-800'
      };
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>My Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userAssets.map((asset) => {
              const statusInfo = getAssetStatus(asset.name);
              
              return (
                <div 
                  key={asset.id} 
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  data-testid={`asset-card-${asset.id}`}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground" data-testid={`text-asset-name-${asset.id}`}>
                      {asset.name}
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-asset-id-${asset.id}`}>
                      Asset ID: {asset.id.slice(-8)}
                    </div>
                  </div>
                  <Badge className={statusInfo.color} data-testid={`badge-asset-status-${asset.id}`}>
                    {statusInfo.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // For team leaders - fetch their specific team members
  const { data: leaderTeams = [] } = useQuery<any[]>({
    queryKey: [`/api/teams/leader/${currentUser?.id}`],
    enabled: currentUser?.role === 'team_leader' && !!currentUser?.id,
  });

  const teamId = leaderTeams[0]?.id; // Assuming team leader has one team

  const { data: teamMembersList = [] } = useQuery<User[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: currentUser?.role === 'team_leader' && !!teamId,
    select: (members) => members || [],
  });

  // For other roles (admin, hr, etc.) - fetch all agents
  const { data: allAgents = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.role === 'agent'),
    enabled: currentUser?.role !== 'team_leader',
  });

  // Use appropriate team members based on role
  const agentsToShow = currentUser?.role === 'team_leader' ? teamMembersList : allAgents;

  // Determine which date to fetch daily states for (timezone-safe)
  const queryDate = selectedDate 
    ? format(selectedDate, 'yyyy-MM-dd')
    : getCurrentDate();

  // Fetch daily states for all team members
  const { data: allDailyStates = [], isLoading: dailyStatesLoading } = useQuery<AssetDailyState[]>({
    queryKey: [`/api/assets/daily-states/${queryDate}`],
  });

  // Fetch unreturned assets
  const { data: unreturnedAssetsRaw = [], isLoading: unreturnedLoading } = useQuery<any[]>({
    queryKey: ['/api/unreturned-assets'],
    enabled: ['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(currentUser?.role || ''),
  });

  // Filter unreturned assets for team leaders to show only their team members
  const teamMemberIds = teamMembersList.map(member => member.id);
  const unreturnedAssets = currentUser?.role === 'team_leader' 
    ? unreturnedAssetsRaw.filter(asset => teamMemberIds.includes(asset.userId))
    : unreturnedAssetsRaw;

  // Filter unreturned assets based on search, status, and date
  const filteredUnreturnedAssets = useMemo(() => {
    return unreturnedAssets.filter(asset => {
      const agentName = asset.agentName || getAgentName(asset.userId);
      
      const matchesSearch = searchTerm === "" || 
        agentName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "lost" && asset.status?.toLowerCase() === "lost") ||
        (statusFilter === "not_returned" && asset.status?.toLowerCase() === "not_returned");
      
      // Timezone-safe date comparison using parseISO and isSameDay
      const matchesDate = !selectedDate || 
        isSameDay(parseISO(asset.date), selectedDate);
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [unreturnedAssets, searchTerm, statusFilter, selectedDate]);

  // Reset page to 1 when filters change (for Book In and Book Out tabs)
  useEffect(() => {
    setBookInPage(1);
    setBookOutPage(1);
  }, [searchTerm, statusFilter, selectedDate]);

  // Reset page to 1 when filters change (for Unreturned Assets tab)
  useEffect(() => {
    setLostAssetsPage(1);
  }, [searchTerm, statusFilter, selectedDate]);

  // Unreturned Assets pagination
  const lostAssetsTotalPages = Math.ceil(filteredUnreturnedAssets.length / recordsPerPage);
  const lostAssetsStartIndex = (lostAssetsPage - 1) * recordsPerPage;
  const lostAssetsEndIndex = lostAssetsStartIndex + recordsPerPage;
  const paginatedLostAssets = filteredUnreturnedAssets.slice(lostAssetsStartIndex, lostAssetsEndIndex);

  // Transform daily states by user and asset type for easier lookup
  const statesByUserAndAsset = allDailyStates.reduce((acc, state) => {
    if (!acc[state.userId]) acc[state.userId] = {};
    acc[state.userId][state.assetType] = state;
    return acc;
  }, {} as Record<string, Record<string, AssetDailyState>>);

  // Filter agents by search term, status, and date for Book Out and Book In tabs
  const filteredAgents = useMemo(() => {
    return agentsToShow.filter(agent => {
      // Search filter
      const fullName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
      const username = agent.username || '';
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = searchTerm === "" || 
        fullName.toLowerCase().includes(searchLower) || 
        username.toLowerCase().includes(searchLower);
      
      // Status filter - check if agent has any assets matching the selected status
      const agentStates = statesByUserAndAsset[agent.id] || {};
      const matchesStatus = statusFilter === "all" || 
        Object.values(agentStates).some(state => 
          state.currentState === statusFilter || 
          (statusFilter === "not_returned" && state.currentState === "not_returned") ||
          (statusFilter === "lost" && state.currentState === "lost")
        );
      
      return matchesSearch && matchesStatus;
    });
  }, [agentsToShow, searchTerm, statusFilter, statesByUserAndAsset]);

  // Book In pagination
  const bookInTotalPages = Math.ceil(filteredAgents.length / recordsPerPage);
  const bookInStartIndex = (bookInPage - 1) * recordsPerPage;
  const bookInEndIndex = bookInStartIndex + recordsPerPage;
  const paginatedBookInAgents = filteredAgents.slice(bookInStartIndex, bookInEndIndex);

  // Book Out pagination  
  const bookOutTotalPages = Math.ceil(filteredAgents.length / recordsPerPage);
  const bookOutStartIndex = (bookOutPage - 1) * recordsPerPage;
  const bookOutEndIndex = bookOutStartIndex + recordsPerPage;
  const paginatedBookOutAgents = filteredAgents.slice(bookOutStartIndex, bookOutEndIndex);

  // Book in mutation
  const bookInMutation = useMutation({
    mutationFn: async (data: { userId: string; assetType: string; date: string; status: string; reason?: string }) => {
      return await apiRequest('POST', '/api/assets/book-in', data);
    },
    onSuccess: () => {
      // Invalidate both current date and selected date (if different)
      queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${getCurrentDate()}`] });
      if (queryDate !== getCurrentDate()) {
        queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${queryDate}`] });
      }
      setShowBookInConfirm(false);
      setPendingBookIn(null);
      toast({
        title: "Asset Status Updated",
        description: "Asset booking status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update asset status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Book out mutation
  const bookOutMutation = useMutation({
    mutationFn: async (data: { userId: string; assetType: string; date: string; status: string; reason?: string }) => {
      return await apiRequest('POST', '/api/assets/book-out', data);
    },
    onSuccess: () => {
      // Invalidate both current date and selected date (if different)
      queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${getCurrentDate()}`] });
      if (queryDate !== getCurrentDate()) {
        queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${queryDate}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/unreturned-assets'] });
      setShowBookOutConfirm(false);
      setShowBookOutStatusDialog(false);
      setShowReasonDialog(false);
      setPendingBookOut(null);
      setReasonInput('');
      toast({
        title: "Asset Status Updated",
        description: "Asset return status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update asset status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark found mutation
  const markFoundMutation = useMutation({
    mutationFn: async (data: { userId: string; assetType: string; date: string; recoveryReason: string }) => {
      return await apiRequest('POST', '/api/assets/mark-found', data);
    },
    onSuccess: () => {
      // Invalidate both current date and selected date (if different)
      queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${getCurrentDate()}`] });
      if (queryDate !== getCurrentDate()) {
        queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${queryDate}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/unreturned-assets'] });
      setShowMarkFoundDialog(false);
      setPendingMarkFound(null);
      setReasonInput('');
      toast({
        title: "Asset Marked as Found",
        description: "Asset has been successfully marked as found and is available for collection.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to mark asset as found. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getAgentName = (userId: string) => {
    const user = agentsToShow.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
  };

  const getAssetState = (userId: string, assetType: AssetType): AssetDailyState | null => {
    return statesByUserAndAsset[userId]?.[assetType] || null;
  };

  const canBookOut = (userId: string, assetType: AssetType): boolean => {
    const state = getAssetState(userId, assetType);
    return state?.currentState === 'collected';
  };

  const isAssetDisabled = (userId: string, assetType: AssetType): boolean => {
    const state = getAssetState(userId, assetType);
    
    // Check if there's a state for today
    if (state) {
      // Disable if asset is in a final state (returned, not_returned, lost)
      return ['returned', 'not_returned', 'lost'].includes(state.currentState);
    }
    
    // If no state for today, check if asset is in unreturned assets from previous days
    // This handles cases where an asset was lost/not_returned on a previous day
    if (unreturnedAssets && unreturnedAssets.length > 0) {
      const hasUnreturnedAsset = unreturnedAssets.some(
        asset => asset.userId === userId && asset.assetType === assetType
      );
      if (hasUnreturnedAsset) {
        return true; // Disable booking if asset is in unreturned list
      }
    }
    
    return false;
  };

  // Event handlers
  const handleBookInClick = (userId: string, assetType: AssetType, status: 'collected' | 'not_collected') => {
    const agentName = getAgentName(userId);
    setPendingBookIn({ userId, assetType, status, agentName });
    setShowBookInConfirm(true);
  };

  const confirmBookIn = () => {
    if (!pendingBookIn) return;
    
    bookInMutation.mutate({
      userId: pendingBookIn.userId,
      assetType: pendingBookIn.assetType,
      date: getCurrentDate(),
      status: pendingBookIn.status,
    });
  };

  const handleBookOutClick = (userId: string, assetType: AssetType) => {
    if (!canBookOut(userId, assetType)) {
      toast({
        title: "Cannot Book In Asset",
        description: "Asset must be collected before it can be booked in.",
        variant: "destructive",
      });
      return;
    }

    const agentName = getAgentName(userId);
    setPendingBookOut({ userId, assetType, status: 'returned', agentName });
    setShowBookOutStatusDialog(true);
  };

  const handleBookOutStatusSelect = (status: 'returned' | 'not_returned' | 'lost') => {
    if (!pendingBookOut) return;
    
    setPendingBookOut({ ...pendingBookOut, status });
    setShowBookOutStatusDialog(false);
    
    if (status === 'returned') {
      setShowBookOutConfirm(true);
    } else {
      setShowReasonDialog(true);
    }
  };

  const confirmBookOut = () => {
    if (!pendingBookOut) return;
    
    bookOutMutation.mutate({
      userId: pendingBookOut.userId,
      assetType: pendingBookOut.assetType,
      date: getCurrentDate(),
      status: pendingBookOut.status,
      reason: reasonInput || undefined,
    });
  };

  const handleMarkAsFound = (userId: string, assetType: AssetType, date: string) => {
    const agentName = getAgentName(userId);
    setPendingMarkFound({ userId, assetType, agentName, date });
    setShowMarkFoundDialog(true);
  };

  const confirmMarkFound = () => {
    if (!pendingMarkFound) return;
    
    markFoundMutation.mutate({
      userId: pendingMarkFound.userId,
      assetType: pendingMarkFound.assetType,
      date: pendingMarkFound.date,
      recoveryReason: reasonInput,
    });
  };

  const handleViewReason = (reason: string) => {
    setViewReason(reason);
    setShowViewReasonDialog(true);
  };

  // Reset agent mutation
  const resetAgentMutation = useMutation({
    mutationFn: async (data: { agentId: string; password: string }) => {
      return await apiRequest('POST', '/api/assets/reset-agent', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${getCurrentDate()}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/unreturned-assets'] });
      setShowPasswordConfirmDialog(false);
      setShowResetDialog(false);
      setSelectedResetAgent('');
      setPasswordInput('');
      toast({
        title: "Agent Reset Successful",
        description: "Agent's asset records have been reset for today.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset agent. Please check your password and try again.",
        variant: "destructive",
      });
    },
  });

  const handleResetConfirm = () => {
    if (!selectedResetAgent) {
      toast({
        title: "No Agent Selected",
        description: "Please select an agent to reset.",
        variant: "destructive",
      });
      return;
    }
    setShowResetDialog(false);
    setShowPasswordConfirmDialog(true);
  };

  const handlePasswordConfirm = () => {
    if (!passwordInput.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm the reset.",
        variant: "destructive",
      });
      return;
    }
    
    resetAgentMutation.mutate({
      agentId: selectedResetAgent,
      password: passwordInput,
    });
  };

  // Check if user has permission to manage assets
  if (!['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(currentUser?.role || '')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            You don't have permission to manage assets.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while asset data is being fetched
  if (dailyStatesLoading || unreturnedLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading asset states...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Asset Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by agent name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-assets"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal" data-testid="button-date-filter">
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Filter by Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
                {selectedDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedDate(undefined)}
                      data-testid="button-clear-date"
                    >
                      Clear Date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {currentUser?.role === 'team_leader' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                data-testid="button-reset-agent"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Agent
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="book_in" data-testid="tab-book-in">Book Out</TabsTrigger>
              <TabsTrigger value="book_out" data-testid="tab-book-out">Book In</TabsTrigger>
              <TabsTrigger value="unreturned" data-testid="tab-unreturned">Unreturned Assets</TabsTrigger>
            </TabsList>

            {/* Book Out Tab (Issuing/Handing Out Assets) */}
            <TabsContent value="book_in" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Confirm whether agents have collected their assets. Select ✓ for collected or ✗ for not collected.
              </div>
              
              <div className="bg-card rounded-lg border border-border shadow-sm">
                <div className="p-4 border-b border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredAgents.length > 0 ? bookInStartIndex + 1 : 0} to {Math.min(bookInEndIndex, filteredAgents.length)} of {filteredAgents.length} records
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: '#1a1f5c' }}>
                      <tr>
                        <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Agent</th>
                        {ASSET_TYPES.map(asset => (
                          <th key={asset.id} className="px-6 py-5 text-center text-sm font-semibold text-white uppercase tracking-wide">
                            <div className="flex items-center justify-center space-x-2">
                              <asset.icon className="w-4 h-4" />
                              <span>{asset.name}</span>
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-5 text-center text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {paginatedBookInAgents.map(agent => (
                        <tr key={agent.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            {`${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username}
                          </td>
                          {ASSET_TYPES.map(asset => {
                            const state = getAssetState(agent.id, asset.id);
                            const isDisabled = isAssetDisabled(agent.id, asset.id);
                            const hasState = state && ['ready_for_collection', 'collected', 'not_collected', 'returned', 'not_returned', 'lost'].includes(state.currentState);
                            const badgeColor = isViewingToday() 
                              ? STATE_CONFIG[state?.currentState as keyof typeof STATE_CONFIG]?.color
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
                            
                            return (
                              <td key={asset.id} className="px-6 py-4 text-center">
                                {hasState ? (
                                  <Badge 
                                    className={badgeColor}
                                    data-testid={`badge-${agent.id}-${asset.id}`}
                                  >
                                    {STATE_CONFIG[state.currentState as keyof typeof STATE_CONFIG]?.label}
                                  </Badge>
                                ) : (
                                  <div className="flex justify-center space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isDisabled || !isViewingToday()}
                                      onClick={() => handleBookInClick(agent.id, asset.id, 'collected')}
                                      data-testid={`button-book-in-collected-${agent.id}-${asset.id}`}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isDisabled || !isViewingToday()}
                                      onClick={() => handleBookInClick(agent.id, asset.id, 'not_collected')}
                                      data-testid={`button-book-in-not-collected-${agent.id}-${asset.id}`}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(agent.id);
                                setAuditLogDialogOpen(true);
                              }}
                              data-testid={`button-audit-log-${agent.id}`}
                              title="View Audit Log"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {bookInPage} of {bookInTotalPages || 1}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBookInPage(Math.max(1, bookInPage - 1))}
                      disabled={bookInPage === 1}
                      data-testid="button-book-in-previous"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBookInPage(Math.min(bookInTotalPages, bookInPage + 1))}
                      disabled={bookInPage >= bookInTotalPages}
                      data-testid="button-book-in-next"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Book In Tab (Returning Assets) */}
            <TabsContent value="book_out" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Confirm whether agents have returned their assets. Only assets that were collected can be booked in.
              </div>
              
              <div className="bg-card rounded-lg border border-border shadow-sm">
                <div className="p-4 border-b border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredAgents.length > 0 ? bookOutStartIndex + 1 : 0} to {Math.min(bookOutEndIndex, filteredAgents.length)} of {filteredAgents.length} records
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: '#1a1f5c' }}>
                      <tr>
                        <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Agent</th>
                        {ASSET_TYPES.map(asset => (
                          <th key={asset.id} className="px-6 py-5 text-center text-sm font-semibold text-white uppercase tracking-wide">
                            <div className="flex items-center justify-center space-x-2">
                              <asset.icon className="w-4 h-4" />
                              <span>{asset.name}</span>
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-5 text-center text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {paginatedBookOutAgents.map(agent => (
                        <tr key={agent.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            {`${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username}
                          </td>
                          {ASSET_TYPES.map(asset => {
                            const state = getAssetState(agent.id, asset.id);
                            const canBook = canBookOut(agent.id, asset.id);
                            const isDisabled = isAssetDisabled(agent.id, asset.id);
                            const hasBookOutState = state && ['ready_for_collection', 'collected', 'not_collected', 'returned', 'not_returned', 'lost'].includes(state.currentState);
                            const badgeColor = isViewingToday() 
                              ? STATE_CONFIG[state?.currentState as keyof typeof STATE_CONFIG]?.color
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
                            
                            return (
                              <td key={asset.id} className="px-6 py-4 text-center">
                                {hasBookOutState && (state.currentState === 'returned' || state.currentState === 'not_returned' || state.currentState === 'lost') ? (
                                  <Badge 
                                    className={badgeColor}
                                    data-testid={`badge-book-out-${agent.id}-${asset.id}`}
                                  >
                                    {STATE_CONFIG[state.currentState as keyof typeof STATE_CONFIG]?.label}
                                  </Badge>
                                ) : hasBookOutState && !isViewingToday() ? (
                                  <Badge 
                                    className={badgeColor}
                                    data-testid={`badge-book-out-${agent.id}-${asset.id}`}
                                  >
                                    {STATE_CONFIG[state.currentState as keyof typeof STATE_CONFIG]?.label}
                                  </Badge>
                                ) : canBook ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!isViewingToday()}
                                    onClick={() => handleBookOutClick(agent.id, asset.id)}
                                    data-testid={`button-book-out-${agent.id}-${asset.id}`}
                                  >
                                    Book In
                                  </Button>
                                ) : state?.currentState === 'not_collected' ? (
                                  <div className="text-xs text-muted-foreground">
                                    Not Collected
                                  </div>
                                ) : state?.currentState === 'ready_for_collection' && isViewingToday() ? (
                                  <div className="text-xs text-muted-foreground">
                                    Not Collected Yet
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    Not Available
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(agent.id);
                                setAuditLogDialogOpen(true);
                              }}
                              data-testid={`button-audit-log-bookout-${agent.id}`}
                              title="View Audit Log"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {bookOutPage} of {bookOutTotalPages || 1}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBookOutPage(Math.max(1, bookOutPage - 1))}
                      disabled={bookOutPage === 1}
                      data-testid="button-book-out-previous"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBookOutPage(Math.min(bookOutTotalPages, bookOutPage + 1))}
                      disabled={bookOutPage >= bookOutTotalPages}
                      data-testid="button-book-out-next"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Unreturned Assets Tab */}
            <TabsContent value="unreturned" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Assets that are lost or not returned. Use "Mark as Found" to restore assets to available status.
              </div>

              {unreturnedLoading ? (
                <div className="text-center py-8">Loading unreturned assets...</div>
              ) : filteredUnreturnedAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || selectedDate
                    ? "No assets match your filters."
                    : "No unreturned assets found."}
                </div>
              ) : (
                <div className="bg-card rounded-lg border border-border shadow-sm">
                  <div className="p-4 border-b border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredUnreturnedAssets.length > 0 ? lostAssetsStartIndex + 1 : 0} to {Math.min(lostAssetsEndIndex, filteredUnreturnedAssets.length)} of {filteredUnreturnedAssets.length} records
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: '#1a1f5c' }}>
                        <tr>
                          <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Agent</th>
                          <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Asset Type</th>
                          <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Status</th>
                          <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Date Lost</th>
                          <th className="px-6 py-5 text-left text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {paginatedLostAssets.map((asset, index) => (
                          <tr key={`${asset.userId}-${asset.assetType}-${index}`} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4 font-medium">
                              {asset.agentName || getAgentName(asset.userId)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const assetType = ASSET_TYPES.find(t => t.id === asset.assetType);
                                  const IconComponent = assetType?.icon;
                                  return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
                                })()}
                                <span className="capitalize">{asset.assetType}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={asset.statusColor || 'bg-red-100 text-red-800'}>
                                {asset.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {new Date(asset.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkAsFound(asset.userId, asset.assetType, asset.date)}
                                  data-testid={`button-mark-found-${asset.userId}-${asset.assetType}`}
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  Mark as Found
                                </Button>
                                {asset.reason && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewReason(asset.reason)}
                                    data-testid={`button-view-reason-${asset.userId}-${asset.assetType}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View Reason
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {lostAssetsPage} of {lostAssetsTotalPages || 1}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLostAssetsPage(Math.max(1, lostAssetsPage - 1))}
                        disabled={lostAssetsPage === 1}
                        data-testid="button-lost-previous"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLostAssetsPage(Math.min(lostAssetsTotalPages, lostAssetsPage + 1))}
                        disabled={lostAssetsPage >= lostAssetsTotalPages}
                        data-testid="button-lost-next"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Book Out Confirmation Dialog (Issuing Assets) */}
      <AlertDialog open={showBookInConfirm} onOpenChange={setShowBookInConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Asset Status</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBookIn && (
                <>
                  Are you sure you want to mark {pendingBookIn.agentName}'s {pendingBookIn.assetType} as{' '}
                  <strong>{pendingBookIn.status === 'collected' ? 'collected' : 'not collected'}</strong>?
                  {pendingBookIn.status === 'collected' && (
                    <div className="mt-2 text-sm text-green-600">
                      ✓ Asset will be marked as collected from team leader
                    </div>
                  )}
                  {pendingBookIn.status === 'not_collected' && (
                    <div className="mt-2 text-sm text-amber-600">
                      ✗ Asset will be marked as not collected from team leader
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-book-in">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBookIn}
              disabled={bookInMutation.isPending}
              data-testid="button-confirm-book-in"
            >
              {bookInMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Book In Status Selection Dialog (Returning Assets) */}
      <Dialog open={showBookOutStatusDialog} onOpenChange={setShowBookOutStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asset Return Status</DialogTitle>
            <DialogDescription>
              {pendingBookOut && (
                <>What is the status of {pendingBookOut.agentName}'s {pendingBookOut.assetType}?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleBookOutStatusSelect('returned')}
              data-testid="button-select-returned"
            >
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Returned to Team Leader
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleBookOutStatusSelect('not_returned')}
              data-testid="button-select-not-returned"
            >
              <X className="w-4 h-4 mr-2 text-orange-600" />
              Not Returned
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleBookOutStatusSelect('lost')}
              data-testid="button-select-lost"
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
              Lost
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book In Confirmation Dialog (Returning Assets) */}
      <AlertDialog open={showBookOutConfirm} onOpenChange={setShowBookOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Asset Return</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBookOut && (
                <>
                  Are you sure {pendingBookOut.agentName}'s {pendingBookOut.assetType} has been{' '}
                  <strong>returned to team leader</strong>?
                  <div className="mt-2 text-sm text-green-600">
                    ✓ Asset will be marked as returned and both tabs will be grayed out
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-book-out">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBookOut}
              disabled={bookOutMutation.isPending}
              data-testid="button-confirm-book-out"
            >
              {bookOutMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reason Input Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Reason</DialogTitle>
            <DialogDescription>
              {pendingBookOut && (
                <>
                  Please provide a reason why {pendingBookOut.agentName}'s {pendingBookOut.assetType} was{' '}
                  {pendingBookOut.status === 'lost' ? 'lost' : 'not returned'}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Enter reason..."
              data-testid="textarea-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReasonDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmBookOut}
              disabled={!reasonInput.trim() || bookOutMutation.isPending}
              data-testid="button-confirm-reason"
            >
              {bookOutMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Reason Dialog */}
      <Dialog open={showViewReasonDialog} onOpenChange={setShowViewReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asset Loss Reason</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">{viewReason}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowViewReasonDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Found Dialog */}
      <Dialog open={showMarkFoundDialog} onOpenChange={setShowMarkFoundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Asset as Found</DialogTitle>
            <DialogDescription>
              {pendingMarkFound && (
                <>
                  Please provide details about how {pendingMarkFound.agentName}'s {pendingMarkFound.assetType} was recovered.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="recovery-reason">Recovery Details</Label>
            <Textarea
              id="recovery-reason"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Enter recovery details..."
              data-testid="textarea-recovery-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkFoundDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmMarkFound}
              disabled={!reasonInput.trim() || markFoundMutation.isPending}
              data-testid="button-confirm-mark-found"
            >
              {markFoundMutation.isPending ? "Updating..." : "Mark as Found"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Agent Selection Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Agent Asset Records</DialogTitle>
            <DialogDescription>
              Select an agent to reset their asset book in/book out records for today. This will clear their daily states and make all assets available for booking again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="agent-select">Select Agent</Label>
            <Select value={selectedResetAgent} onValueChange={setSelectedResetAgent}>
              <SelectTrigger data-testid="select-reset-agent">
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent>
                {agentsToShow.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {`${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetConfirm}
              disabled={!selectedResetAgent}
              data-testid="button-confirm-reset-selection"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <Dialog open={showPasswordConfirmDialog} onOpenChange={setShowPasswordConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reset with Password</DialogTitle>
            <DialogDescription>
              {selectedResetAgent && (
                <>
                  You are about to reset all asset records for{' '}
                  <strong>
                    {agentsToShow.find(a => a.id === selectedResetAgent)?.firstName || 'Unknown'}{' '}
                    {agentsToShow.find(a => a.id === selectedResetAgent)?.lastName || ''}
                  </strong>{' '}
                  for today. This action cannot be undone. Please enter your password to confirm.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="password">Your Password</Label>
            <Input
              id="password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter your password..."
              data-testid="input-password-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handlePasswordConfirm}
              disabled={!passwordInput.trim() || resetAgentMutation.isPending}
              data-testid="button-confirm-reset-password"
            >
              {resetAgentMutation.isPending ? "Resetting..." : "Reset Agent Records"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Audit Log Dialog */}
      <Dialog open={auditLogDialogOpen} onOpenChange={setAuditLogDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-asset-audit-log">
          <DialogHeader>
            <DialogTitle>Asset Audit Log</DialogTitle>
            <DialogDescription>
              View the complete history of asset state changes for this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUserId && (
            <AssetAuditLog userId={selectedUserId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}