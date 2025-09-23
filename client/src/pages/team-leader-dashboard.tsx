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
import Reports from "@/pages/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";
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
  ChevronRight,
  BarChart3,
  User as UserIcon,
  LogOut
} from "lucide-react";
import type { User, Attendance, Asset, Team } from "@shared/schema";

export default function TeamLeaderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('attendance');

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

  // Fetch reporting manager information
  const { data: reportingManager = null } = useQuery<User | null>({
    queryKey: ["/api/users", user?.reportsTo],
    queryFn: async () => {
      if (!user?.reportsTo) return null;
      const response = await apiRequest("GET", `/api/users/${user.reportsTo}`);
      return await response.json() as User;
    },
    enabled: !!user?.reportsTo,
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
        { icon: Clock, label: 'Attendance', key: 'attendance' },
        { icon: ArrowRightLeft, label: 'Transfers', key: 'transfers' },
        { icon: UserX, label: 'Terminations', key: 'terminations' },
        { icon: Laptop, label: 'Asset Control', key: 'assets' },
        { icon: BarChart3, label: 'Reports', key: 'reports' },
        { icon: Users, label: 'My Team', key: 'employees' },
        { icon: UserPlus, label: 'Onboarding', key: 'onboarding' },
      ]
    }
  ];

  const renderMainContent = () => {
    switch (activeTab) {
      case 'attendance':
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {user?.firstName || 'Team Leader'}</h2>
                  <p className="text-blue-600 dark:text-blue-400">Here's your workforce overview for today</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              
              {/* Reports To Section */}
              {reportingManager && (
                <div className="border-t border-blue-200 dark:border-blue-700 pt-4">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Reports To
                      </p>
                      <p className="font-semibold text-blue-800 dark:text-blue-200">
                        {reportingManager.firstName} {reportingManager.lastName}
                        <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                          ({reportingManager.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TL Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Team Size"
                value={teamSize}
                icon={Users}
                cardColor="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30"
                textColor="text-blue-600 dark:text-blue-400"
                iconBgColor="bg-blue-100 dark:bg-blue-900/50"
                iconColor="text-blue-600 dark:text-blue-400"
                testId="stat-team-size"
              />
              <StatCard
                title="Present Today"
                value={presentToday}
                icon={UserCheck}
                cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
                textColor="text-green-600 dark:text-green-400"
                iconBgColor="bg-green-100 dark:bg-green-900/50"
                iconColor="text-green-600 dark:text-green-400"
                testId="stat-present-today"
              />
              <StatCard
                title="Late Arrivals"
                value={lateArrivals}
                icon={Clock}
                cardColor="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800/30"
                textColor="text-yellow-600 dark:text-yellow-400"
                iconBgColor="bg-yellow-100 dark:bg-yellow-900/50"
                iconColor="text-yellow-600 dark:text-yellow-400"
                testId="stat-late-arrivals"
              />
              <StatCard
                title="Assets Assigned"
                value={assignedAssets}
                icon={Laptop}
                cardColor="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800/30"
                textColor="text-purple-600 dark:text-purple-400"
                iconBgColor="bg-purple-100 dark:bg-purple-900/50"
                iconColor="text-purple-600 dark:text-purple-400"
                testId="stat-assets-assigned"
              />
            </div>

            
            {/* Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Detailed Attendance Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceTable />
              </CardContent>
            </Card>
          </div>
        );
      case 'transfers':
        return <TransferManagement />;
      case 'terminations':
        return <TerminationManagement />;
      case 'assets':
        return <AssetManagement />;
      case 'reports':
        return <Reports />;
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
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <img 
              src={alteramLogo} 
              alt="Alteram Solutions" 
              className="h-12 w-auto max-w-full object-contain"
            />
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search anything.." 
              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
            />
          </div>
          
          <nav className="space-y-6 flex-1">
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
        
        {/* Bottom section with Notification Tab and Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Notification Tab */}
          <div className="mb-4">
            <button
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              data-testid="button-notifications"
            >
              <Bell className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Notifications
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
            </button>
          </div>
          
          {/* Profile Section at Very Bottom */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900 dark:text-white" data-testid="text-username">
                {user?.firstName || user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate" data-testid="text-user-role">
                Team Leader
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'attendance' ? 'Attendance Management' :
                 activeTab === 'transfers' ? 'Employee Transfers' :
                 activeTab === 'terminations' ? 'Termination Management' :
                 activeTab === 'assets' ? 'Asset Control' :
                 activeTab === 'reports' ? 'Reports & Analytics' :
                 activeTab === 'employees' ? 'Team Members' :
                 activeTab === 'onboarding' ? 'Employee Onboarding' :
                 'Team Dashboard'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {activeTab === 'attendance' ? 'Track and manage team member attendance' :
                 activeTab === 'transfers' ? 'Handle team member transfers' :
                 activeTab === 'terminations' ? 'Process team member terminations' :
                 activeTab === 'assets' ? 'Track asset booking in and out for team members' :
                 activeTab === 'reports' ? 'View historical data and analytics for asset management and operational changes' :
                 activeTab === 'employees' ? 'View and manage team members' :
                 activeTab === 'onboarding' ? 'Onboard new team members' :
                 'Team management tools'}
              </p>
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
