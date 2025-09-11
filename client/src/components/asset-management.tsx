import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Laptop, Headphones, Usb, Check, X, Save } from "lucide-react";
import type { User, Asset } from "@shared/schema";

interface AssetManagementProps {
  userId?: string;
  showActions?: boolean;
}

interface AssetBooking {
  agentId: string;
  agentName: string;
  laptop: 'none' | 'returned' | 'not_returned';
  headsets: 'none' | 'returned' | 'not_returned';
  dongle: 'none' | 'returned' | 'not_returned';
  date: string;
  type: 'book_in' | 'book_out';
}

interface AssetBookingBookIn {
  agentId: string;
  agentName: string;
  laptop: 'none' | 'collected' | 'not_collected';
  headsets: 'none' | 'collected' | 'not_collected';
  dongle: 'none' | 'collected' | 'not_collected';
  date: string;
  type: 'book_in';
}

export default function AssetManagement({ userId, showActions = false }: AssetManagementProps) {
  const [activeTab, setActiveTab] = useState('book_in');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Helper functions for localStorage persistence (moved to top)
  const getCurrentDateKey = () => new Date().toISOString().split('T')[0];
  
  const loadFromLocalStorage = () => {
    const currentDate = getCurrentDateKey();
    const bookInKey = `assetBookings_bookIn_${currentDate}`;
    const bookOutKey = `assetBookings_bookOut_${currentDate}`;
    const lostAssetsKey = `lostAssets_${currentDate}`;
    
    try {
      const bookInData = localStorage.getItem(bookInKey);
      const bookOutData = localStorage.getItem(bookOutKey);
      const lostAssetsData = localStorage.getItem(lostAssetsKey);
      
      return {
        bookIn: bookInData ? JSON.parse(bookInData) : {},
        bookOut: bookOutData ? JSON.parse(bookOutData) : {},
        lostAssets: lostAssetsData ? JSON.parse(lostAssetsData) : []
      };
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {
        bookIn: {},
        bookOut: {},
        lostAssets: []
      };
    }
  };
  
  const saveToLocalStorage = (bookIn: Record<string, AssetBookingBookIn>, bookOut: Record<string, AssetBooking>, lostAssetsData: any[]) => {
    const currentDate = getCurrentDateKey();
    const bookInKey = `assetBookings_bookIn_${currentDate}`;
    const bookOutKey = `assetBookings_bookOut_${currentDate}`;
    const lostAssetsKey = `lostAssets_${currentDate}`;
    
    try {
      localStorage.setItem(bookInKey, JSON.stringify(bookIn));
      localStorage.setItem(bookOutKey, JSON.stringify(bookOut));
      localStorage.setItem(lostAssetsKey, JSON.stringify(lostAssetsData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  // Load initial data from localStorage
  const initialData = loadFromLocalStorage();
  
  // Lost assets tracking with localStorage persistence
  const [lostAssets, setLostAssets] = useState<Array<{
    agentId: string;
    agentName: string;
    assetType: string;
    dateLost: string;
  }>>(initialData.lostAssets);


  // For user-specific view (agents seeing their own assets)
  if (userId) {
    const { data: userAssets = [], isLoading } = useQuery<Asset[]>({
      queryKey: ["/api/assets/user", userId],
    });

    if (isLoading) {
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

    return (
      <Card>
        <CardHeader>
          <CardTitle>My Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userAssets.map((asset) => (
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
                <Badge className="bg-blue-100 text-blue-800" data-testid={`badge-asset-status-${asset.id}`}>
                  {asset.status}
                </Badge>
              </div>
            ))}
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

  // Initialize booking states with localStorage data
  const [assetBookingsBookIn, setAssetBookingsBookIn] = useState<Record<string, AssetBookingBookIn>>(initialData.bookIn);
  const [assetBookingsBookOut, setAssetBookingsBookOut] = useState<Record<string, AssetBooking>>(initialData.bookOut);

  // Initialize booking states when teamMembers data becomes available
  // Only initialize new agents, preserve existing selections
  useEffect(() => {
    if (teamMembers.length > 0) {
      setAssetBookingsBookIn(prev => {
        const updated = { ...prev };
        
        teamMembers.forEach(member => {
          // Only initialize if agent doesn't already exist
          if (!updated[member.id]) {
            const agentName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown';
            const currentDate = new Date().toISOString().split('T')[0];
            
            updated[member.id] = {
              agentId: member.id,
              agentName,
              laptop: 'none',
              headsets: 'none',
              dongle: 'none',
              date: currentDate,
              type: 'book_in'
            };
          }
        });
        
        return updated;
      });
      
      setAssetBookingsBookOut(prev => {
        const updated = { ...prev };
        
        teamMembers.forEach(member => {
          // Only initialize if agent doesn't already exist
          if (!updated[member.id]) {
            const agentName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown';
            const currentDate = new Date().toISOString().split('T')[0];
            
            updated[member.id] = {
              agentId: member.id,
              agentName,
              laptop: 'none',
              headsets: 'none',
              dongle: 'none',
              date: currentDate,
              type: 'book_out'
            };
          }
        });
        
        return updated;
      });
    }
  }, [teamMembers]);

  // Auto-save to localStorage whenever states change
  useEffect(() => {
    saveToLocalStorage(assetBookingsBookIn, assetBookingsBookOut, lostAssets);
  }, [assetBookingsBookIn, assetBookingsBookOut, lostAssets]);

  const updateAssetBookingBookIn = (agentId: string, assetType: string, status: 'none' | 'collected' | 'not_collected') => {
    setAssetBookingsBookIn(prev => {
      const currentAgent = prev[agentId];
      let updated;
      
      if (!currentAgent) {
        // If agent doesn't exist, find them in teamMembers to get their name
        const agent = teamMembers.find(member => member.id === agentId);
        const agentName = agent ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username || 'Unknown' : 'Unknown Agent';
        
        updated = {
          ...prev,
          [agentId]: {
            agentId,
            agentName,
            laptop: assetType === 'laptop' ? status : 'none',
            headsets: assetType === 'headsets' ? status : 'none',
            dongle: assetType === 'dongle' ? status : 'none',
            date: new Date().toISOString().split('T')[0],
            type: 'book_in'
          }
        };
      } else {
        const updatedAgent = { ...currentAgent };
        if (assetType === 'laptop') updatedAgent.laptop = status;
        else if (assetType === 'headsets') updatedAgent.headsets = status;
        else if (assetType === 'dongle') updatedAgent.dongle = status;
        
        updated = {
          ...prev,
          [agentId]: updatedAgent
        };
      }
      
      
      return updated;
    });
    
    const statusText = status === 'collected' ? 'collected' : status === 'not_collected' ? 'not collected' : 'unmarked';
    toast({
      title: "Asset Updated",
      description: `${assetType} marked as ${statusText} for agent`,
    });
  };

  const updateAssetBookingBookOut = (agentId: string, assetType: string, status: 'none' | 'returned' | 'not_returned') => {
    // Get current status to check if we're changing from 'not_returned' to something else
    const currentStatus = (assetBookingsBookOut[agentId]?.[assetType as keyof typeof assetBookingsBookOut[string]] || 'none') as 'none' | 'returned' | 'not_returned';
    
    if (status === 'not_returned') {
      // Find the agent's name
      const agent = teamMembers.find(member => member.id === agentId);
      const agentName = agent ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username : 'Unknown Agent';
      
      // Add to lost assets records (avoid duplicates)
      setLostAssets(prev => {
        const exists = prev.some(item => item.agentId === agentId && item.assetType === assetType);
        if (!exists) {
          return [...prev, {
            agentId,
            agentName,
            assetType,
            dateLost: new Date().toISOString().split('T')[0]
          }];
        }
        return prev;
      });
    } else if (currentStatus === 'not_returned' && (status === 'none' || status === 'returned')) {
      // Remove from lost assets records when changing away from 'not_returned'
      setLostAssets(prev => prev.filter(item => !(item.agentId === agentId && item.assetType === assetType)));
    }
    
    setAssetBookingsBookOut(prev => {
      const currentAgent = prev[agentId];
      let updated;
      
      if (!currentAgent) {
        // If agent doesn't exist, find them in teamMembers to get their name
        const agent = teamMembers.find(member => member.id === agentId);
        const agentName = agent ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username || 'Unknown' : 'Unknown Agent';
        
        updated = {
          ...prev,
          [agentId]: {
            agentId,
            agentName,
            laptop: assetType === 'laptop' ? status : 'none',
            headsets: assetType === 'headsets' ? status : 'none',
            dongle: assetType === 'dongle' ? status : 'none',
            date: new Date().toISOString().split('T')[0],
            type: 'book_out'
          }
        };
      } else {
        const updatedAgent = { ...currentAgent };
        if (assetType === 'laptop') updatedAgent.laptop = status;
        else if (assetType === 'headsets') updatedAgent.headsets = status;
        else if (assetType === 'dongle') updatedAgent.dongle = status;
        
        updated = {
          ...prev,
          [agentId]: updatedAgent
        };
      }
      
      
      return updated;
    });
    
    const statusText = status === 'returned' ? 'returned' : status === 'not_returned' ? 'lost' : 'unmarked';
    toast({
      title: "Asset Updated", 
      description: `${assetType} marked as ${statusText} for ${teamMembers.find(m => m.id === agentId)?.username || 'agent'}`,
    });
  };

  // Save current asset booking records to database
  const saveAssetRecordsMutation = useMutation({
    mutationFn: async () => {
      const currentDate = new Date().toISOString().split('T')[0];
      return await apiRequest("POST", "/api/historical-asset-records", {
        date: currentDate,
        bookInRecords: assetBookingsBookIn,
        bookOutRecords: assetBookingsBookOut,
        lostAssets: lostAssets
      });
    },
    onSuccess: () => {
      const currentDate = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ 
        queryKey: ['/api/historical-asset-records', { date: currentDate }] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/historical-asset-records'] 
      });
      toast({
        title: "Records Saved",
        description: `Asset booking records for ${currentDate} have been saved successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save asset booking records",
        variant: "destructive",
      });
    },
  });

  const saveAssetRecords = () => {
    saveAssetRecordsMutation.mutate();
  };


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
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {teamMembers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                No team members found
              </td>
            </tr>
          ) : (
            teamMembers.map((member) => {
              const booking = assetBookingsBookIn[member.id];
              
              return (
                <tr key={member.id} data-testid={`row-agent-${member.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground" data-testid={`text-agent-name-${member.id}`}>
                      {booking?.agentName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{member.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={booking?.laptop || 'none'}
                        onStatusChange={(status) => updateAssetBookingBookIn(member.id, 'laptop', status)}
                        assetType="laptop"
                        agentId={member.id}
                        tabType="book_in"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={booking?.headsets || 'none'}
                        onStatusChange={(status) => updateAssetBookingBookIn(member.id, 'headsets', status)}
                        assetType="headsets"
                        agentId={member.id}
                        tabType="book_in"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={booking?.dongle || 'none'}
                        onStatusChange={(status) => updateAssetBookingBookIn(member.id, 'dongle', status)}
                        assetType="dongle"
                        agentId={member.id}
                        tabType="book_in"
                      />
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
    onStatusChange: (newStatus: any) => void;
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
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {teamMembers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                No team members found
              </td>
            </tr>
          ) : (
            teamMembers.map((member) => {
              const booking = assetBookingsBookOut[member.id];
              
              return (
                <tr key={member.id} data-testid={`row-agent-${member.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground" data-testid={`text-agent-name-${member.id}`}>
                      {booking?.agentName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown Agent'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{member.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={booking?.laptop || 'none'}
                        onStatusChange={(status) => updateAssetBookingBookOut(member.id, 'laptop', status)}
                        assetType="laptop"
                        agentId={member.id}
                        tabType="book_out"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={booking?.headsets || 'none'}
                        onStatusChange={(status) => updateAssetBookingBookOut(member.id, 'headsets', status)}
                        assetType="headsets"
                        agentId={member.id}
                        tabType="book_out"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <AssetStatusButtons
                        status={booking?.dongle || 'none'}
                        onStatusChange={(status) => updateAssetBookingBookOut(member.id, 'dongle', status)}
                        assetType="dongle"
                        agentId={member.id}
                        tabType="book_out"
                      />
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
                <TabsTrigger value="lost_assets" data-testid="tab-lost-assets">
                  Lost Assets
                </TabsTrigger>
              </TabsList>
              
              {(activeTab === 'book_in' || activeTab === 'book_out') && (
                <Button
                  onClick={saveAssetRecords}
                  className="flex items-center gap-2"
                  data-testid="button-save-records"
                >
                  <Save className="h-4 w-4" />
                  Save Records
                </Button>
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
                    <h3 className="font-medium text-red-800 dark:text-red-200">Lost Assets Records</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      Track assets that have been reported as lost or missing
                    </p>
                  </div>
                </div>
                
                {lostAssets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No lost assets recorded
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
                            Date Lost
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {lostAssets.map((lostAsset, index) => (
                          <tr key={`${lostAsset.agentId}-${lostAsset.assetType}-${index}`} data-testid={`row-lost-asset-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground" data-testid={`text-lost-agent-name-${index}`}>
                                {lostAsset.agentName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {lostAsset.assetType === 'laptop' && <Laptop className="h-4 w-4 text-muted-foreground" />}
                                {lostAsset.assetType === 'headsets' && <Headphones className="h-4 w-4 text-muted-foreground" />}
                                {lostAsset.assetType === 'dongle' && <Usb className="h-4 w-4 text-muted-foreground" />}
                                <span className="text-sm text-foreground capitalize" data-testid={`text-lost-asset-type-${index}`}>
                                  {lostAsset.assetType}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-lost-date-${index}`}>
                              {lostAsset.dateLost}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Badge className="bg-red-100 text-red-800" data-testid={`badge-lost-status-${index}`}>
                                Lost
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
            
          </Tabs>
        </CardContent>
      </Card>
      
    </div>
  );
}