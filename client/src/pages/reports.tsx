import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  Calendar, 
  Laptop, 
  Headphones, 
  Usb,
  Save,
  Eye
} from "lucide-react";

interface AssetBooking {
  agentId: string;
  agentName: string;
  laptop: 'none' | 'collected' | 'not_collected' | 'returned' | 'not_returned';
  headsets: 'none' | 'collected' | 'not_collected' | 'returned' | 'not_returned';
  dongle: 'none' | 'collected' | 'not_collected' | 'returned' | 'not_returned';
  date: string;
  type: 'book_in' | 'book_out';
}

export default function Reports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Selected date for reports
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Lost assets tracking - simple state to track lost assets
  const [lostAssets, setLostAssets] = useState<Array<{
    agentId: string;
    agentName: string;
    assetType: string;
    dateLost: string;
  }>>([]);

  // State for detailed view modal
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Historical records from database
  const { data: historicalRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/historical-asset-records', selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/historical-asset-records?date=${selectedDate}`);
      return response.json();
    },
  });

  // Asset bookings state for book in and book out
  const [assetBookingsBookIn, setAssetBookingsBookIn] = useState<{[key: string]: AssetBooking}>({});
  const [assetBookingsBookOut, setAssetBookingsBookOut] = useState<{[key: string]: AssetBooking}>({});

  // Mutation for saving records
  const saveRecordsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/historical-asset-records", data);
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
        title: "Error Saving Records",
        description: "Failed to save asset booking records. Please try again.",
        variant: "destructive"
      });
      console.error("Failed to save records:", error);
    }
  });

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

  const getReportsData = () => {
    // Ensure historicalRecords is an array before filtering
    const recordsArray = Array.isArray(historicalRecords) ? historicalRecords : [];
    
    // Filter historical records by selected date
    const dayRecords = recordsArray.filter(record => record.date === selectedDate);
    
    let totalBookedIn = 0;
    let totalBookedOut = 0;
    let totalLost = 0;
    let agents = new Set();
    let assetTypes = { laptop: 0, headsets: 0, dongle: 0 };

    // Process historical records
    dayRecords.forEach(record => {
      // Count book in records
      Object.entries(record.bookInRecords || {}).forEach(([agentId, booking]: [string, any]) => {
        agents.add(agentId);
        if (booking.laptop === 'collected') totalBookedIn++;
        if (booking.headsets === 'collected') totalBookedIn++;
        if (booking.dongle === 'collected') totalBookedIn++;
      });

      // Count book out records
      Object.entries(record.bookOutRecords || {}).forEach(([agentId, booking]: [string, any]) => {
        agents.add(agentId);
        if (booking.laptop === 'returned') totalBookedOut++;
        if (booking.headsets === 'returned') totalBookedOut++;
        if (booking.dongle === 'returned') totalBookedOut++;
      });

      // Count lost assets
      (record.lostAssets || []).forEach((lostAsset: any) => {
        totalLost++;
        assetTypes[lostAsset.assetType as keyof typeof assetTypes]++;
      });
    });

    // Also include current day's lost assets that might not be saved yet
    lostAssets.forEach(lostAsset => {
      if (lostAsset.dateLost === selectedDate) {
        totalLost++;
        assetTypes[lostAsset.assetType as keyof typeof assetTypes]++;
      }
    });

    return {
      totalBookedIn,
      totalBookedOut,
      totalLost,
      agents: Array.from(agents),
      assetTypes
    };
  };

  // Function to get agent-specific records for display
  const getAgentRecords = () => {
    const recordsArray = Array.isArray(historicalRecords) ? historicalRecords : [];
    const dayRecords = recordsArray.filter(record => record.date === selectedDate);
    const agentRecords: any[] = [];

    dayRecords.forEach(record => {
      // Process book in records
      Object.entries(record.bookInRecords || {}).forEach(([agentId, booking]: [string, any]) => {
        agentRecords.push({
          agentId,
          agentName: booking.agentName || agentId,
          type: 'Book In',
          record,
          booking,
          recordId: record.id
        });
      });

      // Process book out records
      Object.entries(record.bookOutRecords || {}).forEach(([agentId, booking]: [string, any]) => {
        agentRecords.push({
          agentId,
          agentName: booking.agentName || agentId,
          type: 'Book Out',
          record,
          booking,
          recordId: record.id
        });
      });
    });

    return agentRecords;
  };

  // Function to show agent details
  const showAgentDetails = (agentRecord: any) => {
    setSelectedAgentDetails(agentRecord);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-200">Reports & Analytics</h1>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            View historical data and analytics for asset management, attendance, and operational changes
          </p>
        </div>
      </div>

      {/* Date Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Select Date for Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border rounded-md"
            data-testid="date-picker-reports"
          />
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      {(() => {
        const reportsData = getReportsData();
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Booked In */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Assets Booked In</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700" data-testid="stat-booked-in">
                  {reportsData.totalBookedIn}
                </div>
                <p className="text-xs text-muted-foreground">Total collected on {selectedDate}</p>
              </CardContent>
            </Card>

            {/* Total Booked Out */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600">Assets Booked Out</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700" data-testid="stat-booked-out">
                  {reportsData.totalBookedOut}
                </div>
                <p className="text-xs text-muted-foreground">Total returned on {selectedDate}</p>
              </CardContent>
            </Card>

            {/* Total Lost */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Lost Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700" data-testid="stat-lost-assets">
                  {reportsData.totalLost}
                </div>
                <p className="text-xs text-muted-foreground">Total lost on {selectedDate}</p>
              </CardContent>
            </Card>

            {/* Active Agents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700" data-testid="stat-active-agents">
                  {reportsData.agents.length}
                </div>
                <p className="text-xs text-muted-foreground">Agents with activity on {selectedDate}</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Asset Types Breakdown */}
      {(() => {
        const reportsData = getReportsData();
        return reportsData.totalLost > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Lost Assets by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-muted-foreground" />
                    <span>Laptops</span>
                  </div>
                  <Badge variant="outline" data-testid="chart-laptops">
                    {reportsData.assetTypes.laptop}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <span>Headsets</span>
                  </div>
                  <Badge variant="outline" data-testid="chart-headsets">
                    {reportsData.assetTypes.headsets}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Usb className="h-4 w-4 text-muted-foreground" />
                    <span>Dongles</span>
                  </div>
                  <Badge variant="outline" data-testid="chart-dongles">
                    {reportsData.assetTypes.dongle}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No lost assets data for {selectedDate}
            </CardContent>
          </Card>
        );
      })()}

      {/* Agent Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Records for {selectedDate}</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const agentRecords = getAgentRecords();
            return agentRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No agent records for this date
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Agent Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Record Type
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {agentRecords.map((agentRecord, index) => (
                      <tr key={`${agentRecord.recordId}-${agentRecord.agentId}-${index}`} data-testid={`row-agent-record-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" data-testid={`text-agent-name-${index}`}>
                          {agentRecord.agentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" data-testid={`text-record-type-${index}`}>
                          <Badge variant={agentRecord.type === 'Book In' ? 'default' : 'secondary'}>
                            {agentRecord.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm" data-testid={`text-record-date-${index}`}>
                          {selectedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Dialog open={showDetailsModal && selectedAgentDetails?.recordId === agentRecord.recordId && selectedAgentDetails?.agentId === agentRecord.agentId} onOpenChange={setShowDetailsModal}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => showAgentDetails(agentRecord)}
                                data-testid={`button-view-details-${index}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Asset Details - {selectedAgentDetails?.agentName}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Record Type: {selectedAgentDetails?.type}</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Laptop className="h-4 w-4" />
                                        <span>Laptop</span>
                                      </div>
                                      <Badge variant={selectedAgentDetails?.booking?.laptop === 'collected' || selectedAgentDetails?.booking?.laptop === 'returned' ? 'default' : 'secondary'}>
                                        {selectedAgentDetails?.booking?.laptop || 'none'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Headphones className="h-4 w-4" />
                                        <span>Headsets</span>
                                      </div>
                                      <Badge variant={selectedAgentDetails?.booking?.headsets === 'collected' || selectedAgentDetails?.booking?.headsets === 'returned' ? 'default' : 'secondary'}>
                                        {selectedAgentDetails?.booking?.headsets || 'none'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Usb className="h-4 w-4" />
                                        <span>Dongle</span>
                                      </div>
                                      <Badge variant={selectedAgentDetails?.booking?.dongle === 'collected' || selectedAgentDetails?.booking?.dongle === 'returned' ? 'default' : 'secondary'}>
                                        {selectedAgentDetails?.booking?.dongle || 'none'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
          }
        </CardContent>
      </Card>
    </div>
  );
}