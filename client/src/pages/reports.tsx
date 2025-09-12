import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  Calendar, 
  Laptop, 
  Headphones, 
  Usb,
  Save
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
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  
  // Local storage data for current asset control
  const [localStorageData, setLocalStorageData] = useState<{
    bookIn: Record<string, any>,
    bookOut: Record<string, any>,
    lostAssets: any[]
  }>({ bookIn: {}, bookOut: {}, lostAssets: [] });

  // Lost assets tracking - simple state to track lost assets
  const [lostAssets, setLostAssets] = useState<Array<{
    agentId: string;
    agentName: string;
    assetType: string;
    dateLost: string;
  }>>([]);


  // Historical records from database
  const { data: historicalRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/historical-asset-records', selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/historical-asset-records?date=${selectedDate}`);
      return response.json();
    },
  });

  // Fetch team members for agent names
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.role === 'agent'),
  });

  // Load localStorage data when selectedDate changes
  useEffect(() => {
    const loadLocalStorageData = () => {
      const bookInKey = `assetBookings_bookIn_${selectedDate}`;
      const bookOutKey = `assetBookings_bookOut_${selectedDate}`;
      const lostAssetsKey = `lostAssets_${selectedDate}`;
      
      try {
        const bookInData = localStorage.getItem(bookInKey);
        const bookOutData = localStorage.getItem(bookOutKey);
        const lostAssetsData = localStorage.getItem(lostAssetsKey);
        
        setLocalStorageData({
          bookIn: bookInData ? JSON.parse(bookInData) : {},
          bookOut: bookOutData ? JSON.parse(bookOutData) : {},
          lostAssets: lostAssetsData ? JSON.parse(lostAssetsData) : []
        });
      } catch (error) {
        console.error('Error loading localStorage:', error);
        setLocalStorageData({ bookIn: {}, bookOut: {}, lostAssets: [] });
      }
    };

    loadLocalStorageData();
  }, [selectedDate]);

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

  // Function to get agent asset status with precedence: Lost > Booked Out > Booked In
  const getAgentAssetStatus = (agentId: string, assetType: 'laptop' | 'headsets' | 'dongle') => {
    // Check for lost assets first (highest precedence) - always from historical records
    const lostAssets = historicalRecords.flatMap(record => record.lostAssets || []);
    const isLost = lostAssets.some(asset => 
      asset.agentId === agentId && 
      asset.assetType === assetType && 
      asset.dateLost === selectedDate
    );
    
    if (isLost) {
      return { status: 'Lost', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    // Check booking status from historical records for all dates
    let bookInStatus = 'none';
    let bookOutStatus = 'none';
    
    const dayRecords = historicalRecords.filter(record => record.date === selectedDate);
    
    dayRecords.forEach(record => {
      const bookInRecord = record.bookInRecords?.[agentId];
      const bookOutRecord = record.bookOutRecords?.[agentId];
      
      if (bookInRecord?.[assetType]) bookInStatus = bookInRecord[assetType];
      if (bookOutRecord?.[assetType]) bookOutStatus = bookOutRecord[assetType];
    });
    
    // Apply status precedence
    if (bookOutStatus === 'not_returned') {
      return { status: 'Not Returned Yet', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (bookOutStatus === 'returned') {
      return { status: 'Booked Out', variant: 'secondary' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    }
    
    if (bookInStatus === 'collected') {
      return { status: 'Booked In', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
    }
    
    return { status: 'Not Booked In', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
  };
  
  // Function to get all agents with asset records
  const getAgentAssetRecords = () => {
    const agentSet = new Set<string>();
    
    // Always get agents from historical records (database) for all dates
    const dayRecords = historicalRecords.filter(record => record.date === selectedDate);
    dayRecords.forEach(record => {
      Object.keys(record.bookInRecords || {}).forEach(agentId => agentSet.add(agentId));
      Object.keys(record.bookOutRecords || {}).forEach(agentId => agentSet.add(agentId));
      (record.lostAssets || []).forEach((asset: any) => agentSet.add(asset.agentId));
    });
    
    return Array.from(agentSet).map(agentId => {
      // Get agent name from team members or booking records
      let agentName = 'Unknown Agent';
      const teamMember = teamMembers.find(member => member.id === agentId);
      
      if (teamMember) {
        agentName = `${teamMember.firstName || ''} ${teamMember.lastName || ''}`.trim() || teamMember.username || 'Unknown';
      } else {
        // Fallback to name from historical booking records
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
  );
}