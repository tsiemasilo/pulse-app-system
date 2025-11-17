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
import { StatCard } from "@/components/dashboard-stats";
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
  UserCheck,
  Bell,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";
import type { User, Transfer } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

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
type ActiveSection = 'attendance' | 'assets' | 'operations' | 'approvals';

export default function ContactCenterDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>('last30');
  const [activeSection, setActiveSection] = useState<ActiveSection>('attendance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const today = new Date();
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(today.toISOString().split('T')[0]);

  // Scroll to top when section changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

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

  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/transfers");
      return await response.json() as Transfer[];
    },
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: activeSection === 'approvals',
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  const approveMutation = useMutation({
    mutationFn: async (transferId: string) => {
      return await apiRequest("PATCH", `/api/transfers/${transferId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      toast({
        title: "Success",
        description: "Transfer approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve transfer",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (transferId: string) => {
      return await apiRequest("PATCH", `/api/transfers/${transferId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      toast({
        title: "Success",
        description: "Transfer rejected successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject transfer",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (transferId: string) => {
      return await apiRequest("POST", `/api/transfers/${transferId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      toast({
        title: "Success",
        description: "Transfer completed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete transfer",
        variant: "destructive",
      });
    },
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

  // Navigation sections
  const sidebarSections = [
    {
      title: 'ATTENDANCE',
      icon: Clock,
      key: 'attendance' as ActiveSection,
    },
    {
      title: 'ASSETS',
      icon: Package,
      key: 'assets' as ActiveSection,
    },
    {
      title: 'OPERATIONS',
      icon: Activity,
      key: 'operations' as ActiveSection,
    },
    {
      title: 'APPROVALS',
      icon: CheckCircle2,
      key: 'approvals' as ActiveSection,
    },
  ];

  // Get dynamic header title and subtitle
  const getHeaderTitle = () => {
    switch (activeSection) {
      case 'attendance':
        return 'Attendance Management';
      case 'assets':
        return 'Asset Management';
      case 'operations':
        return 'Operations Management';
      case 'approvals':
        return 'Transfer Approvals';
      default:
        return 'Team Analytics';
    }
  };

  const getHeaderSubtitle = () => {
    switch (activeSection) {
      case 'attendance':
        return 'Monitor team attendance and presence';
      case 'assets':
        return 'Track asset allocation and compliance';
      case 'operations':
        return 'Oversee transfers and operations';
      case 'approvals':
        return 'Review and manage transfer requests';
      default:
        return 'Team Performance & Analytics';
    }
  };

  // Render main content based on active section
  const renderMainContent = () => {
    if (!selectedTeamLeaderId) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Users className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Select a team leader to view analytics</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (isLoadingAnalytics) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Activity className="h-12 w-12 mx-auto text-primary animate-pulse" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!analytics) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No analytics data available</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    switch (activeSection) {
      case 'attendance':
        return (
          <div className="space-y-4">
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
          </div>
        );

      case 'assets':
        return (
          <div className="space-y-4">
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
          </div>
        );

      case 'operations':
        return (
          <div className="space-y-4">
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
          </div>
        );

      case 'approvals':
        const getUserName = (userId: string) => {
          const user = allUsers.find(u => u.id === userId);
          return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
        };

        const getTeamName = (teamId: string | null | undefined) => {
          if (!teamId) return null;
          const team = teams.find((t: any) => t.id === teamId);
          return team?.name || 'Unknown Team';
        };

        const getDepartmentName = (deptId: string | null | undefined) => {
          if (!deptId) return null;
          const department = departments.find((d: any) => d.id === deptId);
          return department?.name || 'Unknown Department';
        };

        const getFromTeamDept = (transfer: Transfer) => {
          const teamName = getTeamName(transfer.fromTeamId);
          const deptName = getDepartmentName(transfer.fromDepartmentId);
          
          if (teamName && deptName) return `${teamName} / ${deptName}`;
          if (teamName) return teamName;
          if (deptName) return deptName;
          return 'N/A';
        };

        const getToTeamDept = (transfer: Transfer) => {
          const teamName = getTeamName(transfer.toTeamId);
          const deptName = getDepartmentName(transfer.toDepartmentId);
          
          if (teamName && deptName) return `${teamName} / ${deptName}`;
          if (teamName) return teamName;
          if (deptName) return deptName;
          return 'N/A';
        };

        const getStatusBadgeVariant = (status: string) => {
          switch (status) {
            case 'pending':
              return 'default';
            case 'approved':
              return 'default';
            case 'rejected':
              return 'destructive';
            case 'completed':
              return 'default';
            default:
              return 'default';
          }
        };

        const getStatusColor = (status: string) => {
          switch (status) {
            case 'pending':
              return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';
            case 'approved':
              return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400';
            case 'rejected':
              return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400';
            case 'completed':
              return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
            default:
              return '';
          }
        };

        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Requests</CardTitle>
                <CardDescription>Review and manage transfer requests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransfers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <Activity className="h-12 w-12 mx-auto text-primary animate-pulse" />
                      <p className="text-muted-foreground">Loading transfers...</p>
                    </div>
                  </div>
                ) : transfers.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">No transfer requests found</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead>From Team/Dept</TableHead>
                          <TableHead>To Team/Dept</TableHead>
                          <TableHead>Transfer Type</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Requested By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfers.map((transfer) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">
                              {getUserName(transfer.userId)}
                            </TableCell>
                            <TableCell>
                              {getFromTeamDept(transfer)}
                            </TableCell>
                            <TableCell>
                              {getToTeamDept(transfer)}
                            </TableCell>
                            <TableCell className="capitalize">
                              {transfer.transferType}
                            </TableCell>
                            <TableCell>
                              {new Date(transfer.startDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={getStatusBadgeVariant(transfer.status)}
                                className={getStatusColor(transfer.status)}
                                data-testid={`badge-status-${transfer.id}`}
                              >
                                {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getUserName(transfer.requestedBy)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {transfer.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => approveMutation.mutate(transfer.id)}
                                      disabled={approveMutation.isPending}
                                      data-testid={`button-approve-${transfer.id}`}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => rejectMutation.mutate(transfer.id)}
                                      disabled={rejectMutation.isPending}
                                      data-testid={`button-reject-${transfer.id}`}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {transfer.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => completeMutation.mutate(transfer.id)}
                                    disabled={completeMutation.isPending}
                                    data-testid={`button-complete-${transfer.id}`}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                {(transfer.status === 'rejected' || transfer.status === 'completed') && (
                                  <span className="text-sm text-muted-foreground">No actions</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex-col h-screen sticky top-0">
        <div className="h-[88px] px-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
          <img 
            src={alteramLogo} 
            alt="Alteram Solutions" 
            className="h-12 w-auto max-w-full object-contain"
          />
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search anything.." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
              data-testid="input-search-leaders"
            />
          </div>
          
          <nav className="space-y-6 flex-1">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                ANALYTICS
              </h3>
              <ul className="space-y-1">
                {sidebarSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.key;
                  return (
                    <li key={section.key}>
                      <button
                        onClick={() => setActiveSection(section.key)}
                        className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                          isActive 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        data-testid={`tab-${section.key}`}
                      >
                        <Icon className={`mr-3 h-5 w-5 ${
                          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`} />
                        {section.title.charAt(0) + section.title.slice(1).toLowerCase()}
                        {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="h-[60px] px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <img src={alteramLogo} alt="Alteram Solutions" className="h-8 w-auto" />
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100vh-60px)]">
              <nav className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    ANALYTICS
                  </h3>
                  <ul className="space-y-1">
                    {sidebarSections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.key;
                      return (
                        <li key={section.key}>
                          <button
                            onClick={() => {
                              setActiveSection(section.key);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                              isActive 
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                            {section.title.charAt(0) + section.title.slice(1).toLowerCase()}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2 transition-all duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                data-testid="button-mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {getHeaderTitle()}
                </h1>
                <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 hidden sm:block">
                  {getHeaderSubtitle()}
                </p>
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden sm:flex"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  3
                </span>
              </Button>

              <div className="hidden sm:flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-1.5 border border-border">
                <div className="flex flex-col items-end justify-center">
                  <span className="text-sm font-semibold text-foreground leading-tight" data-testid="text-username">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.username || 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight" data-testid="text-user-role">
                    {user.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'}
                  </span>
                </div>
                <div className="h-8 w-px bg-border"></div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  <span className="text-sm">Logout</span>
                </Button>
              </div>

              {/* Mobile logout button */}
              <div className="sm:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="p-2"
                  data-testid="button-logout-mobile"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="fade-in">
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

              {/* Team Leader Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Team Leader</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedTeamLeaderId || undefined} onValueChange={setSelectedTeamLeaderId}>
                    <SelectTrigger data-testid="select-team-leader">
                      <SelectValue placeholder="Choose a team leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTeamLeaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {leader.firstName} {leader.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Date Range */}
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

              {/* KPI Stats Cards */}
              {analytics && (
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
              )}

            {/* Main Content Area */}
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
