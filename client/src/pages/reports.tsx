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
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Utility function to calculate date ranges based on timeframe
  const getDateRange = (selectedDate: string, timeframe: 'daily' | 'weekly' | 'monthly') => {
    const baseDate = new Date(selectedDate);
    
    switch (timeframe) {
      case 'daily':
        return {
          startDate: selectedDate,
          endDate: selectedDate,
          dates: [selectedDate]
        };
      
      case 'weekly':
        // Get the week containing the selected date (Sunday to Saturday)
        const dayOfWeek = baseDate.getDay();
        const startOfWeek = new Date(baseDate);
        startOfWeek.setDate(baseDate.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const weekDates = [];
        for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
          weekDates.push(d.toISOString().split('T')[0]);
        }
        
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0],
          dates: weekDates
        };
      
      case 'monthly':
        // Get the month containing the selected date
        const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        
        const monthDates = [];
        for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
          monthDates.push(d.toISOString().split('T')[0]);
        }
        
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0],
          dates: monthDates
        };
    }
  };
  
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

  // Helper functions for team leaderboard
  const getTopPerformingTeam = () => {
    if (teamsData.length === 0) return { name: 'No Teams', attendanceRate: '0' };
    
    // Calculate team performance based on attendance rates
    const teamPerformance = teamsData.map(team => {
      const teamAttendance = attendanceData.filter(record => {
        const teamMembers = allUsers.filter(user => user.teamId === team.id);
        return teamMembers.some(member => member.id === record.userId);
      });
      
      const presentCount = teamAttendance.filter(record => record.status === 'present').length;
      const attendanceRate = teamAttendance.length > 0 ? (presentCount / teamAttendance.length * 100).toFixed(1) : '0';
      
      return {
        name: team.name,
        attendanceRate: attendanceRate
      };
    });
    
    return teamPerformance.reduce((best, current) => 
      parseFloat(current.attendanceRate) > parseFloat(best.attendanceRate) ? current : best,
      teamPerformance[0] || { name: 'No Teams', attendanceRate: '0' }
    );
  };

  const getTopAssetComplianceTeam = () => {
    if (teamsData.length === 0) return { name: 'No Teams' };
    
    // Calculate asset compliance by team (based on proper asset booking)
    const teamCompliance = teamsData.map(team => {
      const teamMembers = allUsers.filter(user => user.teamId === team.id);
      let complianceScore = 0;
      
      teamMembers.forEach(member => {
        const agentRecords = getConsolidatedAgentRecords().filter(record => record.agentId === member.id);
        // Simple compliance: if agent has proper asset bookings (booked in and out properly)
        if (agentRecords.length > 0) {
          complianceScore += 1;
        }
      });
      
      return {
        name: team.name,
        score: teamMembers.length > 0 ? (complianceScore / teamMembers.length * 100) : 0
      };
    });
    
    return teamCompliance.reduce((best, current) => 
      current.score > best.score ? current : best,
      teamCompliance[0] || { name: 'No Teams' }
    );
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
        id: 'operations',
        title: 'Staff Operations',
        description: 'Transfers, terminations, and onboarding',
        icon: Building,
        color: 'red',
        stats: [
          { label: 'Transfers Today', value: stats.hr.transfersToday, color: 'text-blue-600' },
          { label: 'Terminations Today', value: stats.hr.terminationsToday, color: 'text-red-600' },
          { label: 'Operations Staff', value: stats.employees.roleBreakdown.hr || 0, color: 'text-green-600' },
          { label: 'Admin Users', value: stats.employees.roleBreakdown.admin || 0, color: 'text-purple-600' }
        ]
      },
      {
        id: 'leaderboard',
        title: 'Team Leaderboard',
        description: 'Compare team leaders by team performance',
        icon: TrendingUp,
        color: 'indigo',
        stats: [
          { label: 'Best Performing Team', value: teamsData.length > 0 ? getTopPerformingTeam().name : 'Loading...', color: 'text-green-600' },
          { label: 'Top Attendance Rate', value: teamsData.length > 0 ? `${getTopPerformingTeam().attendanceRate}%` : '0%', color: 'text-blue-600' },
          { label: 'Asset Compliance Leader', value: teamsData.length > 0 ? getTopAssetComplianceTeam().name : 'Loading...', color: 'text-purple-600' },
          { label: 'Total Teams Ranked', value: teamsData.length, color: 'text-orange-600' }
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

  // Function to render team leaderboard with performance metrics
  const renderTeamLeaderboard = () => {
    const getTeamPerformanceData = () => {
      const dateRange = getDateRange(selectedDate, timeframe);
      
      return teamsData.map(team => {
        const teamMembers = allUsers.filter(user => {
          // Check if user belongs to this team (you may need to adjust this based on your data structure)
          return user.teamId === team.id || (team.leaderId && user.reportsTo === team.leaderId);
        });
        
        // Calculate attendance metrics across the timeframe
        let totalPresentCount = 0;
        let totalAbsentCount = 0;
        let totalLateCount = 0;
        let totalAttendanceRecords = 0;
        
        // For each date in the range, get attendance data
        dateRange.dates.forEach(date => {
          // Note: In a real implementation, you'd want to fetch attendance data for each date
          // For now, we'll use the current attendanceData if it matches the date
          const dayAttendance = attendanceData.filter(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === date && teamMembers.some(member => member.id === record.userId);
          });
          
          totalPresentCount += dayAttendance.filter(record => record.status === 'present').length;
          totalAbsentCount += dayAttendance.filter(record => record.status === 'absent').length;
          totalLateCount += dayAttendance.filter(record => record.status === 'late').length;
          totalAttendanceRecords += dayAttendance.length;
        });
        
        const attendanceRate = totalAttendanceRecords > 0 ? (totalPresentCount / totalAttendanceRecords * 100) : 0;
        
        // Calculate improved asset compliance across the timeframe
        let assetCompliance = 0;
        if (teamMembers.length > 0) {
          const compliantMembers = teamMembers.filter(member => {
            // Check asset compliance for each date in the range
            let memberCompliant = true;
            
            dateRange.dates.forEach(date => {
              const dayRecords = historicalRecords.filter(record => record.date === date);
              let hasProperBooking = false;
              
              dayRecords.forEach(record => {
                const bookInRecord = record.bookInRecords?.[member.id];
                const bookOutRecord = record.bookOutRecords?.[member.id];
                
                // Check if member has proper book-in and book-out for any assets
                if (bookInRecord || bookOutRecord) {
                  const hasBookIn = bookInRecord && (
                    bookInRecord.laptop === 'collected' ||
                    bookInRecord.headsets === 'collected' ||
                    bookInRecord.dongle === 'collected'
                  );
                  const hasBookOut = bookOutRecord && (
                    bookOutRecord.laptop === 'returned' ||
                    bookOutRecord.headsets === 'returned' ||
                    bookOutRecord.dongle === 'returned'
                  );
                  
                  if (hasBookIn || hasBookOut) {
                    hasProperBooking = true;
                  }
                }
              });
              
              // Check for lost assets on this date
              const hasLostAsset = assetLossRecords.some(asset => {
                const lossDate = new Date(asset.dateLost).toISOString().split('T')[0];
                return lossDate === date && asset.userId === member.id;
              });
              
              // If member had activity but lost assets, reduce compliance
              if (hasLostAsset) {
                memberCompliant = false;
              }
            });
            
            return memberCompliant;
          });
          
          assetCompliance = (compliantMembers.length / teamMembers.length) * 100;
        }
        
        // Get team leader info
        const teamLeader = allUsers.find(user => user.id === team.leaderId);
        const leaderName = teamLeader ? `${teamLeader.firstName || ''} ${teamLeader.lastName || ''}`.trim() || teamLeader.username : 'No Leader';
        
        return {
          id: team.id,
          name: team.name,
          leaderName,
          memberCount: teamMembers.length,
          attendanceRate: Number(attendanceRate.toFixed(1)),
          presentCount: totalPresentCount,
          absentCount: totalAbsentCount,
          lateCount: totalLateCount,
          assetCompliance: Number(assetCompliance.toFixed(1)),
          overallScore: Number(((attendanceRate * 0.7) + (assetCompliance * 0.3)).toFixed(1))
        };
      }).sort((a, b) => b.overallScore - a.overallScore);
    };
    
    const teamPerformance = getTeamPerformanceData();
    
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
            <h2 className="text-xl font-bold">Team Leaderboard</h2>
            <p className="text-sm text-muted-foreground">
              Compare team leaders by team performance 
              {timeframe === 'daily' && `for ${selectedDate}`}
              {timeframe === 'weekly' && `for week of ${selectedDate}`}
              {timeframe === 'monthly' && `for month of ${selectedDate}`}
            </p>
          </div>
        </div>

        {/* Timeframe Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Performance Timeframe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <Button
                  key={period}
                  variant={timeframe === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe(period)}
                  data-testid={`timeframe-${period}`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Top Performing Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-700" data-testid="top-team">
                {teamPerformance[0]?.name || 'No Teams'}
              </div>
              <p className="text-xs text-muted-foreground">Score: {teamPerformance[0]?.overallScore || 0}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Best Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-blue-700" data-testid="best-attendance">
                {teamPerformance.reduce((best, current) => 
                  current.attendanceRate > best.attendanceRate ? current : best, 
                  teamPerformance[0] || { name: 'No Teams', attendanceRate: 0 }
                ).name}
              </div>
              <p className="text-xs text-muted-foreground">
                {teamPerformance.reduce((best, current) => 
                  current.attendanceRate > best.attendanceRate ? current : best, 
                  teamPerformance[0] || { attendanceRate: 0 }
                ).attendanceRate}% attendance
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">Asset Compliance Leader</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-purple-700" data-testid="asset-leader">
                {teamPerformance.reduce((best, current) => 
                  current.assetCompliance > best.assetCompliance ? current : best, 
                  teamPerformance[0] || { name: 'No Teams', assetCompliance: 0 }
                ).name}
              </div>
              <p className="text-xs text-muted-foreground">
                {teamPerformance.reduce((best, current) => 
                  current.assetCompliance > best.assetCompliance ? current : best, 
                  teamPerformance[0] || { assetCompliance: 0 }
                ).assetCompliance}% compliance
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Total Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-orange-700" data-testid="total-teams">
                {teamsData.length}
              </div>
              <p className="text-xs text-muted-foreground">Teams tracked</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Team Leader</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Attendance Rate</TableHead>
                  <TableHead>Asset Compliance</TableHead>
                  <TableHead>Overall Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerformance.map((team, index) => (
                  <TableRow key={team.id} data-testid={`team-row-${team.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{index + 1}</span>
                        {index === 0 && <Badge variant="default" className="bg-yellow-100 text-yellow-800">🏆</Badge>}
                        {index === 1 && <Badge variant="secondary" className="bg-gray-100 text-gray-800">🥈</Badge>}
                        {index === 2 && <Badge variant="outline" className="bg-orange-100 text-orange-800">🥉</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.leaderName}</TableCell>
                    <TableCell>{team.memberCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={team.attendanceRate >= 90 ? 'text-green-600' : team.attendanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {team.attendanceRate}%
                        </span>
                        <Badge variant={team.attendanceRate >= 90 ? 'default' : team.attendanceRate >= 70 ? 'secondary' : 'destructive'} className="text-xs">
                          {team.presentCount}P {team.absentCount}A {team.lateCount}L
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={team.assetCompliance >= 80 ? 'text-green-600' : team.assetCompliance >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                        {team.assetCompliance}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={team.overallScore >= 85 ? 'default' : team.overallScore >= 70 ? 'secondary' : 'outline'}
                        className={team.overallScore >= 85 ? 'bg-green-100 text-green-800' : team.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
                      >
                        {team.overallScore}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {teamPerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No teams found for {selectedDate}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
      {activeReportCategory === 'leaderboard' && renderTeamLeaderboard()}
      {activeReportCategory !== 'overview' && activeReportCategory !== 'assets' && activeReportCategory !== 'leaderboard' && (
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