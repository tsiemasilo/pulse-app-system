import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard-stats";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PieChart,
  Pie,
  Cell,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { 
  LogOut, 
  Users, 
  Package, 
  ArrowRightLeft, 
  UserX,
  Search,
  Calendar,
  BarChart3,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck
} from "lucide-react";
import type { User } from "@shared/schema";

interface Analytics {
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
    presentPercentage: number;
    absentPercentage: number;
    latePercentage: number;
    trend: Array<{ date: string; present: number; absent: number; late: number }>;
  };
  assets: {
    issued: number;
    returned: number;
    unreturned: number;
    lost: number;
    complianceRate: number;
  };
  transfers: {
    pending: number;
    approved: number;
    completed: number;
    total: number;
  };
  terminations: {
    total: number;
    byType: Record<string, number>;
  };
  teamMembers: {
    total: number;
    active: number;
  };
}

type DatePreset = 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export default function ContactCenterDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>('last30');
  
  const today = new Date();
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(today.toISOString().split('T')[0]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.reload();
    }
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    
    switch (preset) {
      case 'last7':
        setStartDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'last30':
        setStartDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'thisMonth':
        setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(lastMonth.toISOString().split('T')[0]);
        setEndDate(lastMonthEnd.toISOString().split('T')[0]);
        break;
    }
  };

  const { data: teamLeaders = [], isLoading: isLoadingTeamLeaders } = useQuery<User[]>({
    queryKey: ["/api/managers", user?.id, "team-leaders"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/managers/${user.id}/team-leaders`);
      return await response.json() as User[];
    },
    enabled: !!user?.id && (user.role === 'contact_center_manager' || user.role === 'contact_center_ops_manager' || user.role === 'admin'),
  });

  const filteredTeamLeaders = useMemo(() => {
    if (!searchQuery) return teamLeaders;
    const query = searchQuery.toLowerCase();
    return teamLeaders.filter(leader => 
      `${leader.firstName} ${leader.lastName}`.toLowerCase().includes(query) ||
      leader.email?.toLowerCase().includes(query) ||
      leader.username.toLowerCase().includes(query)
    );
  }, [teamLeaders, searchQuery]);

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<Analytics>({
    queryKey: ["/api/managers/analytics", selectedTeamLeaderId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      const response = await apiRequest("GET", `/api/managers/analytics/${selectedTeamLeaderId}?${params}`);
      return await response.json() as Analytics;
    },
    enabled: !!selectedTeamLeaderId,
  });

  useEffect(() => {
    if (filteredTeamLeaders.length > 0 && !selectedTeamLeaderId) {
      setSelectedTeamLeaderId(filteredTeamLeaders[0].id);
    }
  }, [filteredTeamLeaders, selectedTeamLeaderId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Activity className="h-12 w-12 animate-pulse mx-auto text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager' && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">Contact Center Manager role required.</p>
            <Button onClick={handleLogout} variant="outline" data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingTeamLeaders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Users className="h-12 w-12 animate-pulse mx-auto text-primary" />
          <p className="text-muted-foreground">Loading team leaders...</p>
        </div>
      </div>
    );
  }

  if (teamLeaders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-bold">No Team Leaders Found</h2>
              <p className="text-muted-foreground">
                You don't have any team leaders assigned to you yet. Contact your administrator to assign team leaders.
              </p>
              <Button onClick={handleLogout} className="mt-4" data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedTeamLeader = teamLeaders.find(tl => tl.id === selectedTeamLeaderId);

  // Prepare chart data with null guards
  const attendanceChartData = analytics?.attendance?.trend?.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })) || [];

  const attendanceDistributionData = analytics?.attendance ? [
    { name: 'Present', value: analytics.attendance.present || 0, color: '#10b981' },
    { name: 'Late', value: analytics.attendance.late || 0, color: '#f59e0b' },
    { name: 'Absent', value: analytics.attendance.absent || 0, color: '#ef4444' }
  ] : [];

  const assetStatusData = analytics?.assets ? [
    { name: 'Returned', value: analytics.assets.returned || 0, color: '#10b981' },
    { name: 'Unreturned', value: analytics.assets.unreturned || 0, color: '#f59e0b' },
    { name: 'Lost', value: analytics.assets.lost || 0, color: '#ef4444' }
  ] : [];

  const transfersData = analytics?.transfers ? [
    { name: 'Pending', value: analytics.transfers.pending || 0, color: '#f59e0b' },
    { name: 'Approved', value: analytics.transfers.approved || 0, color: '#3b82f6' },
    { name: 'Completed', value: analytics.transfers.completed || 0, color: '#10b981' }
  ] : [];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-3 p-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-base font-bold">Manager Dashboard</h2>
                <p className="text-xs text-muted-foreground">Team Analytics</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Team Leaders</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-9 bg-background"
                      data-testid="input-search-leaders"
                    />
                  </div>
                </div>
                <SidebarMenu>
                  {filteredTeamLeaders.map((leader) => (
                    <SidebarMenuItem key={leader.id}>
                      <SidebarMenuButton
                        isActive={selectedTeamLeaderId === leader.id}
                        onClick={() => setSelectedTeamLeaderId(leader.id)}
                        data-testid={`button-leader-${leader.id}`}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {leader.firstName?.[0] || ''}{leader.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{leader.firstName} {leader.lastName}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {selectedTeamLeader && (
              <SidebarGroup>
                <SidebarGroupLabel>Leader Details</SidebarGroupLabel>
                <SidebarGroupContent className="px-2 space-y-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="font-medium truncate text-xs">{selectedTeamLeader.email || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Username</span>
                    <span className="font-medium text-xs">{selectedTeamLeader.username}</span>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Team Performance & Analytics</h1>
                <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400">
                  {user.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'} Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 space-y-6">
              {/* Welcome Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 sm:p-6 border border-blue-100 dark:border-blue-800/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-welcome-greeting">
                      Welcome back, {user.firstName || 'Manager'}
                    </h2>
                    <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400">
                      Monitor your team leaders' performance and analytics
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Today</p>
                    <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white" data-testid="text-current-date">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preset">Quick Select</Label>
                      <Select value={datePreset} onValueChange={(value) => handleDatePresetChange(value as DatePreset)}>
                        <SelectTrigger id="preset" data-testid="select-date-preset">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last7">Last 7 Days</SelectItem>
                          <SelectItem value="last30">Last 30 Days</SelectItem>
                          <SelectItem value="thisMonth">This Month</SelectItem>
                          <SelectItem value="lastMonth">Last Month</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        disabled={datePreset !== 'custom'}
                        data-testid="input-start-date"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        disabled={datePreset !== 'custom'}
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!selectedTeamLeaderId ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Select a team leader to view analytics</p>
                    </div>
                  </CardContent>
                </Card>
              ) : isLoadingAnalytics ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <Activity className="h-12 w-12 mx-auto text-primary animate-pulse" />
                      <p className="text-muted-foreground">Loading analytics...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : !analytics ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">No analytics data available</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* KPI Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                    <StatCard
                      title="Attendance Rate"
                      value={`${analytics.attendance?.presentPercentage?.toFixed(1) || '0.0'}%`}
                      icon={UserCheck}
                      cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
                      textColor="text-green-600 dark:text-green-400"
                      iconBgColor="bg-green-100 dark:bg-green-900/50"
                      iconColor="text-green-600 dark:text-green-400"
                      testId="text-attendance-rate"
                    />
                    <StatCard
                      title="Asset Compliance"
                      value={`${analytics.assets?.complianceRate?.toFixed(1) || '0.0'}%`}
                      icon={Package}
                      cardColor="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30"
                      textColor="text-blue-600 dark:text-blue-400"
                      iconBgColor="bg-blue-100 dark:bg-blue-900/50"
                      iconColor="text-blue-600 dark:text-blue-400"
                      testId="text-asset-compliance"
                    />
                    <StatCard
                      title="Total Transfers"
                      value={analytics.transfers?.total || 0}
                      icon={ArrowRightLeft}
                      cardColor="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800/30"
                      textColor="text-purple-600 dark:text-purple-400"
                      iconBgColor="bg-purple-100 dark:bg-purple-900/50"
                      iconColor="text-purple-600 dark:text-purple-400"
                      testId="text-transfers-total"
                    />
                    <StatCard
                      title="Active Members"
                      value={analytics.teamMembers?.active || 0}
                      icon={Users}
                      cardColor="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800/30"
                      textColor="text-orange-600 dark:text-orange-400"
                      iconBgColor="bg-orange-100 dark:bg-orange-900/50"
                      iconColor="text-orange-600 dark:text-orange-400"
                      testId="text-team-members"
                    />
                  </div>

                  <Tabs defaultValue="attendance" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                      <TabsTrigger value="attendance" data-testid="tab-attendance">
                        <Users className="h-4 w-4 mr-2" />
                        Attendance
                      </TabsTrigger>
                      <TabsTrigger value="assets" data-testid="tab-assets">
                        <Package className="h-4 w-4 mr-2" />
                        Assets
                      </TabsTrigger>
                      <TabsTrigger value="operations" data-testid="tab-operations">
                        <Activity className="h-4 w-4 mr-2" />
                        Operations
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="attendance" className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Attendance Trend</CardTitle>
                            <CardDescription>Daily attendance over selected period</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {attendanceChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={attendanceChartData}>
                                  <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    className="text-muted-foreground"
                                  />
                                  <YAxis className="text-muted-foreground" />
                                  <Tooltip />
                                  <Legend />
                                  <Area 
                                    type="monotone" 
                                    dataKey="present" 
                                    stroke="#10b981" 
                                    fillOpacity={1}
                                    fill="url(#colorPresent)"
                                    name="Present" 
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="late" 
                                    stroke="#f59e0b" 
                                    fillOpacity={1}
                                    fill="url(#colorLate)"
                                    name="Late" 
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="absent" 
                                    stroke="#ef4444" 
                                    fillOpacity={1}
                                    fill="url(#colorAbsent)"
                                    name="Absent" 
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-[300px]">
                                <p className="text-muted-foreground">No attendance data available</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Attendance Distribution</CardTitle>
                            <CardDescription>Breakdown by status</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {attendanceDistributionData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={attendanceDistributionData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {attendanceDistributionData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-[300px]">
                                <p className="text-muted-foreground">No attendance data available</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Detailed Attendance Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">Percentage</TableHead>
                                <TableHead className="text-right">Of Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500" />
                                    <span className="font-medium">Present</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold" data-testid="text-attendance-present">
                                  {analytics.attendance?.present || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                                    {analytics.attendance?.presentPercentage?.toFixed(1) || '0.0'}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {analytics.attendance?.total && analytics.attendance.total > 0 
                                    ? ((analytics.attendance.present / analytics.attendance.total) * 100).toFixed(1)
                                    : '0'}%
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                    <span className="font-medium">Late</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold" data-testid="text-attendance-late">
                                  {analytics.attendance?.late || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                                    {analytics.attendance?.latePercentage?.toFixed(1) || '0.0'}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {analytics.attendance?.total && analytics.attendance.total > 0 
                                    ? ((analytics.attendance.late / analytics.attendance.total) * 100).toFixed(1)
                                    : '0'}%
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-red-500" />
                                    <span className="font-medium">Absent</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold" data-testid="text-attendance-absent">
                                  {analytics.attendance?.absent || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950">
                                    {analytics.attendance?.absentPercentage?.toFixed(1) || '0.0'}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {analytics.attendance?.total && analytics.attendance.total > 0 
                                    ? ((analytics.attendance.absent / analytics.attendance.total) * 100).toFixed(1)
                                    : '0'}%
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="assets" className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Asset Status Distribution</CardTitle>
                            <CardDescription>Current asset allocation</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {assetStatusData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={assetStatusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {assetStatusData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-[300px]">
                                <p className="text-muted-foreground">No asset data available</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Asset Compliance Details</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Assets Issued</p>
                                    <p className="text-xs text-muted-foreground">Total distributed</p>
                                  </div>
                                </div>
                                <div className="text-2xl font-bold">{analytics.assets?.issued || 0}</div>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Assets Returned</p>
                                    <p className="text-xs text-muted-foreground">Successfully returned</p>
                                  </div>
                                </div>
                                <div className="text-2xl font-bold">{analytics.assets?.returned || 0}</div>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-500/10">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Unreturned Assets</p>
                                    <p className="text-xs text-muted-foreground">Still with agents</p>
                                  </div>
                                </div>
                                <div className="text-2xl font-bold">{analytics.assets?.unreturned || 0}</div>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500/10">
                                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Lost Assets</p>
                                    <p className="text-xs text-muted-foreground">Reported as lost</p>
                                  </div>
                                </div>
                                <div className="text-2xl font-bold">{analytics.assets?.lost || 0}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="operations" className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Transfer Status</CardTitle>
                            <CardDescription>Current transfer pipeline</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {transfersData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={transfersData} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis type="number" className="text-muted-foreground" />
                                  <YAxis dataKey="name" type="category" className="text-muted-foreground" />
                                  <Tooltip />
                                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {transfersData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-[300px]">
                                <p className="text-muted-foreground">No transfer data available</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Team Operations Summary</CardTitle>
                            <CardDescription>Key operational metrics</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-500/10">
                                    <ArrowRightLeft className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Transfers</p>
                                    <p className="text-xs text-muted-foreground">All transfer requests</p>
                                  </div>
                                </div>
                                <div className="text-2xl font-bold">{analytics.transfers?.total || 0}</div>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/10">
                                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Active Team Members</p>
                                    <p className="text-xs text-muted-foreground">Currently active</p>
                                  </div>
                                </div>
                                <div className="text-2xl font-bold">{analytics.teamMembers?.active || 0}</div>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-500/10">
                                    <UserX className="h-5 w-5 text-gray-600 dark:text-gray-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Terminations</p>
                                    <p className="text-xs text-muted-foreground">Period exits</p>
                                  </div>
                                </div>
                                <div className="text-2xl font-bold" data-testid="text-terminations-total">{analytics.terminations?.total || 0}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Transfer Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Count</TableHead>
                                  <TableHead className="text-right">Percentage</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                      <span className="font-medium">Pending</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-bold">
                                    {analytics.transfers?.pending || 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                                      {analytics.transfers?.total && analytics.transfers.total > 0 
                                        ? ((analytics.transfers.pending / analytics.transfers.total) * 100).toFixed(1)
                                        : '0'}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                                      <span className="font-medium">Approved</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-bold">
                                    {analytics.transfers?.approved || 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                                      {analytics.transfers?.total && analytics.transfers.total > 0 
                                        ? ((analytics.transfers.approved / analytics.transfers.total) * 100).toFixed(1)
                                        : '0'}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-3 w-3 rounded-full bg-green-500" />
                                      <span className="font-medium">Completed</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-bold">
                                    {analytics.transfers?.completed || 0}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                                      {analytics.transfers?.total && analytics.transfers.total > 0 
                                        ? ((analytics.transfers.completed / analytics.transfers.total) * 100).toFixed(1)
                                        : '0'}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>

                        {analytics.terminations?.byType && Object.keys(analytics.terminations.byType).length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Termination Reasons</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(analytics.terminations.byType).map(([type, count]) => (
                                    <TableRow key={type}>
                                      <TableCell className="font-medium capitalize">
                                        {type.replace(/_/g, ' ')}
                                      </TableCell>
                                      <TableCell className="text-right font-bold">{count}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
