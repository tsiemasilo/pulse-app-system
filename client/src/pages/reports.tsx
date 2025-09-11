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

  // Function to get consolidated agent records for display
  const getConsolidatedAgentRecords = () => {
    const recordsArray = Array.isArray(historicalRecords) ? historicalRecords : [];
    const dayRecords = recordsArray.filter(record => record.date === selectedDate);
    const agentMap = new Map();

    dayRecords.forEach(record => {
      // Process book in records
      Object.entries(record.bookInRecords || {}).forEach(([agentId, booking]: [string, any]) => {
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            agentId,
            agentName: booking.agentName || agentId,
            bookIn: null,
            bookOut: null,
            recordId: record.id
          });
        }
        agentMap.get(agentId).bookIn = booking;
      });

      // Process book out records
      Object.entries(record.bookOutRecords || {}).forEach(([agentId, booking]: [string, any]) => {
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            agentId,
            agentName: booking.agentName || agentId,
            bookIn: null,
            bookOut: null,
            recordId: record.id
          });
        }
        agentMap.get(agentId).bookOut = booking;
      });
    });

    return Array.from(agentMap.values());
  };

  // Function to show agent details
  const showAgentDetails = (agentRecord: any) => {
    setSelectedAgentDetails(agentRecord);
    setShowDetailsModal(true);
  };

  // Function to get activity summary for an agent
  const getActivitySummary = (agentRecord: any) => {
    const activities = [];
    if (agentRecord.bookIn) activities.push('Book In');
    if (agentRecord.bookOut) activities.push('Book Out');
    return activities.join(' + ') || 'No Activity';
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
      <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Agent Asset Records - {selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const agentRecords = getConsolidatedAgentRecords();
            return agentRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Records Found</h3>
                <p className="text-sm">No agent asset records were found for this date.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Agent Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Activity Summary
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                          Status
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {agentRecords.map((agentRecord, index) => (
                        <tr key={`${agentRecord.agentId}-${index}`} className="hover:bg-muted/30 transition-colors duration-200" data-testid={`row-agent-record-${index}`}>
                          <td className="px-6 py-4" data-testid={`text-agent-name-${index}`}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {agentRecord.agentName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground">{agentRecord.agentName}</div>
                                <div className="text-xs text-muted-foreground">Agent ID: {agentRecord.agentId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4" data-testid={`text-activity-summary-${index}`}>
                            <div className="flex gap-1">
                              {agentRecord.bookIn && (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                                  Book In
                                </Badge>
                              )}
                              {agentRecord.bookOut && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                  Book Out
                                </Badge>
                              )}
                              {!agentRecord.bookIn && !agentRecord.bookOut && (
                                <Badge variant="outline" className="text-xs">
                                  No Activity
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center" data-testid={`text-status-${index}`}>
                            <div className="inline-flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              <span className="text-sm text-foreground">Active</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                  onClick={() => showAgentDetails(agentRecord)}
                                  data-testid={`button-view-details-${index}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Assets
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl border-0 shadow-2xl bg-gradient-to-br from-background to-muted/20">
                                <DialogHeader className="border-b pb-4 mb-6">
                                  <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                      <span className="text-lg font-bold text-primary">
                                        {agentRecord.agentName.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-foreground">{agentRecord.agentName}</div>
                                      <div className="text-sm text-muted-foreground font-normal">Asset Management Details</div>
                                    </div>
                                  </DialogTitle>
                                </DialogHeader>
                                
                                <div className="space-y-6">
                                  {/* Book In Section */}
                                  {agentRecord.bookIn && (
                                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                      <h4 className="font-semibold mb-3 text-green-800 dark:text-green-400 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        Book In Activity
                                      </h4>
                                      <div className="grid gap-3">
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                                          <div className="flex items-center gap-3">
                                            <Laptop className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-medium">Laptop</span>
                                          </div>
                                          <Badge variant={agentRecord.bookIn.laptop === 'collected' ? 'default' : 'secondary'} className="font-medium">
                                            {agentRecord.bookIn.laptop || 'none'}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                                          <div className="flex items-center gap-3">
                                            <Headphones className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-medium">Headsets</span>
                                          </div>
                                          <Badge variant={agentRecord.bookIn.headsets === 'collected' ? 'default' : 'secondary'} className="font-medium">
                                            {agentRecord.bookIn.headsets || 'none'}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                                          <div className="flex items-center gap-3">
                                            <Usb className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-medium">Dongle</span>
                                          </div>
                                          <Badge variant={agentRecord.bookIn.dongle === 'collected' ? 'default' : 'secondary'} className="font-medium">
                                            {agentRecord.bookIn.dongle || 'none'}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Book Out Section */}
                                  {agentRecord.bookOut && (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                      <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-400 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        Book Out Activity
                                      </h4>
                                      <div className="grid gap-3">
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                                          <div className="flex items-center gap-3">
                                            <Laptop className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-medium">Laptop</span>
                                          </div>
                                          <Badge variant={agentRecord.bookOut.laptop === 'returned' ? 'default' : 'secondary'} className="font-medium">
                                            {agentRecord.bookOut.laptop || 'none'}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                                          <div className="flex items-center gap-3">
                                            <Headphones className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-medium">Headsets</span>
                                          </div>
                                          <Badge variant={agentRecord.bookOut.headsets === 'returned' ? 'default' : 'secondary'} className="font-medium">
                                            {agentRecord.bookOut.headsets || 'none'}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                                          <div className="flex items-center gap-3">
                                            <Usb className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-medium">Dongle</span>
                                          </div>
                                          <Badge variant={agentRecord.bookOut.dongle === 'returned' ? 'default' : 'secondary'} className="font-medium">
                                            {agentRecord.bookOut.dongle || 'none'}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* No Activity Section */}
                                  {!agentRecord.bookIn && !agentRecord.bookOut && (
                                    <div className="text-center py-8 text-muted-foreground">
                                      <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                        <Calendar className="h-6 w-6" />
                                      </div>
                                      <p className="text-sm">No asset activity recorded for this agent on {selectedDate}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex justify-center pt-4 border-t">
                                  <Button onClick={() => setShowDetailsModal(false)} variant="outline" className="px-6">
                                    Close
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
          }
        </CardContent>
      </Card>
    </div>
  );
}