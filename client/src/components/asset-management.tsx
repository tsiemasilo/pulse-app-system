import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Laptop, Headphones, Usb, Check, X } from "lucide-react";
import type { User, Asset } from "@shared/schema";
import { AssetLostDialog } from "./asset-lost-dialog";

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
  
  // Asset Lost Dialog state
  const [assetLostDialog, setAssetLostDialog] = useState<{
    open: boolean;
    agentId: string;
    agentName: string;
    assetType: string;
  }>({
    open: false,
    agentId: '',
    agentName: '',
    assetType: '',
  });

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

  // Mock asset booking data - in a real app this would come from your backend
  const [assetBookingsBookIn, setAssetBookingsBookIn] = useState<Record<string, AssetBookingBookIn>>(() => {
    const bookings: Record<string, AssetBookingBookIn> = {};
    teamMembers.forEach(member => {
      bookings[member.id] = {
        agentId: member.id,
        agentName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown',
        laptop: 'none',
        headsets: 'none',
        dongle: 'none',
        date: new Date().toISOString().split('T')[0],
        type: 'book_in'
      };
    });
    return bookings;
  });

  const [assetBookingsBookOut, setAssetBookingsBookOut] = useState<Record<string, AssetBooking>>(() => {
    const bookings: Record<string, AssetBooking> = {};
    teamMembers.forEach(member => {
      bookings[member.id] = {
        agentId: member.id,
        agentName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown',
        laptop: 'none',
        headsets: 'none',
        dongle: 'none',
        date: new Date().toISOString().split('T')[0],
        type: 'book_out'
      };
    });
    return bookings;
  });

  const updateAssetBookingBookIn = (agentId: string, assetType: string, status: 'none' | 'collected' | 'not_collected') => {
    setAssetBookingsBookIn(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [assetType]: status
      }
    }));
    
    const statusText = status === 'collected' ? 'collected' : status === 'not_collected' ? 'not collected' : 'unmarked';
    toast({
      title: "Asset Updated",
      description: `${assetType} marked as ${statusText} for agent`,
    });
  };

  const updateAssetBookingBookOut = (agentId: string, assetType: string, status: 'none' | 'returned' | 'not_returned') => {
    if (status === 'not_returned') {
      // Find the agent's name for the dialog
      const agent = teamMembers.find(member => member.id === agentId);
      const agentName = agent ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.username : 'Unknown Agent';
      
      // Open the Asset Lost dialog
      setAssetLostDialog({
        open: true,
        agentId,
        agentName,
        assetType,
      });
      return; // Don't update the status yet - wait for the dialog to complete
    }
    
    setAssetBookingsBookOut(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [assetType]: status as 'none' | 'returned' | 'not_returned'
      }
    }));
    
    const statusText = status === 'returned' ? 'returned' : status === 'not_returned' ? 'not returned' : 'unmarked';
    toast({
      title: "Asset Updated",
      description: `${assetType} marked as ${statusText} for agent`,
    });
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

  const handleAssetLostSaved = () => {
    // Mark the asset as not returned after the loss report is saved
    setAssetBookingsBookOut(prev => ({
      ...prev,
      [assetLostDialog.agentId]: {
        ...prev[assetLostDialog.agentId],
        [assetLostDialog.assetType]: 'not_returned'
      }
    }));
    
    toast({
      title: "Asset Updated",
      description: `${assetLostDialog.assetType} marked as not returned for agent`,
    });
  };

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="book_in" data-testid="tab-book-in">
                Book In
              </TabsTrigger>
              <TabsTrigger value="book_out" data-testid="tab-book-out">
                Book Out
              </TabsTrigger>
            </TabsList>
            
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
          </Tabs>
        </CardContent>
      </Card>
      
      <AssetLostDialog
        open={assetLostDialog.open}
        onOpenChange={(open) => setAssetLostDialog(prev => ({ ...prev, open }))}
        agentId={assetLostDialog.agentId}
        agentName={assetLostDialog.agentName}
        assetType={assetLostDialog.assetType}
        onSaved={handleAssetLostSaved}
      />
    </div>
  );
}