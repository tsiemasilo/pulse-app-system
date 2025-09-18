import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Laptop, Headphones, Usb, Check, X, Save, Loader2, Eye, Settings, Calendar, BarChart3 } from "lucide-react";
import type { User, Asset, AssetBooking, AssetDetails, InsertAssetBooking, InsertAssetDetails } from "@shared/schema";

interface AssetManagementProps {
  userId?: string;
  showActions?: boolean;
}

// Using AssetBooking and AssetDetails types from shared schema

export default function AssetManagement({ userId, showActions = false }: AssetManagementProps) {
  const [activeTab, setActiveTab] = useState('asset_booking');
  const [bookingMode, setBookingMode] = useState<'collect' | 'return'>('collect');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showBookingHistoryDialog, setShowBookingHistoryDialog] = useState(false);
  const [showAssetDetailsDialog, setShowAssetDetailsDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<{id: string; name: string} | null>(null);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<{type: string; userId: string} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get current date - declared before usage
  const getCurrentDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Agent Records functionality - date selection and state
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateKey());
  const [assetBookingsBookIn, setAssetBookingsBookIn] = useState<{[key: string]: any}>({});
  const [assetBookingsBookOut, setAssetBookingsBookOut] = useState<{[key: string]: any}>({});
  const [lostAssets, setLostAssets] = useState<Array<{
    agentId: string;
    agentName: string;
    assetType: string;
    dateLost: string;
  }>>([]);

  // Dialog state for lost asset confirmation
  const [showLostAssetDialog, setShowLostAssetDialog] = useState(false);
  const [pendingAssetAction, setPendingAssetAction] = useState<{
    userId: string;
    assetType: string;
    agentName: string;
  } | null>(null);
  
  // Fetch today's booking data for all users
  const { data: todayBookings = [], isLoading: bookingsLoading } = useQuery<AssetBooking[]>({
    queryKey: [`/api/asset-bookings/date/${getCurrentDateKey()}`],
  });

  // Fetch asset loss records
  const { data: assetLossRecords = [], isLoading: lossRecordsLoading } = useQuery<any[]>({
    queryKey: ['/api/asset-loss'],
  });

  // Historical records from database for agent records tab
  const { data: historicalRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/historical-asset-records', selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/historical-asset-records?date=${selectedDate}`);
      return response.json();
    },
  });

  // Fetch asset loss records filtered by date for agent records tab
  const { data: selectedDateAssetLossRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/asset-loss', selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/asset-loss?date=${selectedDate}`);
      return response.json();
    },
  });


  // For user-specific view (agents seeing their own assets)
  if (userId) {
    const { data: userAssets = [], isLoading } = useQuery<Asset[]>({
      queryKey: [`/api/assets/user/${userId}`],
    });

    // Fetch user's booking data from database
    const { data: userBookings = [], isLoading: userBookingsLoading } = useQuery<AssetBooking[]>({
      queryKey: [`/api/asset-bookings/user/${userId}/date/${getCurrentDateKey()}`],
    });

    // Transform bookings data for easier access
    const bookingStatus = {
      bookOut: userBookings.find(b => b.bookingType === 'book_out'),
      bookIn: userBookings.find(b => b.bookingType === 'book_in'),
      lostAssets: (assetLossRecords as any[]).filter((record: any) => record.userId === userId)
    };

    if (isLoading || userBookingsLoading) {
      return <div className="text-center py-8">Loading assets...</div>;
    }

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

    // Helper function to get booking status for an asset type
    const getAssetBookingStatus = (assetType: string, defaultStatus: string) => {
      const bookOutStatus = bookingStatus.bookOut?.[assetType as keyof AssetBooking];
      const bookInStatus = bookingStatus.bookIn?.[assetType as keyof AssetBooking];
      const isLost = bookingStatus.lostAssets.some((lostAsset: any) => lostAsset.assetType === assetType);
      
      if (isLost) return { status: 'Lost', color: 'bg-red-100 text-red-800' };
      if (bookOutStatus === 'not_returned') return { status: 'Not Returned', color: 'bg-red-100 text-red-800' };
      if (bookOutStatus === 'returned') return { status: 'Returned', color: 'bg-green-100 text-green-800' };
      if (bookInStatus === 'not_collected') return { status: 'Not Collected', color: 'bg-yellow-100 text-yellow-800' };
      if (bookInStatus === 'collected') return { status: 'Collected', color: 'bg-green-100 text-green-800' };
      
      return { status: defaultStatus, color: 'bg-blue-100 text-blue-800' };
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>My Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userAssets.map((asset) => {
              // Map asset names to booking system asset types
              const assetTypeMapping: Record<string, string> = {
                'laptop': 'laptop',
                'headset': 'headsets',
                'headsets': 'headsets',
                'dongle': 'dongle',
                'usb dongle': 'dongle'
              };
              
              const bookingAssetType = assetTypeMapping[asset.name.toLowerCase()] || asset.name.toLowerCase();
              const statusInfo = getAssetBookingStatus(bookingAssetType, asset.status);
              
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
                    {statusInfo.status === 'Not Returned' && (
                      <div className="text-xs text-red-600 font-medium mt-1">
                        ⚠️ This asset has not been returned
                      </div>
                    )}
                    {statusInfo.status === 'Lost' && (
                      <div className="text-xs text-red-600 font-medium mt-1">
                        ❌ This asset is marked as lost
                      </div>
                    )}
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

  // For team leaders - fetch team members
  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.role === 'agent'),
  });

  // Transform booking data for easier access by user ID
  const bookingsByUser = todayBookings.reduce((acc, booking) => {
    if (!acc[booking.userId]) acc[booking.userId] = {};
    acc[booking.userId][booking.bookingType] = booking;
    return acc;
  }, {} as Record<string, Record<string, AssetBooking>>);

  // Function to get all unreturned assets (both lost and not returned)
  const getUnreturnedAssets = () => {
    const unreturnedAssets: Array<{
      userId: string;
      agentName: string;
      assetType: string;
      status: string;
      statusColor: string;
      date: string;
    }> = [];

    // Add lost assets from asset loss records
    (assetLossRecords as any[]).forEach((lossRecord: any) => {
      unreturnedAssets.push({
        userId: lossRecord.userId,
        agentName: getAgentName(lossRecord.userId),
        assetType: lossRecord.assetType,
        status: 'Lost',
        statusColor: 'bg-red-100 text-red-800',
        date: lossRecord.dateLost ? new Date(lossRecord.dateLost).toISOString().split('T')[0] : getCurrentDateKey()
      });
    });

    // Add assets marked as not returned from today's bookings
    todayBookings
      .filter(booking => booking.bookingType === 'book_out')
      .forEach(booking => {
        const agentName = getAgentName(booking.userId);
        
        // Check each asset type for not_returned status
        ['laptop', 'headsets', 'dongle'].forEach(assetType => {
          if (booking[assetType as keyof typeof booking] === 'not_returned') {
            // Only add if it's not already in lost assets
            const isAlreadyLost = (assetLossRecords as any[]).some(
              (lossRecord: any) => lossRecord.userId === booking.userId && lossRecord.assetType === assetType
            );
            
            if (!isAlreadyLost) {
              unreturnedAssets.push({
                userId: booking.userId,
                agentName,
                assetType,
                status: 'Not Returned Yet',
                statusColor: 'bg-orange-100 text-orange-800',
                date: booking.date
              });
            }
          }
        });
      });

    return unreturnedAssets.sort((a, b) => a.agentName.localeCompare(b.agentName));
  };

  // Mutation to create/update asset bookings
  const updateAssetBookingMutation = useMutation({
    mutationFn: async (booking: InsertAssetBooking) => {
      return await apiRequest('POST', '/api/asset-bookings', booking);
    },
    onSuccess: () => {
      // Invalidate and refetch booking data AND historical records for Reports tab sync
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/asset-bookings') || 
                 queryKey?.startsWith('/api/historical-asset-records');
        }
      });
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update asset booking. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to create asset loss records
  const createAssetLossMutation = useMutation({
    mutationFn: async (lossData: { userId: string; assetType: string; reason: string; dateLost: Date }) => {
      return await apiRequest('POST', '/api/asset-loss', lossData);
    },
    onSuccess: () => {
      // Invalidate both asset loss records and historical records for proper cache sync
      queryClient.invalidateQueries({ queryKey: ['/api/asset-loss'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/historical-asset-records');
        }
      });
    },
    onError: (error) => {
      toast({
        title: "Error Recording Asset Loss",
        description: "Failed to record asset loss. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAssetLossMutation = useMutation({
    mutationFn: async (deleteData: { userId: string; assetType: string; date: string }) => {
      return await apiRequest('DELETE', '/api/asset-loss', deleteData);
    },
    onSuccess: () => {
      // Invalidate both asset loss records and historical records for proper cache sync
      queryClient.invalidateQueries({ queryKey: ['/api/asset-loss'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/historical-asset-records');
        }
      });
    },
    onError: (error) => {
      console.error("Error deleting asset loss record:", error);
      // Don't show error toast for delete operations as they are cleanup
    },
  });

  // Save records mutation for agent records tab
  const saveRecordsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/historical-asset-records", data);
    },
    onSuccess: () => {
      const currentDate = new Date().toISOString().split('T')[0];
      // Use predicate to invalidate all related queries consistently
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/historical-asset-records') || 
                 queryKey?.startsWith('/api/asset-loss');
        }
      });
      toast({
        title: "Records Saved",
        description: `Asset booking records for ${currentDate} have been saved successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Records",
        description: "Failed to save asset booking records. Please try again.",
        variant: "destructive"
      });
      console.error("Failed to save records:", error);
    }
  });

  // Save asset records function for agent records tab
  const saveAssetRecords = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const recordData = {
      date: currentDate,
      bookInRecords: assetBookingsBookIn,
      bookOutRecords: assetBookingsBookOut,
      lostAssets: lostAssets
    };

    saveRecordsMutation.mutate(recordData);
  };

  // Function to get agent asset status for agent records tab
  const getAgentAssetStatus = (agentId: string, assetType: 'laptop' | 'headsets' | 'dongle') => {
    let bookInStatus = 'none';
    let bookOutStatus = 'none';
    
    const dayRecords = historicalRecords.filter(record => record.date === selectedDate);
    
    dayRecords.forEach(record => {
      const bookInRecord = record.bookInRecords?.[agentId];
      const bookOutRecord = record.bookOutRecords?.[agentId];
      
      if (bookInRecord?.[assetType]) {
        bookInStatus = bookInRecord[assetType];
      }
      if (bookOutRecord?.[assetType]) {
        bookOutStatus = bookOutRecord[assetType];
      }
    });
    
    // Check for lost assets (data is already filtered by selected date)
    const isLostOnSelectedDate = selectedDateAssetLossRecords.some(asset => 
      asset.userId === agentId && asset.assetType === assetType
    );
    
    // Apply status precedence (latest actions override earlier ones)
    if (bookInStatus === 'collected') {
      return { status: 'Collected', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
    }
    
    if (bookOutStatus === 'returned') {
      return { status: 'Returned', variant: 'secondary' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    }
    
    if (isLostOnSelectedDate) {
      return { status: 'Lost', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (bookOutStatus === 'not_returned') {
      return { status: 'Not Returned', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (bookInStatus === 'not_collected') {
      return { status: 'Not Collected', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
    }
    
    return { status: 'Not Collected', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
  };
  
  // Function to get all agents with asset records for agent records tab
  const getAgentAssetRecords = () => {
    const agentSet = new Set<string>();
    
    const dayRecords = historicalRecords.filter(record => record.date === selectedDate);
    dayRecords.forEach(record => {
      Object.keys(record.bookInRecords || {}).forEach(agentId => agentSet.add(agentId));
      Object.keys(record.bookOutRecords || {}).forEach(agentId => agentSet.add(agentId));
      (record.lostAssets || []).forEach((asset: any) => agentSet.add(asset.userId || asset.agentId));
    });

    selectedDateAssetLossRecords.forEach(asset => {
      agentSet.add(asset.userId);
    });
    
    return Array.from(agentSet).map(agentId => {
      let agentName = 'Unknown Agent';
      const teamMember = teamMembers.find(member => member.id === agentId);
      
      if (teamMember) {
        agentName = `${teamMember.firstName || ''} ${teamMember.lastName || ''}`.trim() || teamMember.username || 'Unknown';
      } else {
        const dayRecords = historicalRecords.filter(record => record.date === selectedDate);
        for (const record of dayRecords) {
          const bookInRecord = record.bookInRecords?.[agentId];
          const bookOutRecord = record.bookOutRecords?.[agentId];
          
          if (bookInRecord?.agentName) {
            agentName = bookInRecord.agentName;
            break;
          } else if (bookOutRecord?.agentName) {
            agentName = bookOutRecord.agentName;
            break;
          }
        }
      }
      
      return {
        agentId,
        agentName,
        laptop: getAgentAssetStatus(agentId, 'laptop'),
        headsets: getAgentAssetStatus(agentId, 'headsets'),
        dongle: getAgentAssetStatus(agentId, 'dongle')
      };
    }).sort((a, b) => a.agentName.localeCompare(b.agentName));
  };

  const updateAssetBookingBookIn = (userId: string, assetType: string, status: 'none' | 'collected' | 'not_collected') => {
    const agentName = getAgentName(userId);
    
    // Get current booking or create a new one
    const currentBooking = bookingsByUser[userId]?.['book_in'];
    
    const bookingData: InsertAssetBooking = {
      userId,
      date: getCurrentDateKey(),
      bookingType: 'book_in',
      laptop: assetType === 'laptop' ? status : (currentBooking?.laptop || 'none'),
      headsets: assetType === 'headsets' ? status : (currentBooking?.headsets || 'none'),
      dongle: assetType === 'dongle' ? status : (currentBooking?.dongle || 'none'),
      agentName,
    };
    
    updateAssetBookingMutation.mutate(bookingData);
    
    const statusText = status === 'collected' ? 'collected' : status === 'not_collected' ? 'not collected' : 'unmarked';
    toast({
      title: "Asset Updated",
      description: `${assetType} marked as ${statusText} for ${agentName}`,
    });
  };

  // Function to handle lost asset dialog responses
  const handleLostAssetResponse = (isLost: boolean) => {
    if (!pendingAssetAction) return;
    
    const { userId, assetType, agentName } = pendingAssetAction;
    
    if (isLost) {
      // Create asset loss record
      createAssetLossMutation.mutate({
        userId,
        assetType,
        reason: 'Asset reported as lost during book out process',
        dateLost: new Date()
      });
      
      // Update the booking status to not_returned
      updateAssetBookingBookOutDirect(userId, assetType, 'not_returned');
      
      toast({
        title: "Asset Marked as Lost",
        description: `${assetType} marked as lost for ${agentName}`,
      });
    } else {
      // Clear any existing lost record for this user/asset/date
      deleteAssetLossMutation.mutate({
        userId,
        assetType,
        date: getCurrentDateKey()
      });
      
      // Mark as not returned (without adding to lost assets)
      updateAssetBookingBookOutDirect(userId, assetType, 'not_returned');
      
      toast({
        title: "Asset Not Returned",
        description: `${assetType} marked as not returned for ${agentName}`,
      });
    }
    
    // Close dialog and clear pending action
    setShowLostAssetDialog(false);
    setPendingAssetAction(null);
  };

  // Helper function to resolve agent name properly
  const getAgentName = (userId: string): string => {
    const agent = teamMembers.find(member => member.id === userId);
    
    if (agent) {
      // Try full name first
      const fullName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
      if (fullName) {
        return fullName;
      }
      
      // Fall back to username if no full name
      if (agent.username) {
        return agent.username;
      }
      
      // Fall back to email if available
      if (agent.email) {
        return agent.email;
      }
    }
    
    // If no agent data available, use just the user ID instead of "Unknown Agent"
    return `Agent ${userId.substring(0, 8)}`;
  };

  const updateAssetBookingBookOut = (userId: string, assetType: string, status: 'none' | 'returned' | 'not_returned') => {
    // If marking as not_returned, show the lost asset dialog
    if (status === 'not_returned') {
      const agentName = getAgentName(userId);
      
      setPendingAssetAction({ userId, assetType, agentName });
      setShowLostAssetDialog(true);
      return; // Exit early, dialog will handle the actual update
    }
    
    // For other statuses, proceed normally
    updateAssetBookingBookOutDirect(userId, assetType, status);
  };

  const updateAssetBookingBookOutDirect = (userId: string, assetType: string, status: 'none' | 'returned' | 'not_returned') => {
    const agentName = getAgentName(userId);
    
    // Get current booking or create a new one
    const currentBooking = bookingsByUser[userId]?.['book_out'];
    
    const bookingData: InsertAssetBooking = {
      userId,
      date: getCurrentDateKey(),
      bookingType: 'book_out',
      laptop: assetType === 'laptop' ? status : (currentBooking?.laptop || 'none'),
      headsets: assetType === 'headsets' ? status : (currentBooking?.headsets || 'none'),
      dongle: assetType === 'dongle' ? status : (currentBooking?.dongle || 'none'),
      agentName,
    };
    
    updateAssetBookingMutation.mutate(bookingData);
    
    const statusText = status === 'returned' ? 'returned' : status === 'not_returned' ? 'not returned' : 'unmarked';
    toast({
      title: "Asset Updated", 
      description: `${assetType} marked as ${statusText} for ${agentName}`,
    });
  };

  // Show booking history dialog
  const showBookingHistory = (agent: { id: string; name: string }) => {
    setSelectedAgent(agent);
    setShowBookingHistoryDialog(true);
  };

  // Fetch asset details for selected user
  const { data: selectedUserAssetDetails, isLoading: assetDetailsLoading } = useQuery<any[]>({
    queryKey: [`/api/asset-details/user/${selectedAssetForDetails?.userId}`],
    enabled: !!selectedAssetForDetails?.userId,
  });

  // Mutation for updating asset details
  const updateAssetDetailsMutation = useMutation({
    mutationFn: async (assetDetails: any) => {
      return apiRequest('POST', '/api/asset-details', assetDetails);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/asset-details/user');
        }
      });
      toast({
        title: "Success",
        description: "Asset details updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset details.",
        variant: "destructive",
      });
    },
  });

  // Show asset details dialog
  const showAssetDetails = (assetType: string, userId: string) => {
    setSelectedAssetForDetails({ type: assetType, userId });
    setShowAssetDetailsDialog(true);
  };

  // Auto-save is now handled by mutations directly

  const UnifiedAssetBookingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Agent
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Laptop className="h-4 w-4" />
                Laptop
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Headphones className="h-4 w-4" />
                Headsets
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Usb className="h-4 w-4" />
                Dongle
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {teamMembers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                No team members found
              </td>
            </tr>
          ) : (
            teamMembers.map((member) => {
              const bookingType = bookingMode === 'collect' ? 'book_in' : 'book_out';
              const booking = bookingsByUser[member.id]?.[bookingType];
              
              return (
                <tr key={member.id} data-testid={`row-agent-${member.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground" data-testid={`text-agent-name-${member.id}`}>
                      { `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {member.id}
                    </div>
                  </td>
                  {['laptop', 'headsets', 'dongle'].map((assetType) => {
                    const status = booking?.[assetType as keyof typeof booking] || 'none';
                    return (
                      <td key={assetType} className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <AssetStatusButtons
                            status={status as 'none' | 'collected' | 'not_collected' | 'returned' | 'not_returned'}
                            onStatusChange={(newStatus) => {
                              if (bookingMode === 'collect') {
                                updateAssetBookingBookIn(member.id, assetType, newStatus as 'none' | 'collected' | 'not_collected');
                              } else {
                                updateAssetBookingBookOut(member.id, assetType, newStatus as 'none' | 'returned' | 'not_returned');
                              }
                            }}
                            assetType={assetType}
                            agentId={member.id}
                            tabType={bookingType}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAgent({ id: member.id, name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent' });
                              setShowBookingHistoryDialog(true);
                            }}
                            className="h-8 w-8 p-0"
                            data-testid={`button-view-${member.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View booking history</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showAssetDetails('laptop', member.id)}
                            className="h-8 w-8 p-0"
                            data-testid={`button-asset-details-${member.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage asset details</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const BookInTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Agent
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Laptop className="h-4 w-4" />
                Laptop
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Headphones className="h-4 w-4" />
                Headsets
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Usb className="h-4 w-4" />
                Dongle
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {teamMembers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                No team members found
              </td>
            </tr>
          ) : (
            teamMembers.map((member) => {
              const booking = bookingsByUser[member.id]?.['book_in'];
              
              return (
                <tr key={member.id} data-testid={`row-agent-${member.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground" data-testid={`text-agent-name-${member.id}`}>
                      { `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{member.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={(booking?.laptop || 'none') as 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected'}
                        onStatusChange={(status) => {
                          if (status === 'none' || status === 'collected' || status === 'not_collected') {
                            updateAssetBookingBookIn(member.id, 'laptop', status);
                          }
                        }}
                        assetType="laptop"
                        agentId={member.id}
                        tabType="book_in"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={(booking?.headsets || 'none') as 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected'}
                        onStatusChange={(status) => {
                          if (status === 'none' || status === 'collected' || status === 'not_collected') {
                            updateAssetBookingBookIn(member.id, 'headsets', status);
                          }
                        }}
                        assetType="headsets"
                        agentId={member.id}
                        tabType="book_in"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={(booking?.dongle || 'none') as 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected'}
                        onStatusChange={(status) => {
                          if (status === 'none' || status === 'collected' || status === 'not_collected') {
                            updateAssetBookingBookIn(member.id, 'dongle', status);
                          }
                        }}
                        assetType="dongle"
                        agentId={member.id}
                        tabType="book_in"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const agentName =  `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent';
                              setSelectedAgent({id: member.id, name: agentName});
                              setShowBookingHistoryDialog(true);
                            }}
                            className="h-9 w-9 p-0"
                            aria-label="View booking history"
                            data-testid={`button-view-history-${member.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View booking history</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAssetForDetails({type: 'all', userId: member.id});
                              setShowAssetDetailsDialog(true);
                            }}
                            className="h-9 w-9 p-0"
                            aria-label="Manage asset details"
                            data-testid={`button-asset-details-${member.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage asset details</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const AssetStatusButtons = ({ status, onStatusChange, assetType, agentId, tabType }: {
    status: 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected';
    onStatusChange: (newStatus: 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected') => void;
    assetType: string;
    agentId: string;
    tabType: 'book_in' | 'book_out';
  }) => {
    const positiveStatus = tabType === 'book_in' ? 'collected' : 'returned';
    const negativeStatus = tabType === 'book_in' ? 'not_collected' : 'not_returned';
    
    const handlePositiveClick = () => {
      // If already positive, deselect (go to none), otherwise select positive
      onStatusChange(status === positiveStatus ? 'none' : positiveStatus);
    };
    
    const handleNegativeClick = () => {
      // If already negative, deselect (go to none), otherwise select negative
      onStatusChange(status === negativeStatus ? 'none' : negativeStatus);
    };

    return (
      <div className="flex items-center gap-2">
        {/* Tick/Check Button */}
        <Button
          variant={status === positiveStatus ? "default" : "outline"}
          size="sm"
          onClick={handlePositiveClick}
          className={`h-8 w-8 p-0 ${
            status === positiveStatus 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700'
          }`}
          data-testid={`button-check-${assetType}-${agentId}-${tabType}`}
        >
          <Check className="h-4 w-4" />
        </Button>
        
        {/* X Button */}
        <Button
          variant={status === negativeStatus ? "default" : "outline"}
          size="sm"
          onClick={handleNegativeClick}
          className={`h-8 w-8 p-0 ${
            status === negativeStatus 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700'
          }`}
          data-testid={`button-x-${assetType}-${agentId}-${tabType}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const BookOutTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Agent
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Laptop className="h-4 w-4" />
                Laptop
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Headphones className="h-4 w-4" />
                Headsets
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center justify-center gap-2">
                <Usb className="h-4 w-4" />
                Dongle
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {teamMembers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                No team members found
              </td>
            </tr>
          ) : (
            teamMembers.map((member) => {
              const booking = bookingsByUser[member.id]?.['book_out'];
              
              return (
                <tr key={member.id} data-testid={`row-agent-${member.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground" data-testid={`text-agent-name-${member.id}`}>
                      { `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{member.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={(booking?.laptop || 'none') as 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected'}
                        onStatusChange={(status) => {
                          if (status === 'none' || status === 'returned' || status === 'not_returned') {
                            updateAssetBookingBookOut(member.id, 'laptop', status);
                          }
                        }}
                        assetType="laptop"
                        agentId={member.id}
                        tabType="book_out"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={(booking?.headsets || 'none') as 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected'}
                        onStatusChange={(status) => {
                          if (status === 'none' || status === 'returned' || status === 'not_returned') {
                            updateAssetBookingBookOut(member.id, 'headsets', status);
                          }
                        }}
                        assetType="headsets"
                        agentId={member.id}
                        tabType="book_out"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={(booking?.dongle || 'none') as 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected'}
                        onStatusChange={(status) => {
                          if (status === 'none' || status === 'returned' || status === 'not_returned') {
                            updateAssetBookingBookOut(member.id, 'dongle', status);
                          }
                        }}
                        assetType="dongle"
                        agentId={member.id}
                        tabType="book_out"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const agentName =  `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent';
                              setSelectedAgent({id: member.id, name: agentName});
                              setShowBookingHistoryDialog(true);
                            }}
                            className="h-9 w-9 p-0"
                            aria-label="View booking history"
                            data-testid={`button-view-history-${member.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View booking history</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAssetForDetails({type: 'all', userId: member.id});
                              setShowAssetDetailsDialog(true);
                            }}
                            className="h-9 w-9 p-0"
                            aria-label="Manage asset details"
                            data-testid={`button-asset-details-${member.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage asset details</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );


  return (
    <TooltipProvider>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="h-5 w-5" />
            Asset Control System
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track which assets agents have collected (Book In) and returned (Book Out)
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid grid-cols-3 w-fit">
                <TabsTrigger value="asset_booking" data-testid="tab-asset-booking">
                  Asset Booking
                </TabsTrigger>
                <TabsTrigger value="lost_assets" data-testid="tab-unreturned-assets">
                  Unreturned Assets
                </TabsTrigger>
                <TabsTrigger value="records" data-testid="tab-records">
                  Agent Records
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'asset_booking' && isAutoSaving && hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="auto-save-indicator">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Auto-saving...
                </div>
              )}
            </div>
            
            <TabsContent value="asset_booking" className="mt-6">
              <div className="space-y-4">
                {/* Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-4 p-4 rounded-lg border flex-1 ${
                    bookingMode === 'collect' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  }`}>
                    {bookingMode === 'collect' ? (
                      <>
                        <Check className="h-5 w-5 text-green-600" />
                        <div>
                          <h3 className="font-medium text-green-800 dark:text-green-200">Collect Assets</h3>
                          <p className="text-sm text-green-600 dark:text-green-300">
                            Mark which assets each agent has collected for their shift
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <X className="h-5 w-5 text-orange-600" />
                        <div>
                          <h3 className="font-medium text-orange-800 dark:text-orange-200">Return Assets</h3>
                          <p className="text-sm text-orange-600 dark:text-orange-300">
                            Mark which assets each agent has returned after their shift
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="ml-4">
                    <ToggleGroup 
                      type="single" 
                      value={bookingMode} 
                      onValueChange={(value) => value && setBookingMode(value as 'collect' | 'return')}
                      className="bg-card border rounded-lg p-1"
                    >
                      <ToggleGroupItem 
                        value="collect" 
                        className={`px-4 py-2 text-sm ${
                          bookingMode === 'collect' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'hover:bg-muted'
                        }`}
                        data-testid="toggle-collect"
                      >
                        Collect
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="return" 
                        className={`px-4 py-2 text-sm ${
                          bookingMode === 'return' 
                            ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                            : 'hover:bg-muted'
                        }`}
                        data-testid="toggle-return"
                      >
                        Return
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
                <UnifiedAssetBookingTable />
              </div>
            </TabsContent>
            
            <TabsContent value="lost_assets" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <X className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-800 dark:text-red-200">Unreturned Assets Records</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      Track assets that are lost or haven't been returned yet
                    </p>
                  </div>
                </div>
                
                {(() => {
                  const unreturnedAssets = getUnreturnedAssets();
                  
                  return unreturnedAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No unreturned assets recorded
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Agent
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Asset Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {unreturnedAssets.map((asset, index) => (
                            <tr key={`${asset.userId}-${asset.assetType}-${index}`} data-testid={`row-unreturned-asset-${index}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-foreground" data-testid={`text-unreturned-agent-name-${index}`}>
                                  {asset.agentName}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {asset.assetType === 'laptop' && <Laptop className="h-4 w-4 text-muted-foreground" />}
                                  {asset.assetType === 'headsets' && <Headphones className="h-4 w-4 text-muted-foreground" />}
                                  {asset.assetType === 'dongle' && <Usb className="h-4 w-4 text-muted-foreground" />}
                                  <span className="text-sm text-foreground capitalize" data-testid={`text-unreturned-asset-type-${index}`}>
                                    {asset.assetType}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-unreturned-date-${index}`}>
                                {asset.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <Badge className={asset.statusColor} data-testid={`badge-unreturned-status-${index}`}>
                                  {asset.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            <TabsContent value="records" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">Agent Asset Records</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      View and manage historical asset records for all agents by date
                    </p>
                  </div>
                </div>

                {/* Date Picker */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Select Date for Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="p-2 border rounded-md"
                        data-testid="date-picker-records"
                      />
                      <Button 
                        onClick={saveAssetRecords}
                        disabled={saveRecordsMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="button-save-records"
                      >
                        <Save className="h-4 w-4" />
                        {saveRecordsMutation.isPending ? 'Saving...' : 'Save Records'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Agent Records Table */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Agent Asset Records - {selectedDate}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      const rows = getAgentAssetRecords();
                      if (rows.length === 0) return (
                        <div className="text-center py-12 text-muted-foreground">
                          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Calendar className="h-8 w-8" />
                          </div>
                          <h3 className="text-lg font-medium mb-2">No Records Found</h3>
                          <p className="text-sm">No agent asset records were found for this date.</p>
                        </div>
                      );
                      return (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="w-[250px] font-semibold">Agent Name</TableHead>
                                <TableHead className="text-center font-semibold">
                                  <div className="flex items-center justify-center gap-2">
                                    <Laptop className="h-4 w-4"/>
                                    Laptop
                                  </div>
                                </TableHead>
                                <TableHead className="text-center font-semibold">
                                  <div className="flex items-center justify-center gap-2">
                                    <Headphones className="h-4 w-4"/>
                                    Headsets
                                  </div>
                                </TableHead>
                                <TableHead className="text-center font-semibold">
                                  <div className="flex items-center justify-center gap-2">
                                    <Usb className="h-4 w-4"/>
                                    Dongle
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rows.map((row, idx) => (
                                <TableRow key={`${row.agentId}-${idx}`} className="hover:bg-muted/30 transition-colors duration-200" data-testid={`row-agent-record-${idx}`}>
                                  <TableCell className="px-6 py-4" data-testid={`text-agent-name-${idx}`}>
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-primary">
                                          {row.agentName.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-foreground">{row.agentName}</div>
                                        <div className="text-xs text-muted-foreground">Agent ID: {row.agentId}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center" data-testid={`badge-laptop-${idx}`}>
                                    <Badge 
                                      variant={row.laptop.variant} 
                                      className={`${row.laptop.color} text-xs font-medium`}
                                    >
                                      {row.laptop.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center" data-testid={`badge-headsets-${idx}`}>
                                    <Badge 
                                      variant={row.headsets.variant} 
                                      className={`${row.headsets.color} text-xs font-medium`}
                                    >
                                      {row.headsets.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center" data-testid={`badge-dongle-${idx}`}>
                                    <Badge 
                                      variant={row.dongle.variant} 
                                      className={`${row.dongle.color} text-xs font-medium`}
                                    >
                                      {row.dongle.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
          </Tabs>
        </CardContent>
      </Card>

      {/* Booking History Dialog */}
      <Dialog open={showBookingHistoryDialog} onOpenChange={setShowBookingHistoryDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-booking-history">Booking History - {selectedAgent?.name}</DialogTitle>
            <DialogDescription>
              View detailed booking history showing when and what time assets were booked in and out
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="space-y-4">
              {/* Today's Bookings */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Today's Activity</h4>
                <div className="space-y-2">
                  {selectedAgent && (
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Book In - {getCurrentDateKey()}</div>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Laptop className="h-3 w-3" />
                          <span>{bookingsByUser[selectedAgent.id]?.['book_in']?.laptop === 'collected' ? 'Collected' : bookingsByUser[selectedAgent.id]?.['book_in']?.laptop === 'not_collected' ? 'Not Collected' : 'None'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Headphones className="h-3 w-3" />
                          <span>{bookingsByUser[selectedAgent.id]?.['book_in']?.headsets === 'collected' ? 'Collected' : bookingsByUser[selectedAgent.id]?.['book_in']?.headsets === 'not_collected' ? 'Not Collected' : 'None'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Usb className="h-3 w-3" />
                          <span>{bookingsByUser[selectedAgent.id]?.['book_in']?.dongle === 'collected' ? 'Collected' : bookingsByUser[selectedAgent.id]?.['book_in']?.dongle === 'not_collected' ? 'Not Collected' : 'None'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedAgent && (
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Book Out - {getCurrentDateKey()}</div>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Laptop className="h-3 w-3" />
                          <span>{bookingsByUser[selectedAgent.id]?.['book_out']?.laptop === 'returned' ? 'Returned' : bookingsByUser[selectedAgent.id]?.['book_out']?.laptop === 'not_returned' ? 'Not Returned' : 'None'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Headphones className="h-3 w-3" />
                          <span>{bookingsByUser[selectedAgent.id]?.['book_out']?.headsets === 'returned' ? 'Returned' : bookingsByUser[selectedAgent.id]?.['book_out']?.headsets === 'not_returned' ? 'Not Returned' : 'None'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Usb className="h-3 w-3" />
                          <span>{bookingsByUser[selectedAgent.id]?.['book_out']?.dongle === 'returned' ? 'Returned' : bookingsByUser[selectedAgent.id]?.['book_out']?.dongle === 'not_returned' ? 'Not Returned' : 'None'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Historical Data would go here */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Historical Records</h4>
                <div className="text-sm text-muted-foreground">
                  Historical booking records will be displayed here once available from the database.
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBookingHistoryDialog(false)}
              data-testid="button-close-booking-history"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Details Management Dialog */}
      <Dialog open={showAssetDetailsDialog} onOpenChange={(open) => {
        setShowAssetDetailsDialog(open);
        if (!open) {
          setSelectedAssetForDetails(null);
        }
      }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-asset-details">Asset Details Management</DialogTitle>
            <DialogDescription>
              View and manage detailed asset information including serial numbers, models, and conditions
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto">
            <div className="space-y-6">
              {/* Asset Type Tabs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Laptop className="h-5 w-5" />
                    <h4 className="font-medium">Laptop</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <label className="text-muted-foreground">Asset ID:</label>
                      <div className="font-medium">{selectedUserAssetDetails?.find((asset: any) => asset.assetType === 'laptop')?.assetId || 'Not assigned'}</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Serial Number:</label>
                      <div className="font-medium">DL5420-ABC123</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Model & Brand:</label>
                      <div className="font-medium">Dell Latitude 5420</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Accessories:</label>
                      <div className="font-medium">Charger, Laptop Bag</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Condition:</label>
                      <div className="font-medium text-green-600">Good</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Headphones className="h-5 w-5" />
                    <h4 className="font-medium">Headset</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <label className="text-muted-foreground">Asset ID:</label>
                      <div className="font-medium">HS-001</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Serial Number:</label>
                      <div className="font-medium">LGT-H390-XYZ789</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Model & Brand:</label>
                      <div className="font-medium">Logitech H390</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Accessories:</label>
                      <div className="font-medium">USB Cable</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Condition:</label>
                      <div className="font-medium text-green-600">Good</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Usb className="h-5 w-5" />
                    <h4 className="font-medium">Dongle</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <label className="text-muted-foreground">Asset ID:</label>
                      <div className="font-medium">DG-001</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Serial Number:</label>
                      <div className="font-medium">HW-USBC-DEF456</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Model & Brand:</label>
                      <div className="font-medium">Huawei USB-C Dongle</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Accessories:</label>
                      <div className="font-medium">None</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Condition:</label>
                      <div className="font-medium text-green-600">Good</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Note: This is placeholder data. In the full implementation, asset details would be stored in the database and editable through forms.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAssetDetailsDialog(false)}
              data-testid="button-close-asset-details"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                // TODO: Implement edit functionality
                console.log('Edit asset details for agent:', selectedAssetForDetails?.userId);
                alert('Edit functionality will be implemented with backend database support. For now, this shows the planned structure.');
              }}
              data-testid="button-edit-asset-details"
            >
              Edit Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost Asset Confirmation Dialog */}
      <Dialog open={showLostAssetDialog} onOpenChange={setShowLostAssetDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Asset Status Confirmation</DialogTitle>
            <DialogDescription>
              Was this {pendingAssetAction?.assetType} asset lost or just not returned by {pendingAssetAction?.agentName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="destructive"
              onClick={() => handleLostAssetResponse(true)}
              data-testid="button-asset-lost"
            >
              Asset was Lost
            </Button>
            <Button
              variant="outline"
              onClick={() => handleLostAssetResponse(false)}
              data-testid="button-not-returned"
            >
              Just Not Returned
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowLostAssetDialog(false);
                setPendingAssetAction(null);
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      </div>
    </TooltipProvider>
  );
}