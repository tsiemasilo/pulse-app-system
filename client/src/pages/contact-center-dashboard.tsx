import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { StatCard } from "@/components/dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { 
  Headphones, 
  Users, 
  TrendingUp, 
  Clock, 
  UserCheck, 
  UserX, 
  Timer, 
  Building2,
  Mail,
  Award,
  LogOut,
  Bell,
  User as UserIcon
} from "lucide-react";
import type { User, Team, TeamLeaderSummary } from "@shared/schema";

export default function ContactCenterDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: agents = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users: User[]) => users.filter(u => u.role === 'agent' && u.isActive),
  });

  // Fetch team leader summaries for CC Managers
  const { data: teamLeaders = [], isLoading: isLoadingTeamLeaders } = useQuery<TeamLeaderSummary[]>({
    queryKey: ["/api/my-team-leaders"],
    enabled: user?.role === 'contact_center_manager' || user?.role === 'contact_center_ops_manager' || user?.role === 'admin',
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.reload();
    }
  };

  const roleDisplayMap = {
    contact_center_ops_manager: "CC Ops Manager",
    contact_center_manager: "CC Manager",
    admin: "Admin"
  };

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

  if (user?.role !== 'contact_center_ops_manager' && user?.role !== 'contact_center_manager' && user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Contact Center management role required.</div>;
  }

  return (
    <>
      {user?.role === 'admin' && <Navigation user={user} />}
      
      {/* Header Bar - Matches Team Leader Dashboard Styling */}
      {user?.role !== 'admin' && (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                Contact Center Management
              </h1>
              <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 hidden sm:block">
                Oversee team leader performance and workforce metrics
              </p>
            </div>
            
            {/* Notifications, Profile and Logout */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications - Hidden on mobile */}
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden sm:flex"
                data-testid="button-notifications-cc"
              >
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* Profile - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-username-cc">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="text-user-role-cc">
                    {roleDisplayMap[user?.role as keyof typeof roleDisplayMap] || user?.role}
                  </p>
                </div>
              </div>

              {/* Logout - Desktop */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2 hidden sm:flex"
                data-testid="button-logout-cc"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>

              {/* Logout - Mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="sm:hidden"
                data-testid="button-logout-cc-mobile"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      <div className="fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Hero Section - Matches Team Leader Dashboard Gradient */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 sm:p-6 border border-blue-100 dark:border-blue-800/30 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {user?.firstName || 'Contact Center Leader'}
              </h2>
              <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400">
                Here's your workforce overview for today
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Today</p>
              <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

      {/* CC Manager Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Agents"
          value={agents.length}
          icon={Headphones}
          cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
          textColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/50"
          iconColor="text-green-600 dark:text-green-400"
          testId="stat-active-agents"
        />
        <StatCard
          title="Teams"
          value={teams.length}
          icon={Users}
          cardColor="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30"
          textColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/50"
          iconColor="text-blue-600 dark:text-blue-400"
          testId="stat-teams"
        />
        <StatCard
          title="Avg Performance"
          value="87%"
          icon={TrendingUp}
          cardColor="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800/30"
          textColor="text-yellow-600 dark:text-yellow-400"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/50"
          iconColor="text-yellow-600 dark:text-yellow-400"
          testId="stat-avg-performance"
        />
        <StatCard
          title="Utilization"
          value="92%"
          icon={Clock}
          cardColor="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800/30"
          textColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/50"
          iconColor="text-purple-600 dark:text-purple-400"
          testId="stat-utilization"
        />
      </div>

      {/* Team Leaders Overview */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Team Leaders
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed view of team leaders reporting to you
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingTeamLeaders ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading team leaders...</p>
              </div>
            </div>
          ) : teamLeaders.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No team leaders assigned to you yet</p>
              <p className="text-sm text-muted-foreground mt-1">Team leaders will appear here once assigned</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {teamLeaders.map((leader) => (
                <Card key={leader.id} className="hover-elevate" data-testid={`card-team-leader-${leader.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14" data-testid={`avatar-${leader.id}`}>
                        <AvatarImage src={leader.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                          {leader.firstName?.charAt(0) || ''}{leader.lastName?.charAt(0) || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate" data-testid={`text-leader-name-${leader.id}`}>
                              {leader.firstName} {leader.lastName}
                            </h3>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                              <Mail className="h-3.5 w-3.5" />
                              <span className="truncate">{leader.email || 'No email'}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            Team Leader
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Organization Hierarchy */}
                    {(leader.divisionName || leader.departmentName || leader.sectionName) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {leader.divisionName && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Building2 className="h-3 w-3" />
                            {leader.divisionName}
                          </Badge>
                        )}
                        {leader.departmentName && (
                          <Badge variant="secondary" className="text-xs">
                            {leader.departmentName}
                          </Badge>
                        )}
                        {leader.sectionName && (
                          <Badge variant="secondary" className="text-xs">
                            {leader.sectionName}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <Separator />

                  <CardContent className="pt-4 space-y-4">
                    {/* Team Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          Total Agents
                        </div>
                        <p className="text-2xl font-bold" data-testid={`text-total-agents-${leader.id}`}>
                          {leader.stats.totalAgents}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Award className="h-4 w-4" />
                          Performance
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold" data-testid={`text-performance-${leader.id}`}>
                            {leader.stats.performanceScore}
                          </p>
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Attendance Rate</span>
                        <span className="font-medium">{leader.stats.avgAttendanceRate}%</span>
                      </div>
                      <Progress 
                        value={leader.stats.avgAttendanceRate} 
                        className="h-2"
                        data-testid={`progress-attendance-${leader.id}`}
                      />
                    </div>

                    <Separator />

                    {/* Today's Attendance Breakdown */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Today's Attendance</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20">
                          <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/50">
                            <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-green-600 dark:text-green-400">Present</p>
                            <p className="font-semibold text-green-700 dark:text-green-300" data-testid={`text-present-${leader.id}`}>
                              {leader.stats.presentToday}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20">
                          <div className="p-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/50">
                            <Timer className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">Late</p>
                            <p className="font-semibold text-yellow-700 dark:text-yellow-300" data-testid={`text-late-${leader.id}`}>
                              {leader.stats.lateToday}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20">
                          <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/50">
                            <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-red-600 dark:text-red-400">Absent</p>
                            <p className="font-semibold text-red-700 dark:text-red-300" data-testid={`text-absent-${leader.id}`}>
                              {leader.stats.absentToday}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
