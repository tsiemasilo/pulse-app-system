import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Laptop, Headphones, Usb, Check, X, Eye, AlertTriangle, RotateCcw } from "lucide-react";
import type { User, AssetDailyState } from "@shared/schema";

interface AssetManagementProps {
  userId?: string;
  showActions?: boolean;
}

// Asset type configuration
const ASSET_TYPES = [
  { id: 'laptop', name: 'Laptop', icon: Laptop },
  { id: 'headsets', name: 'Headsets', icon: Headphones },
  { id: 'dongle', name: 'Dongle', icon: Usb },
] as const;

type AssetType = typeof ASSET_TYPES[number]['id'];

// State configuration with colors and labels
const STATE_CONFIG = {
  ready_for_collection: { 
    label: 'Ready for Collection', 
    color: 'bg-blue-100 text-blue-800',
    description: 'Asset is available for collection'
  },
  collected: { 
    label: 'Collected from Team Leader', 
    color: 'bg-green-100 text-green-800',
    description: 'Asset has been collected'
  },
  not_collected: { 
    label: 'Not Collected from Team Leader', 
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Asset was not collected'
  },
  returned: { 
    label: 'Returned to Team Leader', 
    color: 'bg-green-100 text-green-800',
    description: 'Asset has been returned'
  },
  not_returned: { 
    label: 'Not Returned', 
    color: 'bg-orange-100 text-orange-800',
    description: 'Asset was not returned'
  },
  lost: { 
    label: 'Lost', 
    color: 'bg-red-100 text-red-800',
    description: 'Asset is lost'
  },
} as const;

export default function AssetManagement({ userId, showActions = false }: AssetManagementProps) {
  const [activeTab, setActiveTab] = useState('book_in');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [showBookInConfirm, setShowBookInConfirm] = useState(false);
  const [showBookOutConfirm, setShowBookOutConfirm] = useState(false);
  const [showBookOutStatusDialog, setShowBookOutStatusDialog] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showViewReasonDialog, setShowViewReasonDialog] = useState(false);
  const [showMarkFoundDialog, setShowMarkFoundDialog] = useState(false);

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

  // Helper function to get current date
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Fetch current user for role checking
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // For user-specific view (agents seeing their own assets)
  if (userId) {
    const { data: userAssets = [] } = useQuery<any[]>({
      queryKey: [`/api/assets/user/${userId}`],
    });

    const { data: userDailyStates = [] } = useQuery<AssetDailyState[]>({
      queryKey: [`/api/assets/daily-states/user/${userId}/date/${getCurrentDate()}`],
    });

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
        'usb dongle': 'dongle'
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

  // For team leaders - fetch team members
  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.role === 'agent'),
  });

  // Fetch daily states for all team members
  const { data: allDailyStates = [], isLoading: dailyStatesLoading } = useQuery<AssetDailyState[]>({
    queryKey: [`/api/assets/daily-states/${getCurrentDate()}`],
  });

  // Fetch unreturned assets
  const { data: unreturnedAssets = [], isLoading: unreturnedLoading } = useQuery<any[]>({
    queryKey: ['/api/unreturned-assets'],
    enabled: ['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(currentUser?.role || ''),
  });

  // Transform daily states by user and asset type for easier lookup
  const statesByUserAndAsset = allDailyStates.reduce((acc, state) => {
    if (!acc[state.userId]) acc[state.userId] = {};
    acc[state.userId][state.assetType] = state;
    return acc;
  }, {} as Record<string, Record<string, AssetDailyState>>);

  // Book in mutation
  const bookInMutation = useMutation({
    mutationFn: async (data: { userId: string; assetType: string; date: string; status: string; reason?: string }) => {
      return await apiRequest('POST', '/api/assets/book-in', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${getCurrentDate()}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${getCurrentDate()}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/assets/daily-states/${getCurrentDate()}`] });
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
    const user = teamMembers.find(u => u.id === userId);
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
    if (!state) return false;
    
    // Disable if asset is in a final state (returned, not_returned, lost)
    return ['returned', 'not_returned', 'lost'].includes(state.currentState);
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
        title: "Cannot Book Out Asset",
        description: "Asset must be collected before it can be booked out.",
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

  if (dailyStatesLoading) {
    return <div className="text-center py-8">Loading asset states...</div>;
  }

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Asset Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="book_in" data-testid="tab-book-in">Book In</TabsTrigger>
              <TabsTrigger value="book_out" data-testid="tab-book-out">Book Out</TabsTrigger>
              <TabsTrigger value="unreturned" data-testid="tab-unreturned">Unreturned Assets</TabsTrigger>
            </TabsList>

            {/* Book In Tab */}
            <TabsContent value="book_in" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Confirm whether agents have collected their assets. Select ✓ for collected or ✗ for not collected.
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    {ASSET_TYPES.map(asset => (
                      <TableHead key={asset.id} className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <asset.icon className="w-4 h-4" />
                          <span>{asset.name}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">
                        {`${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username}
                      </TableCell>
                      {ASSET_TYPES.map(asset => {
                        const state = getAssetState(agent.id, asset.id);
                        const isDisabled = isAssetDisabled(agent.id, asset.id);
                        const hasState = state && ['collected', 'not_collected'].includes(state.currentState);
                        
                        return (
                          <TableCell key={asset.id} className="text-center">
                            {hasState ? (
                              <Badge 
                                className={STATE_CONFIG[state.currentState as keyof typeof STATE_CONFIG]?.color}
                                data-testid={`badge-${agent.id}-${asset.id}`}
                              >
                                {STATE_CONFIG[state.currentState as keyof typeof STATE_CONFIG]?.label}
                              </Badge>
                            ) : (
                              <div className="flex justify-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isDisabled}
                                  onClick={() => handleBookInClick(agent.id, asset.id, 'collected')}
                                  data-testid={`button-book-in-collected-${agent.id}-${asset.id}`}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isDisabled}
                                  onClick={() => handleBookInClick(agent.id, asset.id, 'not_collected')}
                                  data-testid={`button-book-in-not-collected-${agent.id}-${asset.id}`}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Book Out Tab */}
            <TabsContent value="book_out" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Confirm whether agents have returned their assets. Only assets that were collected can be booked out.
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    {ASSET_TYPES.map(asset => (
                      <TableHead key={asset.id} className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <asset.icon className="w-4 h-4" />
                          <span>{asset.name}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">
                        {`${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username}
                      </TableCell>
                      {ASSET_TYPES.map(asset => {
                        const state = getAssetState(agent.id, asset.id);
                        const canBook = canBookOut(agent.id, asset.id);
                        const isDisabled = isAssetDisabled(agent.id, asset.id);
                        const hasBookOutState = state && ['returned', 'not_returned', 'lost'].includes(state.currentState);
                        
                        return (
                          <TableCell key={asset.id} className="text-center">
                            {hasBookOutState ? (
                              <Badge 
                                className={STATE_CONFIG[state.currentState as keyof typeof STATE_CONFIG]?.color}
                                data-testid={`badge-book-out-${agent.id}-${asset.id}`}
                              >
                                {STATE_CONFIG[state.currentState as keyof typeof STATE_CONFIG]?.label}
                              </Badge>
                            ) : canBook ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBookOutClick(agent.id, asset.id)}
                                data-testid={`button-book-out-${agent.id}-${asset.id}`}
                              >
                                Book Out
                              </Button>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {state?.currentState === 'not_collected' ? 'Not Collected' : 'Not Available'}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Unreturned Assets Tab */}
            <TabsContent value="unreturned" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Assets that are lost or not returned. Use "Mark as Found" to restore assets to available status.
              </div>
              
              {unreturnedLoading ? (
                <div className="text-center py-8">Loading unreturned assets...</div>
              ) : unreturnedAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No unreturned assets found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Asset Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Lost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unreturnedAssets.map((asset, index) => (
                      <TableRow key={`${asset.userId}-${asset.assetType}-${index}`}>
                        <TableCell className="font-medium">
                          {asset.agentName || getAgentName(asset.userId)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const assetType = ASSET_TYPES.find(t => t.id === asset.assetType);
                              const IconComponent = assetType?.icon;
                              return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
                            })()}
                            <span className="capitalize">{asset.assetType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={asset.statusColor || 'bg-red-100 text-red-800'}>
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(asset.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Book In Confirmation Dialog */}
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

      {/* Book Out Status Selection Dialog */}
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

      {/* Book Out Confirmation Dialog */}
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
    </div>
  );
}