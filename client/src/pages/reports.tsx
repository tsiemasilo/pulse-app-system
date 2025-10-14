import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  Clock,
  Laptop,
  TrendingUp,
  TrendingDown,
  Building,
  Calendar as CalendarIcon,
  Activity,
  Package,
  Download,
  History,
  BarChart3
} from "lucide-react";
import type { User } from "@shared/schema";

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  teal: "#14b8a6"
};

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.teal];

const ICON_COLORS = {
  users: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
  userCheck: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
  building: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
  laptop: "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400",
};

interface ReportsProps {
  user?: User;
  teamMembers?: User[];
}

export default function Reports({ user, teamMembers = [] }: ReportsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const isTeamLeader = user?.role === 'team_leader';
  const teamMemberIds = useMemo(() => teamMembers.map(m => m.id), [teamMembers]);

  // Fetch all users
  const { data: allUsersRaw = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter users based on role
  const allUsers = useMemo(() => {
    if (user?.role === 'team_leader') {
      return teamMemberIds.length > 0 ? allUsersRaw.filter(u => teamMemberIds.includes(u.id)) : [];
    }
    return allUsersRaw;
  }, [allUsersRaw, user?.role, teamMemberIds]);

  // Fetch attendance data
  const { data: attendanceDataRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/attendance/today"],
  });

  // Filter attendance based on role
  const attendanceData = useMemo(() => {
    if (user?.role === 'team_leader') {
      return teamMemberIds.length > 0 ? attendanceDataRaw.filter(a => teamMemberIds.includes(a.userId)) : [];
    }
    return attendanceDataRaw;
  }, [attendanceDataRaw, user?.role, teamMemberIds]);

  // Fetch teams data
  const { data: teamsData = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // Fetch team members for proper calculation
  const { data: allTeamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/team-members"],
    queryFn: async () => {
      const response = await fetch('/api/team-members');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch historical asset records
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: historicalRecordsRaw = [] } = useQuery<any[]>({
    queryKey: ['/api/historical-asset-records', selectedDateStr],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/historical-asset-records?date=${queryKey[1]}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter historical records by team member IDs
  const historicalRecords = useMemo(() => {
    if (user?.role === 'team_leader') {
      if (teamMemberIds.length === 0) return [];
      
      return historicalRecordsRaw.map(record => {
        const filteredBookIn: Record<string, any> = {};
        const filteredBookOut: Record<string, any> = {};
        
        Object.entries(record.bookInRecords || {}).forEach(([userId, data]) => {
          if (teamMemberIds.includes(userId)) {
            filteredBookIn[userId] = data;
          }
        });
        
        Object.entries(record.bookOutRecords || {}).forEach(([userId, data]) => {
          if (teamMemberIds.includes(userId)) {
            filteredBookOut[userId] = data;
          }
        });
        
        return {
          ...record,
          bookInRecords: filteredBookIn,
          bookOutRecords: filteredBookOut,
        };
      });
    }
    return historicalRecordsRaw;
  }, [historicalRecordsRaw, user?.role, teamMemberIds]);

  // Fetch asset loss records
  const { data: assetLossRecordsRaw = [] } = useQuery<any[]>({
    queryKey: ['/api/asset-loss', selectedDateStr],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/asset-loss?date=${queryKey[1]}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter asset loss records
  const assetLossRecords = useMemo(() => {
    if (user?.role === 'team_leader') {
      return teamMemberIds.length > 0 ? assetLossRecordsRaw.filter(a => teamMemberIds.includes(a.userId)) : [];
    }
    return assetLossRecordsRaw;
  }, [assetLossRecordsRaw, user?.role, teamMemberIds]);

  // Fetch historical attendance for trend analysis
  const { data: historicalAttendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/historical', format(subDays(selectedDate, 7), 'yyyy-MM-dd'), selectedDateStr],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/attendance/range?start=${queryKey[1]}&end=${queryKey[2]}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter historical attendance
  const filteredHistoricalAttendance = useMemo(() => {
    if (user?.role === 'team_leader') {
      return teamMemberIds.length > 0 ? historicalAttendance.filter((a: any) => teamMemberIds.includes(a.userId)) : [];
    }
    return historicalAttendance;
  }, [historicalAttendance, user?.role, teamMemberIds]);

  // Calculate statistics - count unique users to avoid duplicate records
  const stats = {
    totalEmployees: allUsers.length,
    activeEmployees: allUsers.filter(u => u.isActive).length,
    totalTeams: isTeamLeader ? (teamMembers.length > 0 ? 1 : 0) : teamsData.length,
    presentToday: new Set(attendanceData.filter(a => a.status === 'at work' || a.status === 'present').map(a => a.userId)).size,
    absentToday: new Set(attendanceData.filter(a => a.status !== 'at work' && a.status !== 'present' && a.status !== 'late').map(a => a.userId)).size,
    lateToday: new Set(attendanceData.filter(a => a.status === 'late').map(a => a.userId)).size,
    attendanceRate: attendanceData.length > 0 
      ? ((new Set(attendanceData.filter(a => a.status === 'at work' || a.status === 'present').map(a => a.userId)).size / new Set(attendanceData.map(a => a.userId)).size) * 100).toFixed(1)
      : '0',
  };

  // Calculate asset statistics
  const assetStats = () => {
    let totalBookedIn = 0;
    let totalBookedOut = 0;
    let totalLost = assetLossRecords.length;

    const dayRecords = historicalRecords.filter(r => r.date === selectedDateStr);
    dayRecords.forEach(record => {
      Object.values(record.bookInRecords || {}).forEach((booking: any) => {
        if (booking.laptop === 'collected') totalBookedIn++;
        if (booking.headsets === 'collected') totalBookedIn++;
        if (booking.dongle === 'collected') totalBookedIn++;
      });

      Object.values(record.bookOutRecords || {}).forEach((booking: any) => {
        if (booking.laptop === 'returned') totalBookedOut++;
        if (booking.headsets === 'returned') totalBookedOut++;
        if (booking.dongle === 'returned') totalBookedOut++;
      });
    });

    return { totalBookedIn, totalBookedOut, totalLost };
  };

  const assets = assetStats();

  // Role distribution data
  const roleDistribution = allUsers.reduce((acc, user) => {
    const role = user.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const roleChartData = Object.entries(roleDistribution).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value
  }));

  // Attendance status data
  const attendanceChartData = [
    { name: 'Present', value: stats.presentToday, color: COLORS.success },
    { name: 'Absent', value: stats.absentToday, color: COLORS.danger },
    { name: 'Late', value: stats.lateToday, color: COLORS.warning },
  ];

  // Asset status data
  const assetChartData = [
    { name: 'Booked In', value: assets.totalBookedIn, color: COLORS.primary },
    { name: 'Booked Out', value: assets.totalBookedOut, color: COLORS.success },
    { name: 'Lost', value: assets.totalLost, color: COLORS.danger },
  ];

  // Fixed team performance calculation using team_members table
  const teamPerformanceData = useMemo(() => {
    // Filter teams based on role - team leaders only see their own teams
    const filteredTeams = user?.role === 'team_leader' 
      ? teamsData.filter((team) => team.leaderId === user?.id)
      : teamsData;
    
    return filteredTeams.map((team) => {
      const teamMembersForTeam = allTeamMembers.filter((tm: any) => tm.teamId === team.id);
      const memberIds = teamMembersForTeam.map((tm: any) => tm.userId);
      
      const teamAttendance = attendanceDataRaw.filter(a => memberIds.includes(a.userId));
      const presentCount = teamAttendance.filter(a => a.status === 'at work' || a.status === 'present').length;
      const attendancePercentage = teamAttendance.length > 0 
        ? Math.round((presentCount / teamAttendance.length) * 100)
        : 0;

      return {
        name: team.name || 'Unnamed Team',
        members: memberIds.length,
        attendance: attendancePercentage,
      };
    });
  }, [teamsData, allTeamMembers, attendanceDataRaw, user?.role, user?.id]);

  // Attendance trend over last 7 days
  const attendanceTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(selectedDate, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAttendance = filteredHistoricalAttendance.filter((a: any) => 
        format(new Date(a.date), 'yyyy-MM-dd') === dateStr
      );
      
      return {
        date: format(date, 'MMM dd'),
        present: dayAttendance.filter((a: any) => a.status === 'at work' || a.status === 'present').length,
        absent: dayAttendance.filter((a: any) => a.status !== 'at work' && a.status !== 'present' && a.status !== 'late').length,
        late: dayAttendance.filter((a: any) => a.status === 'late').length,
      };
    });
    return last7Days;
  }, [filteredHistoricalAttendance, selectedDate]);

  // Asset usage pattern over last 7 days
  const assetUsageData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(selectedDate, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      let bookedIn = 0;
      let bookedOut = 0;
      
      // Use filtered historical records for team leaders
      const recordsToUse = user?.role === 'team_leader' ? historicalRecords : historicalRecordsRaw;
      
      recordsToUse.forEach(record => {
        if (record.date === dateStr) {
          Object.values(record.bookInRecords || {}).forEach((booking: any) => {
            if (booking.laptop === 'collected') bookedIn++;
            if (booking.headsets === 'collected') bookedIn++;
            if (booking.dongle === 'collected') bookedIn++;
          });
          Object.values(record.bookOutRecords || {}).forEach((booking: any) => {
            if (booking.laptop === 'returned') bookedOut++;
            if (booking.headsets === 'returned') bookedOut++;
            if (booking.dongle === 'returned') bookedOut++;
          });
        }
      });
      
      return {
        date: format(date, 'MMM dd'),
        bookedIn,
        bookedOut,
      };
    });
    return last7Days;
  }, [historicalRecordsRaw, historicalRecords, selectedDate, user?.role]);

  // Comparative analytics
  const yesterdayData = useMemo(() => {
    const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    const yesterdayAttendance = filteredHistoricalAttendance.filter((a: any) => 
      format(new Date(a.date), 'yyyy-MM-dd') === yesterday
    );
    return {
      present: yesterdayAttendance.filter((a: any) => a.status === 'at work' || a.status === 'present').length,
      rate: yesterdayAttendance.length > 0 
        ? ((yesterdayAttendance.filter((a: any) => a.status === 'at work' || a.status === 'present').length / yesterdayAttendance.length) * 100).toFixed(1)
        : '0'
    };
  }, [filteredHistoricalAttendance, selectedDate]);

  // Export functionality
  const handleExport = () => {
    const reportData = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      stats,
      assets,
      attendanceData,
      teamPerformance: teamPerformanceData,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${format(selectedDate, 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stat card component
  const StatCard = ({ title, value, change, iconType, trend }: any) => {
    const iconColorClass = iconType === 'users' ? ICON_COLORS.users
      : iconType === 'userCheck' ? ICON_COLORS.userCheck
      : iconType === 'building' ? ICON_COLORS.building
      : ICON_COLORS.laptop;

    const IconComponent = iconType === 'users' ? Users
      : iconType === 'userCheck' ? UserCheck
      : iconType === 'building' ? Building
      : Laptop;

    return (
      <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-label`}>
                {title}
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-bold" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-value`}>
                  {value}
                </h3>
                {change && (
                  <span className={`text-sm font-medium flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {change}
                  </span>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${iconColorClass}`}>
              <IconComponent className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6" data-testid="page-reports">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Date Picker and Export */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-reports-heading">
              Reports & Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400" data-testid="text-reports-description">
              {isTeamLeader ? 'Team insights and performance metrics' : 'Comprehensive insights into your workforce management'}
            </p>
          </div>
          <div className="flex gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-select-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  data-testid="calendar-date-picker"
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleExport} variant="outline" data-testid="button-export-report">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isTeamLeader ? "Team Members" : "Total Employees"}
            value={stats.totalEmployees}
            iconType="users"
          />
          <StatCard
            title="Active Today"
            value={stats.presentToday}
            change={`${stats.attendanceRate}%`}
            iconType="userCheck"
            trend="up"
          />
          <StatCard
            title={isTeamLeader ? "My Teams" : "Total Teams"}
            value={stats.totalTeams}
            iconType="building"
          />
          <StatCard
            title="Assets Tracked"
            value={assets.totalBookedIn + assets.totalBookedOut}
            iconType="laptop"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-reports-main">
            <TabsTrigger value="reports" data-testid="tab-reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <Activity className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4" data-testid="content-reports">
            {/* Comparative Analytics */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-comparative-title">Comparative Analytics</CardTitle>
                <CardDescription>Today vs Yesterday comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-testid="comparison-today">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Today's Attendance</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.attendanceRate}%</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg" data-testid="comparison-yesterday">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Yesterday's Attendance</p>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{yesterdayData.rate}%</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid="comparison-change">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Change</p>
                    <p className={`text-2xl font-bold ${parseFloat(stats.attendanceRate) >= parseFloat(yesterdayData.rate) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(parseFloat(stats.attendanceRate) - parseFloat(yesterdayData.rate)).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Role Distribution */}
              <Card data-testid="chart-role-distribution">
                <CardHeader>
                  <CardTitle data-testid="text-role-distribution-title">Employee Role Distribution</CardTitle>
                  <CardDescription>Breakdown of employees by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Attendance Status */}
              <Card data-testid="chart-attendance-status">
                <CardHeader>
                  <CardTitle data-testid="text-attendance-status-title">Attendance Status</CardTitle>
                  <CardDescription>Today's attendance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.primary}>
                        {attendanceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Asset Status */}
              <Card data-testid="chart-asset-status">
                <CardHeader>
                  <CardTitle data-testid="text-asset-status-title">Asset Status Overview</CardTitle>
                  <CardDescription>Current status of assets</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={assetChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {assetChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Team Performance */}
              {!isTeamLeader && (
                <Card data-testid="chart-team-performance">
                  <CardHeader>
                    <CardTitle data-testid="text-team-performance-title">Team Performance</CardTitle>
                    <CardDescription>Team size and attendance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={teamPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="members" fill={COLORS.primary} name="Team Members" />
                        <Bar dataKey="attendance" fill={COLORS.success} name="Attendance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4" data-testid="content-analytics">
            <div className="grid grid-cols-1 gap-6">
              {/* Attendance Trend */}
              <Card data-testid="chart-attendance-trend">
                <CardHeader>
                  <CardTitle data-testid="text-attendance-trend-title">Attendance Trend (Last 7 Days)</CardTitle>
                  <CardDescription>Track attendance patterns over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={attendanceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="present" stroke={COLORS.success} strokeWidth={2} name="Present" />
                      <Line type="monotone" dataKey="absent" stroke={COLORS.danger} strokeWidth={2} name="Absent" />
                      <Line type="monotone" dataKey="late" stroke={COLORS.warning} strokeWidth={2} name="Late" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Asset Usage Pattern */}
              <Card data-testid="chart-asset-usage">
                <CardHeader>
                  <CardTitle data-testid="text-asset-usage-title">Asset Usage Pattern (Last 7 Days)</CardTitle>
                  <CardDescription>Monitor asset booking and return trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={assetUsageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="bookedIn" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} name="Booked In" />
                      <Area type="monotone" dataKey="bookedOut" stackId="2" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.6} name="Booked Out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Team Performance Comparison Over Days */}
              {!isTeamLeader && teamPerformanceData.length > 0 && (
                <Card data-testid="chart-team-comparison">
                  <CardHeader>
                    <CardTitle data-testid="text-team-comparison-title">Team Performance Comparison</CardTitle>
                    <CardDescription>Compare team metrics side by side</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={teamPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="members" fill={COLORS.primary} name="Team Size" />
                        <Bar dataKey="attendance" fill={COLORS.success} name="Attendance Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Advanced Metrics Summary */}
              <Card>
                <CardHeader>
                  <CardTitle data-testid="text-advanced-metrics-title">Advanced Metrics</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-lg" data-testid="metric-attendance-rate">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance Rate Trend</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.attendanceRate}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {parseFloat(stats.attendanceRate) >= parseFloat(yesterdayData.rate) ? 'Improving' : 'Declining'}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-lg" data-testid="metric-asset-utilization">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Asset Utilization</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {assets.totalBookedIn > 0 ? Math.round((assets.totalBookedOut / assets.totalBookedIn) * 100) : 0}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Return rate</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg" data-testid="metric-team-productivity">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Productivity</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Active workforce</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4" data-testid="content-history">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-historical-data-title">Historical Data for {format(selectedDate, 'PPP')}</CardTitle>
                <CardDescription>View detailed records for the selected date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Historical Attendance Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Attendance Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid="history-present">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.presentToday}</p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg" data-testid="history-absent">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absentToday}</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg" data-testid="history-late">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Late</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.lateToday}</p>
                      </div>
                    </div>
                  </div>

                  {/* Historical Asset Records */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Asset Transactions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-testid="history-booked-in">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Assets Booked In</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{assets.totalBookedIn}</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid="history-booked-out">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Assets Returned</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{assets.totalBookedOut}</p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg" data-testid="history-lost">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Lost Assets</p>
                        </div>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{assets.totalLost}</p>
                      </div>
                    </div>
                  </div>

                  {/* Date Range Selector Info */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Historical Date Selection</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Use the date picker in the header to view historical data for any past date. 
                          All metrics and charts will automatically update to reflect the selected date.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
