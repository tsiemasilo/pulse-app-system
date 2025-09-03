import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import AttendanceTable from "@/components/attendance-table";
import AssetManagement from "@/components/asset-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Users, UserCheck, Clock, Laptop, Mail, Phone } from "lucide-react";
import type { User, Attendance, Asset, Team } from "@shared/schema";

export default function TeamLeaderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        const members = await apiRequest("GET", `/api/teams/${team.id}/members`);
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

  return (
    <div className="fade-in">
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
                          {member.firstName} {member.lastName}
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

      {/* Attendance Management */}
      <div className="mb-8">
        <AttendanceTable />
      </div>
    </div>
  );
}
