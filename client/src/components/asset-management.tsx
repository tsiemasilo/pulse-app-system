import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Laptop, Headphones, Usb, Check, X, Save, Loader2, Eye, Settings, Calendar, BarChart3, MessageCircle, FileText } from "lucide-react";
import type { User, Asset, AssetBooking, AssetDetails, InsertAssetBooking, InsertAssetDetails } from "@shared/schema";

interface AssetManagementProps {
  userId?: string;
  showActions?: boolean;
}

// Using AssetBooking and AssetDetails types from shared schema

export default function AssetManagement({ userId, showActions = false }: AssetManagementProps) {
  const [activeTab, setActiveTab] = useState('book_in');
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

  // Helper function to get previous day's date
  const getPreviousDayKey = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
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
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showReasonViewDialog, setShowReasonViewDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  const [recoveryReasonInput, setRecoveryReasonInput] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [isViewingLostAsset, setIsViewingLostAsset] = useState(false);
  const [pendingAssetAction, setPendingAssetAction] = useState<{
    userId: string;
    assetType: string;
    agentName: string;
    isLost?: boolean; // Track whether "lost" or "just not returned" was selected
  } | null>(null);
  const [pendingRecoveryAction, setPendingRecoveryAction] = useState<{
    userId: string;
    assetType: string;
    agentName: string;
    id?: string; // Include ID to identify previous day assets
  } | null>(null);
  
  // Fetch today's booking data for all users
  const { data: todayBookings = [], isLoading: bookingsLoading } = useQuery<AssetBooking[]>({
    queryKey: [`/api/asset-bookings/date/${getCurrentDateKey()}`],
  });

  // Fetch previous day's booking data to check for unreturned assets
  const { data: previousDayBookings = [] } = useQuery<AssetBooking[]>({
    queryKey: [`/api/asset-bookings/date/${getPreviousDayKey()}`],
  });

  // Fetch current user for role checking
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });

  // Only fetch all unreturned assets for management roles (for the Unreturned Assets tab)
  const { data: unreturnedAssets = [], isLoading: lossRecordsLoading } = useQuery<any[]>({
    queryKey: ['/api/unreturned-assets'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/unreturned-assets`);
      return response.json();
    },
    enabled: ['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(currentUser?.role),
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

  // Fetch today's asset loss records for live status checking
  const { data: assetLossRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/asset-loss', getCurrentDateKey()],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/asset-loss?date=${getCurrentDateKey()}`);
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
      lostAssets: unreturnedAssets.filter((record: any) => record.userId === userId && record.status === 'Lost')
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
      if (bookOutStatus === 'returned') return { status: 'Returned to Team Leader', color: 'bg-green-100 text-green-800' };
      if (bookInStatus === 'not_collected') return { status: 'Not Collected', color: 'bg-yellow-100 text-yellow-800' };
      if (bookInStatus === 'collected') return { status: 'Collected from Team Leader', color: 'bg-green-100 text-green-800' };
      
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

  // Transform previous day's booking data
  const previousDayBookingsByUser = previousDayBookings.reduce((acc, booking) => {
    if (!acc[booking.userId]) acc[booking.userId] = {};
    acc[booking.userId][booking.bookingType] = booking;
    return acc;
  }, {} as Record<string, Record<string, AssetBooking>>);

  // Function to check if an asset is unreturned from the previous day
  const isAssetUnreturnedFromPreviousDay = (agentId: string, assetType: 'laptop' | 'headsets' | 'dongle') => {
    const previousBooking = previousDayBookingsByUser[agentId];
    if (!previousBooking) return false;
    
    const bookInStatus = previousBooking['book_in']?.[assetType] || 'none';
    const bookOutStatus = previousBooking['book_out']?.[assetType] || 'none';
    
    // If asset was collected yesterday but not returned or marked as not returned
    return bookInStatus === 'collected' && (bookOutStatus === 'none' || bookOutStatus === 'not_returned');
  };

  // Function to get all unreturned assets (both lost and not returned)
  const getUnreturnedAssets = () => {
    // Get existing unreturned assets from API
    const existingUnreturnedAssets = unreturnedAssets.map((asset: any) => ({
      ...asset,
      statusColor: asset.status === 'Lost' 
        ? 'bg-red-100 text-red-800' 
        : 'bg-orange-100 text-orange-800'
    }));
    
    // Get unreturned assets from previous day
    const previousDayUnreturnedAssets: any[] = [];
    Object.keys(previousDayBookingsByUser).forEach(userId => {
      const previousBooking = previousDayBookingsByUser[userId];
      const bookInRecord = previousBooking['book_in'];
      const bookOutRecord = previousBooking['book_out'];
      
      if (!bookInRecord) return;
      
      const assetTypes: ('laptop' | 'headsets' | 'dongle')[] = ['laptop', 'headsets', 'dongle'];
      const agentName = getAgentName(userId);
      
      assetTypes.forEach(assetType => {
        const bookInStatus = bookInRecord[assetType] || 'none';
        const bookOutStatus = bookOutRecord?.[assetType] || 'none';
        
        // If asset was collected but not returned from previous day
        if (bookInStatus === 'collected' && (bookOutStatus === 'none' || bookOutStatus === 'not_returned')) {
          // Check if this asset isn't already in the existing unreturned assets
          const alreadyExists = existingUnreturnedAssets.some(existing => 
            existing.userId === userId && existing.assetType === assetType
          );
          
          if (!alreadyExists) {
            previousDayUnreturnedAssets.push({
              id: `prev-day-${userId}-${assetType}`,
              userId,
              agentName,
              assetType,
              status: 'Unreturned from Previous Day',
              statusColor: 'bg-orange-100 text-orange-800',
              dateLost: getPreviousDayKey(),
              reason: 'Asset was collected but not returned from previous day'
            });
          }
        }
      });
    });
    
    // Combine both lists and sort
    return [...existingUnreturnedAssets, ...previousDayUnreturnedAssets]
      .sort((a: any, b: any) => a.agentName.localeCompare(b.agentName));
  };

  // Mutation to create/update asset bookings
  const updateAssetBookingMutation = useMutation({
    mutationFn: async (booking: InsertAssetBooking) => {
      return await apiRequest('POST', '/api/asset-bookings', booking);
    },
    onSuccess: () => {
      // Comprehensive cache invalidation to ensure all UI components update immediately
      
      // 1. Invalidate all asset booking queries (broad match)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/asset-bookings');
        }
      });
      
      // 2. Invalidate all unreturned asset queries (including per-user queries)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/unreturned-assets');
        }
      });
      
      // 3. Invalidate all asset loss queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/asset-loss');
        }
      });
      
      // 4. Invalidate historical records
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/historical-asset-records');
        }
      });
      
      // 5. Force refetch of today's specific queries that the UI depends on
      queryClient.invalidateQueries({ 
        queryKey: [`/api/asset-bookings/date/${getCurrentDateKey()}`]
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/asset-loss', getCurrentDateKey()]
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
      // Comprehensive cache invalidation for asset loss records
      
      // 1. Invalidate all asset loss queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/asset-loss');
        }
      });
      
      // 2. Invalidate all unreturned asset queries (including per-user queries)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/unreturned-assets');
        }
      });
      
      // 3. Invalidate historical records
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/historical-asset-records');
        }
      });
      
      // 4. Force refetch of today's specific queries that the UI depends on
      queryClient.invalidateQueries({ 
        queryKey: ['/api/asset-loss', getCurrentDateKey()]
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
      // Comprehensive cache invalidation for asset loss record deletion
      
      // 1. Invalidate all asset loss queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/asset-loss');
        }
      });
      
      // 2. Invalidate all unreturned asset queries (including per-user queries)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/unreturned-assets');
        }
      });
      
      // 3. Invalidate historical records
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return queryKey?.startsWith('/api/historical-asset-records');
        }
      });
      
      // 4. Force refetch of today's specific queries that the UI depends on
      queryClient.invalidateQueries({ 
        queryKey: ['/api/asset-loss', getCurrentDateKey()]
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

  // Function to get live asset status for book in/out tabs (uses today's data)
  const getLiveAssetStatus = (agentId: string, assetType: 'laptop' | 'headsets' | 'dongle') => {
    // Get today's booking data for this agent
    const booking = bookingsByUser[agentId];
    const bookInStatus = booking?.['book_in']?.[assetType] || 'none';
    const bookOutStatus = booking?.['book_out']?.[assetType] || 'none';
    
    // Check if asset is lost today (use today's loss records, not selected date)
    const isLostToday = assetLossRecords.some(asset => 
      asset.userId === agentId && asset.assetType === assetType
    );
    
    // Check if asset is unreturned from previous day
    const isUnreturnedFromPreviousDay = isAssetUnreturnedFromPreviousDay(agentId, assetType);
    
    // Apply status precedence with book in status taking priority over book out 'returned' status
    if (isLostToday) {
      return { status: 'Lost', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (isUnreturnedFromPreviousDay) {
      return { status: 'Unreturned from Previous Day', variant: 'destructive' as const, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' };
    }
    
    // Book in status takes priority over book out 'returned' status (more recent action)
    if (bookInStatus === 'collected') {
      return { status: 'Collected from Team Leader', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
    }
    
    if (bookInStatus === 'not_collected') {
      return { status: 'Not Collected', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
    }
    
    // Book out 'not_returned' still takes priority over 'returned' status  
    if (bookOutStatus === 'not_returned') {
      return { status: 'Not Returned', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (bookOutStatus === 'returned') {
      return { status: 'Returned to Team Leader', variant: 'secondary' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    }
    
    return { status: 'Not Collected', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
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
    
    // Apply status precedence (book out selections override book in selections)
    if (isLostOnSelectedDate) {
      return { status: 'Lost', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (bookOutStatus === 'returned') {
      return { status: 'Returned to Team Leader', variant: 'secondary' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    }
    
    if (bookOutStatus === 'not_returned') {
      return { status: 'Not Returned', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (bookInStatus === 'collected') {
      return { status: 'Collected from Team Leader', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
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

  const updateAssetBookingBookIn = async (userId: string, assetType: string, status: 'none' | 'collected' | 'not_collected') => {
    // Check if asset is unreturned from previous day - prevent booking in
    if (isAssetUnreturnedFromPreviousDay(userId, assetType as 'laptop' | 'headsets' | 'dongle')) {
      toast({
        title: "Asset Unavailable",
        description: `This ${assetType} was not returned yesterday and cannot be booked in today.`,
        variant: "destructive",
      });
      return;
    }
    
    const agentName = getAgentName(userId);
    
    // Only delete lost asset record if one exists for this user/asset/date and we're marking as collected
    const hasLostRecord = (assetLossRecords as any[]).some((record: any) => 
      record.userId === userId && record.assetType === assetType
    );
    
    if (hasLostRecord && status === 'collected') {
      await deleteAssetLossMutation.mutateAsync({
        userId,
        assetType,
        date: getCurrentDateKey()
      });
    }
    
    // Get current booking data for both book_in and book_out
    const currentBookInBooking = bookingsByUser[userId]?.['book_in'];
    const currentBookOutBooking = bookingsByUser[userId]?.['book_out'];
    
    // MUTUAL EXCLUSIVITY: If setting book_in status (not 'none'), clear book_out status for this asset
    let bookOutUpdate = null;
    if (status !== 'none') {
      const currentBookOutStatus = currentBookOutBooking?.[assetType as keyof AssetBooking] || 'none';
      if (currentBookOutStatus !== 'none') {
        // Clear the book_out status for this asset
        bookOutUpdate = {
          userId,
          date: getCurrentDateKey(),
          bookingType: 'book_out' as const,
          laptop: assetType === 'laptop' ? 'none' : (currentBookOutBooking?.laptop || 'none'),
          headsets: assetType === 'headsets' ? 'none' : (currentBookOutBooking?.headsets || 'none'),
          dongle: assetType === 'dongle' ? 'none' : (currentBookOutBooking?.dongle || 'none'),
          agentName,
        };
      }
    }
    
    // Update book_in booking
    const bookingData: InsertAssetBooking = {
      userId,
      date: getCurrentDateKey(),
      bookingType: 'book_in',
      laptop: assetType === 'laptop' ? status : (currentBookInBooking?.laptop || 'none'),
      headsets: assetType === 'headsets' ? status : (currentBookInBooking?.headsets || 'none'),
      dongle: assetType === 'dongle' ? status : (currentBookInBooking?.dongle || 'none'),
      agentName,
    };
    
    // Execute both updates if needed
    const promises = [updateAssetBookingMutation.mutateAsync(bookingData)];
    if (bookOutUpdate) {
      promises.push(updateAssetBookingMutation.mutateAsync(bookOutUpdate));
    }
    
    await Promise.all(promises);
    
    const statusText = status === 'collected' ? 'collected' : status === 'not_collected' ? 'not collected' : 'unmarked';
    toast({
      title: "Asset Updated",
      description: `${assetType} marked as ${statusText} for ${agentName}`,
    });
  };

  // Function to handle lost asset dialog responses
  const handleLostAssetResponse = (isLost: boolean) => {
    if (!pendingAssetAction) return;
    
    // Store whether this was marked as lost or just not returned
    setPendingAssetAction({ ...pendingAssetAction, isLost });
    
    // Both "lost" and "just not returned" now ask for a reason
    setShowLostAssetDialog(false);
    setShowReasonDialog(true);
    setReasonInput('');
  };

  // Function to handle reason submission
  const handleReasonSubmit = () => {
    if (!pendingAssetAction || !reasonInput.trim()) return;
    
    const { userId, assetType, agentName, isLost } = pendingAssetAction;
    
    if (isLost) {
      // Asset was marked as lost - create asset loss record with reason
      createAssetLossMutation.mutate({
        userId,
        assetType,
        reason: reasonInput.trim(),
        dateLost: new Date()
      });
      
      toast({
        title: "Asset Marked as Lost",
        description: `${assetType} marked as lost for ${agentName}`,
      });
    } else {
      // Asset was marked as just not returned - save reason in booking record
      toast({
        title: "Asset Not Returned",
        description: `${assetType} marked as not returned for ${agentName}`,
      });
    }
    
    // Update the booking status to not_returned for both cases, including reason for unreturned assets
    updateAssetBookingBookOutDirectWithReason(userId, assetType, 'not_returned', isLost ? null : reasonInput.trim());
    
    // Close dialogs and clear state
    setShowReasonDialog(false);
    setPendingAssetAction(null);
    setReasonInput('');
  };

  // Function to view reason for lost/unreturned asset
  const handleViewReason = (userId: string, assetType: string) => {
    const lossRecord = (assetLossRecords as any[]).find(
      (record: any) => record.userId === userId && record.assetType === assetType
    );
    
    // Determine if this is a lost asset or just unreturned
    const isLost = !!lossRecord;
    setIsViewingLostAsset(isLost);
    
    let reason: string;
    
    if (isLost) {
      // Asset is lost - get reason from loss record
      reason = lossRecord.reason;
    } else {
      // Asset is just unreturned - get reason from booking record
      const booking = bookingsByUser[userId]?.['book_out'];
      if (booking) {
        const reasonField = assetType === 'laptop' ? 'laptopReason' : 
                           assetType === 'headsets' ? 'headsetsReason' : 
                           'dongleReason';
        reason = booking[reasonField] || "No reason provided yet for this unreturned asset.";
      } else {
        reason = "No reason provided yet for this unreturned asset.";
      }
    }
    
    setSelectedReason(reason);
    setShowReasonViewDialog(true);
  };

  // Function to handle asset recovery confirmation
  const handleRecoveryConfirmation = () => {
    if (!pendingRecoveryAction || !recoveryReasonInput.trim()) {
      toast({
        title: "Recovery Reason Required",
        description: "Please provide a reason for how the asset was recovered.",
        variant: "destructive",
      });
      return;
    }

    // Check if this is an "Unreturned from Previous Day" asset
    const isUnreturnedFromPreviousDay = pendingRecoveryAction.id?.startsWith('prev-day-');
    
    if (isUnreturnedFromPreviousDay) {
      // For previous day unreturned assets, update the previous day's booking record
      updatePreviousDayAssetBooking(pendingRecoveryAction.userId, pendingRecoveryAction.assetType, 'returned', recoveryReasonInput.trim());
    } else {
      // For current unreturned assets, use existing logic
      updateAssetBookingBookOutDirect(pendingRecoveryAction.userId, pendingRecoveryAction.assetType, 'returned');
    }
    
    // Show success message with recovery reason
    toast({
      title: "Asset Recovered",
      description: `${pendingRecoveryAction.assetType} recovered from ${pendingRecoveryAction.agentName}. Reason: ${recoveryReasonInput}`,
    });

    // Reset states
    setShowRecoveryDialog(false);
    setPendingRecoveryAction(null);
    setRecoveryReasonInput('');
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

  const updateAssetBookingBookOutDirect = async (userId: string, assetType: string, status: 'none' | 'returned' | 'not_returned') => {
    await updateAssetBookingBookOutDirectWithReason(userId, assetType, status, null);
  };

  // Function to update previous day's booking record for unreturned assets
  const updatePreviousDayAssetBooking = async (userId: string, assetType: string, status: 'returned', reason: string) => {
    const agentName = getAgentName(userId);
    const previousDayKey = getPreviousDayKey();
    
    try {
      // Get the previous day's booking record
      const previousDayBooking = previousDayBookingsByUser[userId]?.['book_out'];
      
      if (!previousDayBooking) {
        // If no book_out record exists for previous day, create one
        const newBooking: InsertAssetBooking = {
          userId,
          date: previousDayKey,
          bookingType: 'book_out',
          laptop: assetType === 'laptop' ? status : 'none',
          headsets: assetType === 'headsets' ? status : 'none',
          dongle: assetType === 'dongle' ? status : 'none',
          laptopReason: assetType === 'laptop' ? reason : null,
          headsetsReason: assetType === 'headsets' ? reason : null,
          dongleReason: assetType === 'dongle' ? reason : null,
        };
        
        await updateAssetBookingMutation.mutateAsync(newBooking);
      } else {
        // Update existing book_out record
        const updatedBooking: InsertAssetBooking = {
          ...previousDayBooking,
          [assetType]: status,
          [`${assetType}Reason`]: reason,
        };
        
        await updateAssetBookingMutation.mutateAsync(updatedBooking);
      }
      
      toast({
        title: "Previous Day Asset Updated",
        description: `${assetType} for ${agentName} marked as returned to team leader for ${previousDayKey}`,
      });
      
    } catch (error) {
      console.error('Failed to update previous day booking:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update previous day asset record. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateAssetBookingBookOutDirectWithReason = async (userId: string, assetType: string, status: 'none' | 'returned' | 'not_returned', reason: string | null) => {
    const agentName = getAgentName(userId);
    
    // Only delete lost asset record if one exists for this user/asset/date and we're marking as returned
    const hasLostRecord = (assetLossRecords as any[]).some((record: any) => 
      record.userId === userId && record.assetType === assetType
    );
    
    if (hasLostRecord && status === 'returned') {
      await deleteAssetLossMutation.mutateAsync({
        userId,
        assetType,
        date: getCurrentDateKey()
      });
    }
    
    // Get current booking data for both book_in and book_out
    const currentBookOutBooking = bookingsByUser[userId]?.['book_out'];
    const currentBookInBooking = bookingsByUser[userId]?.['book_in'];
    
    // MUTUAL EXCLUSIVITY: If setting book_out status (not 'none'), clear book_in status for this asset
    let bookInUpdate = null;
    if (status !== 'none') {
      const currentBookInStatus = currentBookInBooking?.[assetType as keyof AssetBooking] || 'none';
      if (currentBookInStatus !== 'none') {
        // Clear the book_in status for this asset
        bookInUpdate = {
          userId,
          date: getCurrentDateKey(),
          bookingType: 'book_in' as const,
          laptop: assetType === 'laptop' ? 'none' : (currentBookInBooking?.laptop || 'none'),
          headsets: assetType === 'headsets' ? 'none' : (currentBookInBooking?.headsets || 'none'),
          dongle: assetType === 'dongle' ? 'none' : (currentBookInBooking?.dongle || 'none'),
          agentName,
        };
      }
    }
    
    // Update book_out booking
    const bookingData: InsertAssetBooking = {
      userId,
      date: getCurrentDateKey(),
      bookingType: 'book_out',
      laptop: assetType === 'laptop' ? status : (currentBookOutBooking?.laptop || 'none'),
      headsets: assetType === 'headsets' ? status : (currentBookOutBooking?.headsets || 'none'),
      dongle: assetType === 'dongle' ? status : (currentBookOutBooking?.dongle || 'none'),
      laptopReason: assetType === 'laptop' && status === 'not_returned' ? reason : (currentBookOutBooking?.laptopReason || null),
      headsetsReason: assetType === 'headsets' && status === 'not_returned' ? reason : (currentBookOutBooking?.headsetsReason || null),
      dongleReason: assetType === 'dongle' && status === 'not_returned' ? reason : (currentBookOutBooking?.dongleReason || null),
      agentName,
    };
    
    // Execute both updates if needed
    const promises = [updateAssetBookingMutation.mutateAsync(bookingData)];
    if (bookInUpdate) {
      promises.push(updateAssetBookingMutation.mutateAsync(bookInUpdate));
    }
    
    await Promise.all(promises);
    
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

  // Function to get badge display based on current button selection state
  const getBadgeStatusFromSelection = (
    status: 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected',
    tabType: 'book_in' | 'book_out',
    assetStatus: { status: string; variant: any; color: string }
  ) => {
    // Always use the actual asset status for consistency across tabs
    // This ensures the same asset shows the same badge regardless of which tab you're viewing
    return {
      text: assetStatus.status,
      variant: assetStatus.variant,
      color: assetStatus.color
    };
  };

  const AssetStatusButtons = ({ status, onStatusChange, assetType, agentId, tabType }: {
    status: 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected';
    onStatusChange: (newStatus: 'none' | 'returned' | 'not_returned' | 'collected' | 'not_collected') => void;
    assetType: string;
    agentId: string;
    tabType: 'book_in' | 'book_out';
  }) => {
    const positiveStatus = tabType === 'book_in' ? 'collected' : 'returned';
    const negativeStatus = tabType === 'book_in' ? 'not_collected' : 'not_returned';
    
    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
      message: string;
      title: string;
      action: () => void;
      actionType: 'positive' | 'negative';
    } | null>(null);
    
    // Get the live asset status for this agent and asset type (for checking unavailability)
    const assetStatus = getLiveAssetStatus(agentId, assetType as 'laptop' | 'headsets' | 'dongle');
    
    // Disable buttons only for this specific asset if:
    // 1. This specific asset is lost or not returned, OR
    // 2. For book_in: this specific asset is already collected, OR
    // 3. This specific asset is unreturned from previous day
    const isAssetUnavailable = (assetStatus.status === 'Lost' || assetStatus.status === 'Not Returned') ||
                              (tabType === 'book_in' && assetStatus.status === 'Collected from Team Leader') ||
                              assetStatus.status === 'Unreturned from Previous Day';
    
    // Get badge status based on current button selection state
    const badgeStatus = getBadgeStatusFromSelection(status, tabType, assetStatus);
    
    const handlePositiveClick = () => {
      if (isAssetUnavailable) return;
      
      const agentName = getAgentName(agentId);
      const assetDisplayName = assetType.charAt(0).toUpperCase() + assetType.slice(1);
      
      // If already positive, ask to confirm deselection, otherwise confirm selection
      if (status === positiveStatus) {
        const confirmMessage = tabType === 'book_in' 
          ? `Are you sure you want to clear the collection status for ${agentName}'s ${assetDisplayName}?`
          : `Are you sure you want to clear the return status for ${agentName}'s ${assetDisplayName}?`;
        
        setConfirmAction({
          title: 'Clear Status',
          message: confirmMessage,
          action: () => onStatusChange('none'),
          actionType: 'positive'
        });
        setShowConfirmDialog(true);
      } else {
        const confirmMessage = tabType === 'book_in'
          ? `Are you sure you want to mark ${agentName}'s ${assetDisplayName} as COLLECTED from Team Leader?`
          : `Are you sure you want to mark ${agentName}'s ${assetDisplayName} as RETURNED to Team Leader?`;
        
        setConfirmAction({
          title: tabType === 'book_in' ? 'Confirm Collection' : 'Confirm Return',
          message: confirmMessage,
          action: () => onStatusChange(positiveStatus),
          actionType: 'positive'
        });
        setShowConfirmDialog(true);
      }
    };
    
    const handleNegativeClick = () => {
      if (isAssetUnavailable) return;
      
      const agentName = getAgentName(agentId);
      const assetDisplayName = assetType.charAt(0).toUpperCase() + assetType.slice(1);
      
      // If already negative, ask to confirm deselection, otherwise confirm selection
      if (status === negativeStatus) {
        const confirmMessage = tabType === 'book_in'
          ? `Are you sure you want to clear the "Not Collected" status for ${agentName}'s ${assetDisplayName}?`
          : `Are you sure you want to clear the "Not Returned" status for ${agentName}'s ${assetDisplayName}?`;
        
        setConfirmAction({
          title: 'Clear Status',
          message: confirmMessage,
          action: () => onStatusChange('none'),
          actionType: 'negative'
        });
        setShowConfirmDialog(true);
      } else {
        const confirmMessage = tabType === 'book_in'
          ? `Are you sure you want to mark ${agentName}'s ${assetDisplayName} as NOT COLLECTED?`
          : `Are you sure you want to mark ${agentName}'s ${assetDisplayName} as NOT RETURNED?`;
        
        setConfirmAction({
          title: tabType === 'book_in' ? 'Mark as Not Collected' : 'Mark as Not Returned',
          message: confirmMessage,
          action: () => onStatusChange(negativeStatus),
          actionType: 'negative'
        });
        setShowConfirmDialog(true);
      }
    };

    return (
      <div className="flex flex-col items-center gap-2">
        {/* Tick/Cross Buttons */}
        <div className="flex items-center gap-2">
          {/* Tick/Check Button */}
          <Button
            variant={status === positiveStatus ? "default" : "outline"}
            size="sm"
            onClick={handlePositiveClick}
            disabled={isAssetUnavailable}
            className={`h-8 w-8 p-0 ${
              isAssetUnavailable
                ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
                : status === positiveStatus 
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
            disabled={isAssetUnavailable}
            className={`h-8 w-8 p-0 ${
              isAssetUnavailable
                ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
                : status === negativeStatus 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700'
            }`}
            data-testid={`button-x-${assetType}-${agentId}-${tabType}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Status Badge - Now shows status based on button selection */}
        <Badge 
          variant={badgeStatus.variant} 
          className={`${badgeStatus.color} text-xs font-medium px-2 py-1 min-w-[80px] text-center`}
          data-testid={`badge-status-${assetType}-${agentId}-${tabType}`}
        >
          {badgeStatus.text}
        </Badge>
        
        {/* Beautiful Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {confirmAction?.actionType === 'positive' ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-600" />
                )}
                {confirmAction?.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left text-base">
                {confirmAction?.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel 
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className="hover:bg-gray-100"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmAction?.action) {
                    confirmAction.action();
                  }
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className={`${
                  confirmAction?.actionType === 'positive' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                <TabsTrigger value="book_in" data-testid="tab-book-in">
                  Book In
                </TabsTrigger>
                <TabsTrigger value="book_out" data-testid="tab-book-out">
                  Book Out
                </TabsTrigger>
                <TabsTrigger value="lost_assets" data-testid="tab-unreturned-assets">
                  Unreturned Assets
                </TabsTrigger>
              </TabsList>
              
              {(activeTab === 'book_in' || activeTab === 'book_out') && isAutoSaving && hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="auto-save-indicator">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Auto-saving...
                </div>
              )}
            </div>
            
            <TabsContent value="book_in" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-800 dark:text-green-200">Book In Assets</h3>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      Mark which assets each agent has collected for their shift
                    </p>
                  </div>
                </div>
                <BookInTable />
              </div>
            </TabsContent>
            
            <TabsContent value="book_out" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <X className="h-5 w-5 text-orange-600" />
                  <div>
                    <h3 className="font-medium text-orange-800 dark:text-orange-200">Book Out Assets</h3>
                    <p className="text-sm text-orange-600 dark:text-orange-300">
                      Mark which assets each agent has returned after their shift
                    </p>
                  </div>
                </div>
                <BookOutTable />
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
                            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Actions
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
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // Show recovery dialog instead of directly marking as returned
                                          setPendingRecoveryAction({
                                            userId: asset.userId,
                                            assetType: asset.assetType,
                                            agentName: asset.agentName,
                                            id: asset.id // Include the asset ID to identify previous day assets
                                          });
                                          setShowRecoveryDialog(true);
                                        }}
                                        className="h-8 w-8 p-0"
                                        data-testid={`button-mark-returned-${index}`}
                                      >
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Mark as returned</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  {/* View reason button - show for all unreturned assets */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewReason(asset.userId, asset.assetType)}
                                        className="h-8 w-8 p-0"
                                        data-testid={`button-view-reason-${index}`}
                                      >
                                        <MessageCircle className="h-4 w-4 text-blue-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View reason</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => showAssetDetails(asset.assetType, asset.userId)}
                                        className="h-8 w-8 p-0"
                                        data-testid={`button-asset-details-${index}`}
                                      >
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View asset details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
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

      {/* Reason Input Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Provide Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason for this {pendingAssetAction?.assetType} issue with {pendingAssetAction?.agentName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter the reason for this asset issue..."
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-loss-reason"
            />
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowReasonDialog(false);
                setPendingAssetAction(null);
                setReasonInput('');
              }}
              data-testid="button-cancel-reason"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReasonSubmit}
              disabled={!reasonInput.trim()}
              data-testid="button-submit-reason"
            >
              Submit Reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason View Dialog */}
      <Dialog open={showReasonViewDialog} onOpenChange={setShowReasonViewDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isViewingLostAsset ? "Asset Loss Reason" : "Unreturned Asset Reason"}
            </DialogTitle>
            <DialogDescription>
              {isViewingLostAsset 
                ? "Reason provided for the lost asset." 
                : "Reason provided for why the asset was not returned."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-foreground" data-testid="text-displayed-reason">
                {selectedReason}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReasonViewDialog(false);
                setSelectedReason('');
                setIsViewingLostAsset(false);
              }}
              data-testid="button-close-reason-view"
            >
              Close
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

      {/* Asset Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Asset Recovery Confirmation</DialogTitle>
            <DialogDescription>
              How was this {pendingRecoveryAction?.assetType} asset recovered from {pendingRecoveryAction?.agentName}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Please describe how the asset was recovered (e.g., returned by agent, found in office, etc.)"
              value={recoveryReasonInput}
              onChange={(e) => setRecoveryReasonInput(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-recovery-reason"
            />
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="default"
              onClick={handleRecoveryConfirmation}
              data-testid="button-confirm-recovery"
            >
              Mark as Returned
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowRecoveryDialog(false);
                setPendingRecoveryAction(null);
                setRecoveryReasonInput('');
              }}
              data-testid="button-cancel-recovery"
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