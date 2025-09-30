import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
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
  Calendar,
  Activity,
  Package
} from "lucide-react";

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  teal: "#14b8a6"
};

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.teal];

// Color mappings for icons
const ICON_COLORS = {
  users: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
  userCheck: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
  building: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
  laptop: "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400",
};

export default function Reports() {
  const [selectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Fetch all users
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch attendance data using correct endpoint
  const { data: attendanceData = [] } = useQuery<any[]>({
    queryKey: ["/api/attendance/today"],
  });

  // Fetch teams data
  const { data: teamsData = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // Fetch historical asset records
  const { data: historicalRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/historical-asset-records', selectedDate],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/historical-asset-records?date=${queryKey[1]}`);
      if (!response.ok) throw new Error('Failed to fetch records');
      return response.json();
    },
  });

  // Fetch asset loss records
  const { data: assetLossRecords = [] } = useQuery<any[]>({
    queryKey: ['/api/asset-loss', selectedDate],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/asset-loss?date=${queryKey[1]}`);
      if (!response.ok) throw new Error('Failed to fetch loss records');
      return response.json();
    },
  });

  // Calculate statistics
  const stats = {
    totalEmployees: allUsers.length,
    activeEmployees: allUsers.filter(u => u.isActive).length,
    totalTeams: teamsData.length,
    presentToday: attendanceData.filter(a => a.status === 'present').length,
    absentToday: attendanceData.filter(a => a.status === 'absent').length,
    lateToday: attendanceData.filter(a => a.status === 'late').length,
    attendanceRate: attendanceData.length > 0 
      ? ((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100).toFixed(1)
      : '0',
  };

  // Calculate asset statistics
  const assetStats = () => {
    let totalBookedIn = 0;
    let totalBookedOut = 0;
    let totalLost = assetLossRecords.length;

    const dayRecords = historicalRecords.filter(r => r.date === selectedDate);
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

  // Role distribution data for charts
  const roleDistribution = allUsers.reduce((acc, user) => {
    const role = user.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const roleChartData = Object.entries(roleDistribution).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value
  }));

  // Attendance status data for charts
  const attendanceChartData = [
    { name: 'Present', value: stats.presentToday, color: COLORS.success },
    { name: 'Absent', value: stats.absentToday, color: COLORS.danger },
    { name: 'Late', value: stats.lateToday, color: COLORS.warning },
  ];

  // Asset status data for charts
  const assetChartData = [
    { name: 'Booked In', value: assets.totalBookedIn, color: COLORS.primary },
    { name: 'Booked Out', value: assets.totalBookedOut, color: COLORS.success },
    { name: 'Lost', value: assets.totalLost, color: COLORS.danger },
  ];

  // Calculate real team performance data from actual attendance
  const teamPerformanceData = teamsData.map((team) => {
    const teamMemberIds = allUsers
      .filter(u => u.teamId === team.id)
      .map(u => u.id);
    
    const teamAttendance = attendanceData.filter(a => 
      teamMemberIds.includes(a.userId)
    );
    
    const presentCount = teamAttendance.filter(a => a.status === 'present').length;
    const attendancePercentage = teamAttendance.length > 0 
      ? Math.round((presentCount / teamAttendance.length) * 100)
      : 0;

    return {
      name: team.name || 'Unnamed Team',
      members: teamMemberIds.length,
      attendance: attendancePercentage,
    };
  });

  // Stat card component with explicit color classes
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
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-reports-heading">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400" data-testid="text-reports-description">
            Comprehensive insights into your workforce management
          </p>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
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
            title="Total Teams"
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
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-reports-categories">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <Calendar className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="assets" data-testid="tab-assets">
              <Package className="h-4 w-4 mr-2" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="teams" data-testid="tab-teams">
              <Building className="h-4 w-4 mr-2" />
              Teams
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4" data-testid="content-overview">
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

              {/* Quick Stats Summary */}
              <Card>
                <CardHeader>
                  <CardTitle data-testid="text-quick-stats-title">Today's Summary</CardTitle>
                  <CardDescription>Real-time workforce metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid="stat-active-employees">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Employees</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeEmployees}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-testid="stat-attendance-rate">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance Rate</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.attendanceRate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg" data-testid="stat-assets-managed">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assets Managed</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {assets.totalBookedIn + assets.totalBookedOut}
                      </p>
                    </div>
                    <Laptop className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4" data-testid="content-attendance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Attendance Details */}
              <Card>
                <CardHeader>
                  <CardTitle data-testid="text-attendance-details-title">Attendance Details</CardTitle>
                  <CardDescription>Detailed breakdown of today's attendance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid="detail-present">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">Present</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">On time arrivals</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.presentToday}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg" data-testid="detail-absent">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                          <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium">Absent</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Not present today</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absentToday}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg" data-testid="detail-late">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium">Late</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Arrived late</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.lateToday}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-4" data-testid="content-assets">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Asset Status Chart */}
              <Card data-testid="chart-asset-status">
                <CardHeader>
                  <CardTitle data-testid="text-asset-status-title">Asset Status Overview</CardTitle>
                  <CardDescription>Current status of all assets</CardDescription>
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

              {/* Asset Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle data-testid="text-asset-stats-title">Asset Statistics</CardTitle>
                  <CardDescription>Detailed asset metrics for today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-testid="stat-booked-in">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">Booked In</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Assets checked out</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{assets.totalBookedIn}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid="stat-booked-out">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">Booked Out</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Assets returned</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{assets.totalBookedOut}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg" data-testid="stat-lost">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                          <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium">Lost Assets</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Reported missing</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">{assets.totalLost}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4" data-testid="content-teams">
            <div className="grid grid-cols-1 gap-6">
              {/* Team Performance */}
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

              {/* Team Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card data-testid="card-total-teams">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Teams</p>
                        <p className="text-3xl font-bold mt-2">{stats.totalTeams}</p>
                      </div>
                      <Building className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-avg-team-size">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Team Size</p>
                        <p className="text-3xl font-bold mt-2">
                          {stats.totalTeams > 0 ? Math.round(stats.totalEmployees / stats.totalTeams) : 0}
                        </p>
                      </div>
                      <Users className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-team-efficiency">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Efficiency</p>
                        <p className="text-3xl font-bold mt-2">{stats.attendanceRate}%</p>
                      </div>
                      <TrendingUp className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
