import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import AttendanceTable from "@/components/attendance-table";
import AssetManagement from "@/components/asset-management";
import TransferManagement from "@/components/transfer-management";
import TerminationManagement from "@/components/termination-management";
import OnboardingManagement from "@/components/onboarding-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Laptop, 
  Mail, 
  Phone, 
  LayoutDashboard as Home,
  Calendar,
  ArrowRightLeft,
  UserX,
  UserPlus,
  Search,
  Bell,
  ChevronRight
} from "lucide-react";
import type { User, Attendance, Asset, Team } from "@shared/schema";

export default function TeamLeaderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: teamAssets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  // Fetch teams led by this user
  const { data: leaderTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams/leader", user?.id],
    enabled: !!user?.id,
  });

  // Fetch team members for each team led by this user
  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/teams/members", leaderTeams.map(t => t.id)],
    queryFn: async () => {
      if (leaderTeams.length === 0) return [];
      
      const allMembers: User[] = [];
      for (const team of leaderTeams) {
        const response = await apiRequest("GET", `/api/teams/${team.id}/members`);
        const members = await response.json() as User[];
        console.log('Team members data:', members);
        allMembers.push(...members);
      }
      return allMembers;
    },
    enabled: leaderTeams.length > 0,
  });

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

  if (user?.role !== 'team_leader' && user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Team Leader role required.</div>;
  }

  // Calculate real team stats
  const teamSize = teamMembers.length;
  const teamMemberIds = teamMembers.map(m => m.id);
  const presentToday = attendanceRecords.filter(record => 
    teamMemberIds.includes(record.userId) && record.status === 'present'
  ).length;
  const lateArrivals = attendanceRecords.filter(record => 
    teamMemberIds.includes(record.userId) && record.status === 'late'
  ).length;
  const assignedAssets = teamAssets.filter(asset => 
    asset.assignedToUserId && teamMemberIds.includes(asset.assignedToUserId)
  ).length;

  const sidebarItems = [
    {
      title: 'TEAM MANAGEMENT',
      items: [
        { icon: Home, label: 'Dashboard', key: 'dashboard' },
        { icon: Clock, label: 'Attendance', key: 'attendance' },
        { icon: ArrowRightLeft, label: 'Transfers', key: 'transfers' },
        { icon: UserX, label: 'Terminations', key: 'terminations' },
        { icon: Laptop, label: 'Assets', key: 'assets' },
        { icon: Users, label: 'Employees', key: 'employees' },
        { icon: UserPlus, label: 'Onboarding', key: 'onboarding' },
      ]
    }
  ];

  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">Team Leadership</h1>
              <p className="text-muted-foreground">Manage your team's attendance, assets, and performance</p>
            </div>

            {/* TL Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Team Size"
                value={teamSize}
                icon={Users}
                iconColor="bg-primary/10 text-primary"
                testId="stat-team-size"
              />
              <StatCard
                title="Present Today"
                value={presentToday}
                icon={UserCheck}
                iconColor="bg-green-100 text-green-600"
                testId="stat-present-today"
              />
              <StatCard
                title="Late Arrivals"
                value={lateArrivals}
                icon={Clock}
                iconColor="bg-yellow-100 text-yellow-600"
                testId="stat-late-arrivals"
              />
              <StatCard
                title="Assets Assigned"
                value={assignedAssets}
                icon={Laptop}
                iconColor="bg-secondary/10 text-secondary"
                testId="stat-assets-assigned"
              />
            </div>

            {/* My Team Members */}
            {teamMembers.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    My Team ({teamMembers.length} Members)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((member) => {
                      const memberAttendance = attendanceRecords.find(att => att.userId === member.id);
                      const attendanceStatus = memberAttendance?.status || 'absent';
                      
                      return (
                        <div key={member.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase() || 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {member.firstName && member.lastName 
                                  ? `${member.firstName} ${member.lastName}` 
                                  : member.username || 'Unknown User'}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">@{member.username}</p>
                            </div>
                            <Badge 
                              className={`text-xs ${
                                attendanceStatus === 'present' ? 'bg-green-100 text-green-800' :
                                attendanceStatus === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}
                            >
                              {attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {member.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="h-4 w-4" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {member.role === 'agent' ? 'Agent' : member.role}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {member.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 'attendance':
        return <AttendanceTable />;
      case 'transfers':
        return <TransferManagement />;
      case 'terminations':
        return <TerminationManagement />;
      case 'assets':
        return <AssetManagement />;
      case 'employees':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({teamMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => {
                  const memberAttendance = attendanceRecords.find(att => att.userId === member.id);
                  const attendanceStatus = memberAttendance?.status || 'absent';
                  
                  return (
                    <div key={member.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {member.firstName && member.lastName 
                              ? `${member.firstName} ${member.lastName}` 
                              : member.username || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{member.username}</p>
                        </div>
                        <Badge 
                          className={`text-xs ${
                            attendanceStatus === 'present' ? 'bg-green-100 text-green-800' :
                            attendanceStatus === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {member.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {member.role === 'agent' ? 'Agent' : member.role}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      case 'onboarding':
        return <OnboardingManagement />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pulse Team</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Team Leadership</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search anything.." 
              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
            />
          </div>
          
          <nav className="space-y-6">
            {sidebarItems.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    return (
                      <li key={item.key}>
                        <button
                          onClick={() => setActiveTab(item.key)}
                          className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                            isActive 
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                          }`}
                          data-testid={`tab-${item.key}`}
                        >
                          <Icon className={`mr-3 h-5 w-5 ${
                            isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`} />
                          {item.label}
                          {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'dashboard' ? 'Team Leadership Dashboard' : 
                 activeTab === 'attendance' ? 'Attendance Management' :
                 activeTab === 'transfers' ? 'Employee Transfers' :
                 activeTab === 'terminations' ? 'Termination Management' :
                 activeTab === 'assets' ? 'Asset Management' :
                 activeTab === 'employees' ? 'Team Members' :
                 activeTab === 'onboarding' ? 'Employee Onboarding' :
                 'Team Dashboard'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {activeTab === 'dashboard' ? 'Manage your team performance and operations' :
                 activeTab === 'attendance' ? 'Track and manage team member attendance' :
                 activeTab === 'transfers' ? 'Handle team member transfers' :
                 activeTab === 'terminations' ? 'Process team member terminations' :
                 activeTab === 'assets' ? 'Manage team assets and equipment' :
                 activeTab === 'employees' ? 'View and manage team members' :
                 activeTab === 'onboarding' ? 'Onboard new team members' :
                 'Team management tools'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.firstName?.charAt(0) || 'T'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName || 'Team'} {user?.lastName || 'Leader'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="fade-in">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
