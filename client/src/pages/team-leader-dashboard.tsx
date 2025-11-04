import { useEffect, useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  LogOut,
  Menu,
  X,
  Building2,
  Layers,
  MapPin
} from "lucide-react";
import type { User, Attendance, Asset, Team, Division, Department, Section, UserDepartmentAssignment } from "@shared/schema";

export default function TeamLeaderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('attendance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      // Force reload even if logout fails to clear the session
      window.location.reload();
    }
  };

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

  // Fetch all users to get manager information for team members
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Create a memoized lookup map for efficient manager lookups
  const userLookupMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach(user => map.set(user.id, user));
    return map;
  }, [allUsers]);

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

  // Fetch divisions, departments, sections, and user department assignments
  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: userDepartmentAssignments = [] } = useQuery<UserDepartmentAssignment[]>({
    queryKey: ["/api/user-department-assignments"],
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
  
  // Count unique users for each status to avoid duplicate records
  const presentUserIds = new Set(
    attendanceRecords
      .filter(record => teamMemberIds.includes(record.userId) && (record.status === 'at work' || record.status === 'at work (remote)' || record.status === 'present'))
      .map(record => record.userId)
  );
  const presentToday = presentUserIds.size;
  
  const lateUserIds = new Set(
    attendanceRecords
      .filter(record => teamMemberIds.includes(record.userId) && record.status === 'late')
      .map(record => record.userId)
  );
  const lateArrivals = lateUserIds.size;
  
  // Calculate absent as total team members minus those who are present or late
  // This ensures team members without attendance records are counted as absent
  // Add defensive guard to prevent negative counts in case of data anomalies
  const absentToday = Math.max(0, teamSize - presentToday - lateArrivals);

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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 sm:p-6 border border-blue-100 dark:border-blue-800/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {user?.firstName || 'Team Leader'}</h2>
                  <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400">Here's your workforce overview for today</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Today</p>
                  <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
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
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        {reportingManager.firstName} {reportingManager.lastName}
                        <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                          ({reportingManager.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TL Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
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
                title="Absent"
                value={absentToday}
                icon={UserX}
                cardColor="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800/30"
                textColor="text-red-600 dark:text-red-400"
                iconBgColor="bg-red-100 dark:bg-red-900/50"
                iconColor="text-red-600 dark:text-red-400"
                testId="stat-absent"
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
        return <Reports user={user} teamMembers={teamMembers} />;
      case 'employees':
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Team Leader Reports To Section */}
            {reportingManager && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-800/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Team Leader Reports To
                      </p>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        {reportingManager.firstName} {reportingManager.lastName}
                        <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                          ({reportingManager.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'})
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Members Card */}
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
                    const memberManager = member.reportsTo ? userLookupMap.get(member.reportsTo) : null;
                    
                    return (
                      <div 
                        key={member.id} 
                        className="border rounded-lg p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedAgent(member);
                          setIsAgentModalOpen(true);
                        }}
                        data-testid={`card-agent-${member.id}`}
                      >
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
                              attendanceStatus === 'at work' || attendanceStatus === 'at work (remote)' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                              attendanceStatus === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
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
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <UserIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 truncate">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Reports To: </span>
                              {memberManager ? (
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {memberManager.firstName && memberManager.lastName 
                                    ? `${memberManager.firstName} ${memberManager.lastName}`
                                    : memberManager.username}
                                </span>
                              ) : (
                                <span className="text-xs italic text-gray-400 dark:text-gray-500">Unassigned</span>
                              )}
                            </span>
                          </div>
                          
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

            {/* Agent Detail Modal - Smooth Stylish ID Card */}
            <Dialog open={isAgentModalOpen} onOpenChange={setIsAgentModalOpen}>
              <DialogContent className="w-[600px] h-[350px] p-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 border border-gray-300 dark:border-gray-400 rounded-3xl overflow-hidden shadow-xl">
                {selectedAgent && (
                  <div className="h-full flex relative">
                    {/* Subtle decorative accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-900 dark:bg-blue-950 opacity-5 rounded-bl-full"></div>
                    
                    {/* Left side - Photo section with dark blue gradient */}
                    <div className="w-[180px] bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950 flex flex-col items-center justify-center p-4">
                      <Avatar className="h-28 w-28 mb-3 border-3 border-white dark:border-gray-100 shadow-lg">
                        <AvatarFallback className="bg-gradient-to-br from-blue-700 to-blue-900 dark:from-blue-800 dark:to-blue-950 text-white text-3xl font-bold">
                          {`${selectedAgent.firstName?.[0] || ''}${selectedAgent.lastName?.[0] || ''}`.toUpperCase() || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-white dark:bg-gray-50 px-3 py-1 rounded-full shadow-sm">
                        <p className="text-[10px] text-blue-900 dark:text-blue-950 uppercase tracking-wider font-bold text-center">
                          Employee ID
                        </p>
                      </div>
                    </div>

                    {/* Right side - Information with white/gray background */}
                    <div className="flex-1 bg-gradient-to-br from-white to-gray-50 dark:from-gray-50 dark:to-gray-100 p-5 flex flex-col justify-between">
                      {/* Header with dark blue accent */}
                      <div className="border-b-2 border-blue-900 dark:border-blue-950 pb-2 mb-3">
                        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-950 leading-tight">
                          {selectedAgent.firstName && selectedAgent.lastName 
                            ? `${selectedAgent.firstName} ${selectedAgent.lastName}`.toUpperCase() 
                            : selectedAgent.username?.toUpperCase() || 'AGENT'}
                        </h2>
                        <p className="text-[11px] text-blue-700 dark:text-blue-800 font-medium">@{selectedAgent.username}</p>
                      </div>

                      {/* Information Grid */}
                      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                        <div>
                          <p className="text-[10px] text-blue-800 dark:text-blue-900 uppercase font-bold">Role</p>
                          <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-950" data-testid="text-agent-role">
                            {selectedAgent.role === 'agent' ? 'Agent' : selectedAgent.role}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-800 dark:text-blue-900 uppercase font-bold">Status</p>
                          <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-950" data-testid="text-agent-status">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-white ${selectedAgent.isActive ? 'bg-blue-700' : 'bg-gray-500'}`}>
                              {selectedAgent.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                        {(() => {
                          const assignment = userDepartmentAssignments.find(a => a.userId === selectedAgent.id);
                          const division = assignment?.divisionId ? divisions.find(d => d.id === assignment.divisionId) : null;
                          const department = assignment?.departmentId ? departments.find(d => d.id === assignment.departmentId) : null;
                          const section = assignment?.sectionId ? sections.find(s => s.id === assignment.sectionId) : null;
                          const manager = selectedAgent.reportsTo ? userLookupMap.get(selectedAgent.reportsTo) : null;

                          return (
                            <>
                              <div>
                                <p className="text-[10px] text-blue-800 dark:text-blue-900 uppercase font-bold">Division</p>
                                <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-950 truncate" data-testid="text-agent-division">
                                  {division?.name || 'Not assigned'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-blue-800 dark:text-blue-900 uppercase font-bold">Department</p>
                                <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-950 truncate" data-testid="text-agent-department">
                                  {department?.name || 'Not assigned'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-blue-800 dark:text-blue-900 uppercase font-bold">Section</p>
                                <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-950 truncate" data-testid="text-agent-section">
                                  {section?.name || 'Not assigned'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-blue-800 dark:text-blue-900 uppercase font-bold">Reports To</p>
                                <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-950 truncate" data-testid="text-agent-reports-to">
                                  {manager ? (
                                    manager.firstName && manager.lastName 
                                      ? `${manager.firstName} ${manager.lastName}` 
                                      : manager.username
                                  ) : (
                                    <span className="italic text-gray-500">Unassigned</span>
                                  )}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Footer with subtle gray gradient */}
                      <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-200 dark:to-gray-300 -mx-5 -mb-5 px-5 py-3 border-t border-gray-300 dark:border-gray-400">
                        <div className="flex justify-between items-center">
                          {selectedAgent.email && (
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-blue-900 dark:text-blue-950 uppercase font-bold">Email</p>
                              <p className="text-[11px] font-medium text-gray-900 dark:text-gray-950 truncate" data-testid="text-agent-email">
                                {selectedAgent.email}
                              </p>
                            </div>
                          )}
                          <div className="ml-4">
                            <p className="text-[10px] text-blue-900 dark:text-blue-950 uppercase font-bold">Attendance</p>
                            {(() => {
                              const attendance = attendanceRecords.find(att => att.userId === selectedAgent.id);
                              const status = attendance?.status || 'absent';
                              return (
                                <p className="text-[11px] font-bold text-blue-800 dark:text-blue-900" data-testid="badge-agent-attendance">
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        );
      case 'onboarding':
        return <OnboardingManagement />;
      default:
        return <div>Tab not found</div>;
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
                              onClick={() => {
                                setActiveTab(item.key);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isActive 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                              {item.label}
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
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'attendance' ? 'Attendance Management' :
                 activeTab === 'transfers' ? 'Employee Transfers' :
                 activeTab === 'terminations' ? 'Termination Management' :
                 activeTab === 'assets' ? 'Asset Control' :
                 activeTab === 'reports' ? 'Reports & Analytics' :
                 activeTab === 'employees' ? 'Team Members' :
                 activeTab === 'onboarding' ? 'Employee Onboarding' :
                 'Team Dashboard'}
              </h1>
              <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 hidden sm:block">
                {activeTab === 'attendance' ? 'Track and manage team member attendance' :
                 activeTab === 'transfers' ? 'Handle team member transfers' :
                 activeTab === 'terminations' ? 'Process team member terminations' :
                 activeTab === 'assets' ? 'Track asset booking out and in for team members' :
                 activeTab === 'reports' ? 'View historical data and analytics for asset management and operational changes' :
                 activeTab === 'employees' ? 'View and manage team members' :
                 activeTab === 'onboarding' ? 'Onboard new team members' :
                 'Team management tools'}
              </p>
              </div>
            </div>
            
            {/* Notifications, Profile and Logout */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications - Hidden on mobile */}
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

              {/* Profile - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-header-username">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="text-header-role">
                    Team Leader
                  </p>
                </div>
              </div>

              {/* Logout */}
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
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="fade-in">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
