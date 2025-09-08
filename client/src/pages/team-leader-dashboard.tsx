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
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Laptop, 
  Mail, 
  Phone, 
  LayoutDashboard,
  Calendar,
  ArrowRightLeft,
  UserX,
  UserPlus
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { id: 'terminations', label: 'Terminations', icon: UserX },
    { id: 'assets', label: 'Assets', icon: Laptop },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
  ];

  const renderTabContent = () => {
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
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Team Leadership</h2>
          <p className="text-sm text-muted-foreground">Management Dashboard</p>
        </div>
        
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="fade-in">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
