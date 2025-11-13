import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { 
  LogOut, 
  Users, 
  CalendarDays, 
  Package, 
  ArrowRightLeft, 
  UserX,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

export default function ContactCenterDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string | null>(null);
  
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgo.toISOString().split('T')[0]);
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

  const { data: teamLeaders = [], isLoading: isLoadingTeamLeaders } = useQuery<User[]>({
    queryKey: ["/api/managers", user?.id, "team-leaders"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/managers/${user.id}/team-leaders`);
      return await response.json() as User[];
    },
    enabled: !!user?.id && (user.role === 'contact_center_manager' || user.role === 'contact_center_ops_manager' || user.role === 'admin'),
  });

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
    if (teamLeaders.length > 0 && !selectedTeamLeaderId) {
      setSelectedTeamLeaderId(teamLeaders[0].id);
    }
  }, [teamLeaders, selectedTeamLeaderId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager' && user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Contact Center Manager role required.</div>;
  }

  if (isLoadingTeamLeaders) {
    return <div className="flex items-center justify-center min-h-screen">Loading team leaders...</div>;
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

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'}
                </p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Team Leaders</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {teamLeaders.map((leader) => (
                    <SidebarMenuItem key={leader.id}>
                      <SidebarMenuButton
                        onClick={() => setSelectedTeamLeaderId(leader.id)}
                        isActive={selectedTeamLeaderId === leader.id}
                        data-testid={`button-team-leader-${leader.id}`}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {leader.firstName?.[0] || ''}{leader.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {leader.firstName} {leader.lastName}
                          </p>
                          {leader.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {leader.email}
                            </p>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
              {selectedTeamLeader && (
                <Badge variant="outline">
                  {selectedTeamLeader.firstName} {selectedTeamLeader.lastName}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {!selectedTeamLeaderId ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a team leader to view analytics</p>
              </div>
            ) : isLoadingAnalytics ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            ) : !analytics ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No analytics data available</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Date Range Filter</CardTitle>
                    <CardDescription>Select the date range for analytics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          data-testid="input-start-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          data-testid="input-end-date"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-attendance-rate">
                        {analytics.attendance.presentPercentage}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.attendance.present} present / {analytics.attendance.total} total
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Absent: {analytics.attendance.absentPercentage}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Late: {analytics.attendance.latePercentage}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Asset Compliance</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-asset-compliance">
                        {analytics.assets.complianceRate}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.assets.unreturned} unreturned, {analytics.assets.lost} lost
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Issued: {analytics.assets.issued}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Returned: {analytics.assets.returned}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Transfers</CardTitle>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-transfers-total">
                        {analytics.transfers.total}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.transfers.pending} pending
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Approved: {analytics.transfers.approved}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Completed: {analytics.transfers.completed}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Terminations</CardTitle>
                      <UserX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-terminations-total">
                        {analytics.terminations.total}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Team: {analytics.teamMembers.active}/{analytics.teamMembers.total} active
                      </p>
                      {Object.keys(analytics.terminations.byType).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(analytics.terminations.byType).map(([type, count]) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}: {count}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {analytics.attendance.trend.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Trend</CardTitle>
                      <CardDescription>Daily attendance breakdown over the selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.attendance.trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" strokeWidth={2} />
                          <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" strokeWidth={2} />
                          <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Summary</CardTitle>
                      <CardDescription>Breakdown by status</CardDescription>
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
                            <TableCell className="font-medium">
                              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                                Present
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid="text-attendance-present">
                              {analytics.attendance.present}
                            </TableCell>
                            <TableCell className="text-right">
                              {analytics.attendance.presentPercentage}%
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
                                Late
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid="text-attendance-late">
                              {analytics.attendance.late}
                            </TableCell>
                            <TableCell className="text-right">
                              {analytics.attendance.latePercentage}%
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                                Absent
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid="text-attendance-absent">
                              {analytics.attendance.absent}
                            </TableCell>
                            <TableCell className="text-right">
                              {analytics.attendance.absentPercentage}%
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Asset Management</CardTitle>
                      <CardDescription>Asset tracking details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Issued</TableCell>
                            <TableCell className="text-right" data-testid="text-assets-issued">
                              {analytics.assets.issued}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Returned</TableCell>
                            <TableCell className="text-right" data-testid="text-assets-returned">
                              {analytics.assets.returned}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              <Badge variant="destructive">Unreturned</Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid="text-assets-unreturned">
                              {analytics.assets.unreturned}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              <Badge variant="destructive">Lost</Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid="text-assets-lost">
                              {analytics.assets.lost}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
