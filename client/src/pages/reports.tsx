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
  Save,
  Users,
  Clock,
  TrendingUp,
  UserCheck,
  Building,
  ArrowRight,
  Activity,
  Shield,
  UserX,
  UserPlus
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
  const [activeReportCategory, setActiveReportCategory] = useState<string>('overview');
  
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

  // Fetch asset loss records directly from database
  const { data: assetLossRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/asset-loss', selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/asset-loss?date=${selectedDate}`);
      return response.json();
    },
  });

  // Fetch all users for various stats
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch team members for agent names
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.role === 'agent'),
  });

  // Fetch attendance data
  const { data: attendanceData = [] } = useQuery<any[]>({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/attendance?date=${selectedDate}`);
      return response.json();
    },
  });

  // Fetch teams data
  const { data: teamsData = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // Fetch transfers data
  const { data: transfersData = [] } = useQuery<any[]>({
    queryKey: ["/api/transfers", selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/transfers?date=${selectedDate}`);
      return response.json();
    },
  });

  // Fetch terminations data
  const { data: terminationsData = [] } = useQuery<any[]>({
    queryKey: ["/api/terminations", selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/terminations?date=${selectedDate}`);
      return response.json();
    },
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
      // Fix cache invalidation keys to match actual query keys
      queryClient.invalidateQueries({ 
        queryKey: ['/api/historical-asset-records', currentDate] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/historical-asset-records'] 
      });
      // Also invalidate asset loss records for the current date
      queryClient.invalidateQueries({ 
        queryKey: ['/api/asset-loss', currentDate] 
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

  // Calculate overview statistics for different categories
  const getOverviewStats = () => {
    // Asset Management Stats
    const getAssetStats = () => {
      const recordsArray = Array.isArray(historicalRecords) ? historicalRecords : [];
      const dayRecords = recordsArray.filter(record => record.date === selectedDate);
      
      let totalBookedIn = 0;
      let totalBookedOut = 0;
      let totalLost = assetLossRecords.length;
      let activeAgents = new Set();

      dayRecords.forEach(record => {
        Object.entries(record.bookInRecords || {}).forEach(([agentId, booking]: [string, any]) => {
          activeAgents.add(agentId);
          if (booking.laptop === 'collected') totalBookedIn++;
          if (booking.headsets === 'collected') totalBookedIn++;
          if (booking.dongle === 'collected') totalBookedIn++;
        });

        Object.entries(record.bookOutRecords || {}).forEach(([agentId, booking]: [string, any]) => {
          activeAgents.add(agentId);
          if (booking.laptop === 'returned') totalBookedOut++;
          if (booking.headsets === 'returned') totalBookedOut++;
          if (booking.dongle === 'returned') totalBookedOut++;
        });
      });

      return { totalBookedIn, totalBookedOut, totalLost, activeAgents: activeAgents.size };
    };

    // Employee Management Stats
    const getEmployeeStats = () => {
      const totalEmployees = allUsers.length;
      const activeEmployees = allUsers.filter(user => user.isActive).length;
      const roleBreakdown = allUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { totalEmployees, activeEmployees, roleBreakdown };
    };

    // Attendance Stats
    const getAttendanceStats = () => {
      const totalAttended = attendanceData.filter(record => record.status === 'present').length;
      const totalAbsent = attendanceData.filter(record => record.status === 'absent').length;
      const totalLate = attendanceData.filter(record => record.status === 'late').length;
      const attendanceRate = attendanceData.length > 0 ? ((totalAttended / attendanceData.length) * 100).toFixed(1) : '0';

      return { totalAttended, totalAbsent, totalLate, attendanceRate };
    };

    // Team Management Stats
    const getTeamStats = () => {
      const totalTeams = teamsData.length;
      const averageTeamSize = totalTeams > 0 ? (teamMembers.length / totalTeams).toFixed(1) : '0';
      
      return { totalTeams, averageTeamSize };
    };

    // HR Activities Stats
    const getHRStats = () => {
      const transfersToday = transfersData.filter(transfer => 
        transfer.startDate && transfer.startDate.includes(selectedDate)
      ).length;
      const terminationsToday = terminationsData.filter(termination => 
        termination.terminationDate && termination.terminationDate.includes(selectedDate)
      ).length;

      return { transfersToday, terminationsToday };
    };

    return {
      assets: getAssetStats(),
      employees: getEmployeeStats(),
      attendance: getAttendanceStats(),
      teams: getTeamStats(),
      hr: getHRStats()
    };
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

      // Skip counting lost assets from historical records to avoid double counting
      // Lost assets are counted from assetLossRecords below
    });

    // Count lost assets from date-scoped server data (replaces local state mixing)
    assetLossRecords.forEach(lostAsset => {
      totalLost++;
      assetTypes[lostAsset.assetType as keyof typeof assetTypes]++;
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

  // Function to get agent asset status with proper precedence: Collected > Returned > Lost > Not Returned
  const getAgentAssetStatus = (agentId: string, assetType: 'laptop' | 'headsets' | 'dongle') => {
    // Check booking status from historical records for the selected date
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
    const isLostOnSelectedDate = assetLossRecords.some(asset => 
      asset.userId === agentId && asset.assetType === assetType
    );
    
    // Apply status precedence (latest actions override earlier ones)
    // 1. If collected on this date, show collected (highest priority)
    if (bookInStatus === 'collected') {
      return { status: 'Booked In', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
    }
    
    // 2. If returned on this date, show returned
    if (bookOutStatus === 'returned') {
      return { status: 'Booked Out', variant: 'secondary' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    }
    
    // 3. If lost on this date (and not returned/collected), show lost
    if (isLostOnSelectedDate) {
      return { status: 'Lost', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    // 4. Handle remaining booking statuses  
    if (bookOutStatus === 'not_returned') {
      return { status: 'Not Returned Yet', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
    
    if (bookInStatus === 'not_collected') {
      return { status: 'Not Booked In', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
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
      (record.lostAssets || []).forEach((asset: any) => agentSet.add(asset.userId || asset.agentId));
    });

    // Include agents from asset loss records (data is already filtered by selected date)
    assetLossRecords.forEach(asset => {
      agentSet.add(asset.userId);
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

  // Render overview with different category cards
  const renderOverview = () => {
    const stats = getOverviewStats();
    
    const categories = [
      {
        id: 'assets',
        title: 'Asset Management',
        description: 'Equipment tracking and booking reports',
        icon: Laptop,
        color: 'blue',
        stats: [
          { label: 'Booked In', value: stats.assets.totalBookedIn, color: 'text-green-600' },
          { label: 'Booked Out', value: stats.assets.totalBookedOut, color: 'text-orange-600' },
          { label: 'Lost Assets', value: stats.assets.totalLost, color: 'text-red-600' },
          { label: 'Active Agents', value: stats.assets.activeAgents, color: 'text-blue-600' }
        ]
      },
      {
        id: 'employees',
        title: 'Employee Management',
        description: 'Staff statistics and role distribution',
        icon: Users,
        color: 'green',
        stats: [
          { label: 'Total Employees', value: stats.employees.totalEmployees, color: 'text-blue-600' },
          { label: 'Active Employees', value: stats.employees.activeEmployees, color: 'text-green-600' },
          { label: 'Agents', value: stats.employees.roleBreakdown.agent || 0, color: 'text-purple-600' },
          { label: 'Managers', value: (stats.employees.roleBreakdown.contact_center_manager || 0) + (stats.employees.roleBreakdown.team_leader || 0), color: 'text-orange-600' }
        ]
      },
      {
        id: 'attendance',
        title: 'Attendance & Time',
        description: 'Daily attendance and time tracking',
        icon: Clock,
        color: 'purple',
        stats: [
          { label: 'Present', value: stats.attendance.totalAttended, color: 'text-green-600' },
          { label: 'Absent', value: stats.attendance.totalAbsent, color: 'text-red-600' },
          { label: 'Late', value: stats.attendance.totalLate, color: 'text-yellow-600' },
          { label: 'Attendance Rate', value: `${stats.attendance.attendanceRate}%`, color: 'text-blue-600' }
        ]
      },
      {
        id: 'teams',
        title: 'Team Performance',
        description: 'Team structure and performance metrics',
        icon: UserCheck,
        color: 'orange',
        stats: [
          { label: 'Total Teams', value: stats.teams.totalTeams, color: 'text-blue-600' },
          { label: 'Avg Team Size', value: stats.teams.averageTeamSize, color: 'text-green-600' },
          { label: 'Team Leaders', value: stats.employees.roleBreakdown.team_leader || 0, color: 'text-purple-600' },
          { label: 'Total Agents', value: stats.employees.roleBreakdown.agent || 0, color: 'text-orange-600' }
        ]
      },
      {
        id: 'hr',
        title: 'HR Activities',
        description: 'Transfers, terminations, and onboarding',
        icon: Building,
        color: 'red',
        stats: [
          { label: 'Transfers Today', value: stats.hr.transfersToday, color: 'text-blue-600' },
          { label: 'Terminations Today', value: stats.hr.terminationsToday, color: 'text-red-600' },
          { label: 'HR Staff', value: stats.employees.roleBreakdown.hr || 0, color: 'text-green-600' },
          { label: 'Admin Users', value: stats.employees.roleBreakdown.admin || 0, color: 'text-purple-600' }
        ]
      },
      {
        id: 'system',
        title: 'System Overview',
        description: 'Overall system health and statistics',
        icon: Activity,
        color: 'indigo',
        stats: [
          { label: 'Total Users', value: allUsers.length, color: 'text-blue-600' },
          { label: 'Active Today', value: attendanceData.length, color: 'text-green-600' },
          { label: 'Asset Activities', value: stats.assets.totalBookedIn + stats.assets.totalBookedOut, color: 'text-orange-600' },
          { label: 'System Health', value: '98%', color: 'text-green-600' }
        ]
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-200">Reports & Analytics</h1>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              Comprehensive workforce management reports and insights for {selectedDate}
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

        {/* Report Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500"
                onClick={() => setActiveReportCategory(category.id)}
                data-testid={`category-card-${category.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                        {category.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {category.stats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className={`text-lg font-bold ${stat.color}`} data-testid={`stat-${category.id}-${index}`}>
                          {stat.value}
                        </div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // Render detailed asset reports (existing functionality)
  const renderAssetReports = () => {
    const reportsData = getReportsData();
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setActiveReportCategory('overview')}
            data-testid="button-back-overview"
          >
            ← Back to Overview
          </Button>
          <div>
            <h2 className="text-xl font-bold">Asset Management Reports</h2>
            <p className="text-sm text-muted-foreground">Detailed asset tracking and booking reports for {selectedDate}</p>
          </div>
        </div>

        {/* Analytics Dashboard */}
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

        {/* Asset Types Breakdown */}
        {reportsData.totalLost > 0 ? (
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
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {activeReportCategory === 'overview' && renderOverview()}
      {activeReportCategory === 'assets' && renderAssetReports()}
      {activeReportCategory !== 'overview' && activeReportCategory !== 'assets' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setActiveReportCategory('overview')}
              data-testid="button-back-overview"
            >
              ← Back to Overview
            </Button>
            <div>
              <h2 className="text-xl font-bold">
                {activeReportCategory.charAt(0).toUpperCase() + activeReportCategory.slice(1)} Reports
              </h2>
              <p className="text-sm text-muted-foreground">
                Detailed {activeReportCategory} reports for {selectedDate}
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Detailed Reports Coming Soon</h3>
                <p>Advanced {activeReportCategory} analytics and reports will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}