import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import UserManagementTable from "@/components/user-management-table";
import TransferManagement from "@/components/transfer-management";
import TerminationManagement from "@/components/termination-management";
import AssetManagement from "@/components/asset-management";
import HRAttendanceView from "@/components/hr-attendance-view";
import AttendanceTable from "@/components/attendance-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, Building2, Laptop, AlertTriangle, Shield, UserCheck, 
  CalendarX, UserX, ArrowLeftRight, Headphones, TrendingUp, 
  Clock, Calendar, Star, Settings 
} from "lucide-react";
import type { User, Asset, Attendance, Team } from "@shared/schema";

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  // Redirect if not authenticated
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

  if (user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Admin role required.</div>;
  }

  // Calculate stats for different views
  const activeUsers = allUsers.filter(u => u.isActive).length;
  const activeAssets = assets.filter(a => a.status === 'assigned').length;
  const issues = assets.filter(a => a.status === 'missing').length;
  const agents = allUsers.filter(u => u.role === 'agent' && u.isActive);
  const presentToday = attendanceRecords.filter(record => record.status === 'present').length;
  const onLeave = attendanceRecords.filter(record => record.status === 'leave').length;
  const absent = attendanceRecords.filter(record => record.status === 'absent').length;

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">System Administration</h1>
        <p className="text-muted-foreground">Complete system overview and management</p>
      </div>

      {/* Admin Multi-Role Dashboard */}
      <Tabs defaultValue="admin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="admin" className="flex items-center" data-testid="tab-admin">
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </TabsTrigger>
          <TabsTrigger value="hr" className="flex items-center" data-testid="tab-hr">
            <Users className="h-4 w-4 mr-2" />
            HR
          </TabsTrigger>
          <TabsTrigger value="contact-center" className="flex items-center" data-testid="tab-contact-center">
            <Headphones className="h-4 w-4 mr-2" />
            Contact Center
          </TabsTrigger>
          <TabsTrigger value="team-leader" className="flex items-center" data-testid="tab-team-leader">
            <UserCheck className="h-4 w-4 mr-2" />
            Team Leader
          </TabsTrigger>
          <TabsTrigger value="agent" className="flex items-center" data-testid="tab-agent">
            <Clock className="h-4 w-4 mr-2" />
            Agent
          </TabsTrigger>
        </TabsList>

        {/* Admin Overview Tab */}
        <TabsContent value="admin" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={allUsers.length}
              icon={Users}
              iconColor="bg-primary/10 text-primary"
              testId="stat-total-users"
            />
            <StatCard
              title="Active Users"
              value={activeUsers}
              icon={Users}
              iconColor="bg-green-100 text-green-600"
              testId="stat-active-users"
            />
            <StatCard
              title="Active Assets"
              value={activeAssets}
              icon={Laptop}
              iconColor="bg-secondary/10 text-secondary"
              testId="stat-active-assets"
            />
            <StatCard
              title="Issues"
              value={issues}
              icon={AlertTriangle}
              iconColor="bg-red-100 text-red-600"
              testId="stat-issues"
            />
          </div>
          <UserManagementTable />
        </TabsContent>

        {/* HR Management Tab */}
        <TabsContent value="hr" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">HR Management View</h2>
            <p className="text-muted-foreground">Employee lifecycle and workforce operations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Present Today"
              value={presentToday}
              icon={UserCheck}
              iconColor="bg-green-100 text-green-600"
              testId="stat-hr-present-today"
            />
            <StatCard
              title="On Leave"
              value={onLeave}
              icon={CalendarX}
              iconColor="bg-yellow-100 text-yellow-600"
              testId="stat-hr-on-leave"
            />
            <StatCard
              title="Absent"
              value={absent}
              icon={UserX}
              iconColor="bg-red-100 text-red-600"
              testId="stat-hr-absent"
            />
            <StatCard
              title="Total Employees"
              value={activeUsers}
              icon={ArrowLeftRight}
              iconColor="bg-blue-100 text-blue-600"
              testId="stat-hr-total-employees"
            />
          </div>

          <Tabs defaultValue="attendance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="attendance" data-testid="tab-hr-attendance">Attendance</TabsTrigger>
              <TabsTrigger value="transfers" data-testid="tab-hr-transfers">Transfers</TabsTrigger>
              <TabsTrigger value="terminations" data-testid="tab-hr-terminations">Terminations</TabsTrigger>
              <TabsTrigger value="assets" data-testid="tab-hr-assets">Assets</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              <HRAttendanceView />
            </TabsContent>

            <TabsContent value="transfers">
              <TransferManagement />
            </TabsContent>

            <TabsContent value="terminations">
              <TerminationManagement />
            </TabsContent>

            <TabsContent value="assets">
              <AssetManagement showActions={true} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Contact Center Management Tab */}
        <TabsContent value="contact-center" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Contact Center Management View</h2>
            <p className="text-muted-foreground">Monitor operations and team performance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Active Agents"
              value={agents.length}
              icon={Headphones}
              iconColor="bg-green-100 text-green-600"
              testId="stat-cc-active-agents"
            />
            <StatCard
              title="Teams"
              value={teams.length}
              icon={Users}
              iconColor="bg-blue-100 text-blue-600"
              testId="stat-cc-teams"
            />
            <StatCard
              title="Avg Performance"
              value="87%"
              icon={TrendingUp}
              iconColor="bg-secondary/10 text-secondary"
              testId="stat-cc-avg-performance"
            />
            <StatCard
              title="Utilization"
              value="92%"
              icon={Clock}
              iconColor="bg-purple-100 text-purple-600"
              testId="stat-cc-utilization"
            />
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Team Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No teams found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-muted p-4 rounded-lg" data-testid={`card-team-${team.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-foreground" data-testid={`text-team-name-${team.id}`}>
                          {team.name}
                        </h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        <div>Leader: <span className="text-foreground">To be assigned</span></div>
                        <div>Agents: <span className="text-foreground">0</span></div>
                      </div>
                      <div className="w-full bg-border rounded-full h-2 mb-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <div className="text-xs text-muted-foreground">Performance: 85%</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Leader Management Tab */}
        <TabsContent value="team-leader" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Team Leadership View</h2>
            <p className="text-muted-foreground">Team attendance, assets, and performance management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Team Size"
              value={agents.length}
              icon={Users}
              iconColor="bg-primary/10 text-primary"
              testId="stat-tl-team-size"
            />
            <StatCard
              title="Present Today"
              value={presentToday}
              icon={UserCheck}
              iconColor="bg-green-100 text-green-600"
              testId="stat-tl-present-today"
            />
            <StatCard
              title="Late Arrivals"
              value={attendanceRecords.filter(r => r.status === 'late').length}
              icon={Clock}
              iconColor="bg-yellow-100 text-yellow-600"
              testId="stat-tl-late-arrivals"
            />
            <StatCard
              title="Assets Assigned"
              value={assets.filter(a => a.status === 'assigned').length}
              icon={Laptop}
              iconColor="bg-secondary/10 text-secondary"
              testId="stat-tl-assets-assigned"
            />
          </div>

          <AttendanceTable />
        </TabsContent>

        {/* Agent Dashboard View Tab */}
        <TabsContent value="agent" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Agent Experience View</h2>
            <p className="text-muted-foreground">Agent workspace and personal tracking tools</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Today's Hours"
              value="8h"
              icon={Clock}
              iconColor="bg-green-100 text-green-600"
              testId="stat-agent-today-hours"
            />
            <StatCard
              title="This Week"
              value="40h"
              icon={Calendar}
              iconColor="bg-primary/10 text-primary"
              testId="stat-agent-week-hours"
            />
            <StatCard
              title="Assigned Assets"
              value={assets.filter(a => a.status === 'assigned').length}
              icon={Laptop}
              iconColor="bg-secondary/10 text-secondary"
              testId="stat-agent-assigned-assets"
            />
            <StatCard
              title="Performance"
              value="94%"
              icon={Star}
              iconColor="bg-purple-100 text-purple-600"
              testId="stat-agent-performance"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span 
                      className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800"
                      data-testid="badge-agent-clock-status"
                    >
                      Demo View
                    </span>
                  </div>
                  <Button 
                    className="w-full"
                    variant="outline"
                    disabled
                    data-testid="button-agent-clock"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Agent Clock In/Out (Demo)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Assets Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <AssetManagement showActions={false} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
