import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import UserManagementTable from "@/components/user-management-table";
import HRAttendanceView from "@/components/hr-attendance-view";
import TransferManagement from "@/components/transfer-management";
import TerminationManagement from "@/components/termination-management";
import AssetManagement from "@/components/asset-management";
import OnboardingManagement from "@/components/onboarding-management";
import HREmployeeManagement from "@/components/hr-employee-management";
import DepartmentManagement from "@/components/department-management";
import TeamLeaderView from "@/components/team-leader-view";
import GoJSOrganogram from "@/components/organogram/gojs-organogram";
import NotificationBell from "@/components/notification-bell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";
import { 
  Shield,
  Users,
  Headphones,
  UserCheck,
  Network,
  Search,
  Bell,
  LogOut,
  Building2,
  Laptop,
  AlertTriangle,
  Mail,
  User as UserIcon,
  Eye,
  Activity,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import type { User, Asset, Attendance, Department, Team, UserDepartmentAssignment } from "@shared/schema";

interface AdminViewProps {
  currentUser: User;
}

export default function AdminView({ currentUser }: AdminViewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('admin');
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: userDepartmentAssignments = [] } = useQuery<UserDepartmentAssignment[]>({
    queryKey: ["/api/user-department-assignments"],
  });

  const activeUsers = allUsers.filter(u => u.isActive).length;
  const activeAssets = assets.filter(a => a.status === 'assigned').length;
  const issues = assets.filter(a => a.status === 'missing').length;

  // Team Leader data calculations
  const teamLeaders = useMemo(() => {
    return allUsers.filter(u => u.role === 'team_leader');
  }, [allUsers]);

  const contactCenterManagers = useMemo(() => {
    return allUsers.filter(u => 
      u.role === 'contact_center_manager' || 
      u.role === 'contact_center_ops_manager'
    );
  }, [allUsers]);

  const activeTeamLeaders = teamLeaders.filter(tl => tl.isActive).length;

  // Helper function to get department name
  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'Unassigned';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown';
  };

  // Helper function to get manager name
  const getManagerName = (managerId: string | null) => {
    if (!managerId) return 'No Manager';
    const manager = allUsers.find(u => u.id === managerId);
    if (!manager) return 'Unknown';
    return `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.username;
  };

  // Helper function to count team members for a team leader
  const getTeamMemberCount = (leaderId: string) => {
    const leaderTeams = teams.filter(t => t.leaderId === leaderId);
    return allUsers.filter(u => 
      u.reportsTo === leaderId || 
      leaderTeams.some(t => u.departmentId === t.departmentId)
    ).length;
  };

  // Filtered team leaders for search
  const filteredTeamLeaders = useMemo(() => {
    if (!searchQuery) return teamLeaders;
    const query = searchQuery.toLowerCase();
    return teamLeaders.filter(leader => 
      `${leader.firstName} ${leader.lastName}`.toLowerCase().includes(query) ||
      leader.email?.toLowerCase().includes(query) ||
      leader.username.toLowerCase().includes(query)
    );
  }, [teamLeaders, searchQuery]);

  const navigationItems = [
    { icon: Shield, label: 'System Admin', key: 'admin' },
    { icon: Users, label: 'HR Management', key: 'hr' },
    { icon: Headphones, label: 'Contact Center', key: 'contact-center' },
    { icon: UserCheck, label: 'Team Leaders', key: 'team-leader' },
    { icon: Building2, label: 'Departments', key: 'departments' },
    { icon: Network, label: 'Organogram', key: 'organogram' },
  ];


  const renderMainContent = () => {
    switch (activeTab) {
      case 'admin':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 sm:p-6 border border-blue-100 dark:border-blue-800/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome back, {currentUser?.firstName || 'Admin'}
                  </h2>
                  <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400">System Administration Dashboard</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Today</p>
                  <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Admin Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <StatCard
                title="Total Users"
                value={allUsers.length}
                icon={Users}
                cardColor="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30"
                textColor="text-blue-600 dark:text-blue-400"
                iconBgColor="bg-blue-100 dark:bg-blue-900/50"
                iconColor="text-blue-600 dark:text-blue-400"
                testId="stat-total-users"
              />
              <StatCard
                title="Active Users"
                value={activeUsers}
                icon={Users}
                cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
                textColor="text-green-600 dark:text-green-400"
                iconBgColor="bg-green-100 dark:bg-green-900/50"
                iconColor="text-green-600 dark:text-green-400"
                testId="stat-active-users"
              />
              <StatCard
                title="Active Assets"
                value={activeAssets}
                icon={Laptop}
                cardColor="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800/30"
                textColor="text-purple-600 dark:text-purple-400"
                iconBgColor="bg-purple-100 dark:bg-purple-900/50"
                iconColor="text-purple-600 dark:text-purple-400"
                testId="stat-active-assets"
              />
              <StatCard
                title="Issues"
                value={issues}
                icon={AlertTriangle}
                cardColor="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200 dark:border-red-800/30"
                textColor="text-red-600 dark:text-red-400"
                iconBgColor="bg-red-100 dark:bg-red-900/50"
                iconColor="text-red-600 dark:text-red-400"
                testId="stat-issues"
              />
            </div>

            {/* User Management Section */}
            <UserManagementTable />
          </div>
        );

      case 'hr':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 sm:p-6 border border-purple-100 dark:border-purple-800/30">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                HR Management
              </h2>
              <p className="text-sm sm:text-base text-purple-600 dark:text-purple-400">Manage employee lifecycle and HR operations</p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <HRAttendanceView />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Employee Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <HREmployeeManagement />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Transfers</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransferManagement />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Terminations</CardTitle>
                </CardHeader>
                <CardContent>
                  <TerminationManagement />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Asset Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <AssetManagement showActions={true} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding</CardTitle>
                </CardHeader>
                <CardContent>
                  <OnboardingManagement />
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'contact-center':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-lg p-4 sm:p-6 border border-cyan-100 dark:border-cyan-800/30">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Contact Center Operations
              </h2>
              <p className="text-sm sm:text-base text-cyan-600 dark:text-cyan-400">Monitor and manage contact center performance</p>
            </div>

            {/* Contact Center Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <StatCard
                title="CC Managers"
                value={contactCenterManagers.length}
                icon={Headphones}
                cardColor="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-cyan-200 dark:border-cyan-800/30"
                textColor="text-cyan-600 dark:text-cyan-400"
                iconBgColor="bg-cyan-100 dark:bg-cyan-900/50"
                iconColor="text-cyan-600 dark:text-cyan-400"
                testId="stat-cc-managers"
              />
              <StatCard
                title="Team Leaders"
                value={teamLeaders.length}
                icon={UserCheck}
                cardColor="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/30"
                textColor="text-blue-600 dark:text-blue-400"
                iconBgColor="bg-blue-100 dark:bg-blue-900/50"
                iconColor="text-blue-600 dark:text-blue-400"
                testId="stat-team-leaders"
              />
              <StatCard
                title="Active Team Leaders"
                value={activeTeamLeaders}
                icon={Activity}
                cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
                textColor="text-green-600 dark:text-green-400"
                iconBgColor="bg-green-100 dark:bg-green-900/50"
                iconColor="text-green-600 dark:text-green-400"
                testId="stat-active-team-leaders"
              />
              <StatCard
                title="Total Agents"
                value={allUsers.filter(u => u.role === 'agent').length}
                icon={Users}
                cardColor="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800/30"
                textColor="text-purple-600 dark:text-purple-400"
                iconBgColor="bg-purple-100 dark:bg-purple-900/50"
                iconColor="text-purple-600 dark:text-purple-400"
                testId="stat-total-agents"
              />
            </div>
            
            {/* Contact Center Managers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5" />
                  Contact Center Managers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contactCenterManagers.length === 0 ? (
                  <div className="text-center py-8">
                    <Headphones className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No contact center managers found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contactCenterManagers.map((manager) => {
                      const teamLeadersUnderManager = teamLeaders.filter(tl => tl.reportsTo === manager.id);
                      return (
                        <Card key={manager.id} className="hover-elevate" data-testid={`card-cc-manager-${manager.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {manager.firstName?.[0]}{manager.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate" data-testid={`text-manager-name-${manager.id}`}>
                                  {manager.firstName} {manager.lastName}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {manager.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'}
                                </Badge>
                                <div className="mt-3 pt-3 border-t">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Team Leaders:</span>
                                    <span className="font-semibold" data-testid={`text-manager-tl-count-${manager.id}`}>
                                      {teamLeadersUnderManager.length}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs mt-1">
                                    <span className="text-muted-foreground">Department:</span>
                                    <span className="font-medium text-xs truncate ml-2">
                                      {getDepartmentName(manager.departmentId)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Leaders under Contact Center */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Team Leaders Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamLeaders.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No team leaders found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Leader</TableHead>
                          <TableHead>Manager</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Team Size</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamLeaders.slice(0, 10).map((leader) => (
                          <TableRow key={leader.id} data-testid={`row-team-leader-${leader.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {leader.firstName?.[0]}{leader.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-sm">{leader.firstName} {leader.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{leader.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{getManagerName(leader.reportsTo)}</TableCell>
                            <TableCell className="text-sm">{getDepartmentName(leader.departmentId)}</TableCell>
                            <TableCell className="text-sm font-medium">{getTeamMemberCount(leader.id)}</TableCell>
                            <TableCell>
                              <Badge variant={leader.isActive ? "default" : "secondary"} className="text-xs">
                                {leader.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {teamLeaders.length > 10 && (
                      <div className="text-center py-3 text-sm text-muted-foreground">
                        Showing 10 of {teamLeaders.length} team leaders. View all in Team Leaders tab.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'team-leader':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 sm:p-6 border border-green-100 dark:border-green-800/30">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Team Leader Management
              </h2>
              <p className="text-sm sm:text-base text-green-600 dark:text-green-400">Oversee all team leaders and their teams</p>
            </div>

            {/* Team Leader Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <StatCard
                title="Total Team Leaders"
                value={teamLeaders.length}
                icon={UserCheck}
                cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
                textColor="text-green-600 dark:text-green-400"
                iconBgColor="bg-green-100 dark:bg-green-900/50"
                iconColor="text-green-600 dark:text-green-400"
                testId="stat-total-team-leaders"
              />
              <StatCard
                title="Active Team Leaders"
                value={activeTeamLeaders}
                icon={Activity}
                cardColor="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30"
                textColor="text-blue-600 dark:text-blue-400"
                iconBgColor="bg-blue-100 dark:bg-blue-900/50"
                iconColor="text-blue-600 dark:text-blue-400"
                testId="stat-active-team-leaders-detail"
              />
              <StatCard
                title="Teams"
                value={teams.length}
                icon={Users}
                cardColor="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800/30"
                textColor="text-purple-600 dark:text-purple-400"
                iconBgColor="bg-purple-100 dark:bg-purple-900/50"
                iconColor="text-purple-600 dark:text-purple-400"
                testId="stat-teams"
              />
              <StatCard
                title="Departments"
                value={departments.length}
                icon={Building2}
                cardColor="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800/30"
                textColor="text-orange-600 dark:text-orange-400"
                iconBgColor="bg-orange-100 dark:bg-orange-900/50"
                iconColor="text-orange-600 dark:text-orange-400"
                testId="stat-departments"
              />
            </div>
            
            {/* Search and Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Team Leaders Directory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-team-leaders"
                    />
                  </div>
                </div>

                {filteredTeamLeaders.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No team leaders found matching your search' : 'No team leaders found'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Leader</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Reports To</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Team Size</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeamLeaders.map((leader) => (
                          <TableRow key={leader.id} data-testid={`row-team-leader-detail-${leader.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {leader.firstName?.[0]}{leader.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold" data-testid={`text-team-leader-name-${leader.id}`}>
                                    {leader.firstName} {leader.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">@{leader.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {leader.email && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate max-w-[200px]" title={leader.email}>
                                      {leader.email}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <UserIcon className="h-3 w-3 text-muted-foreground" />
                                <span>{getManagerName(leader.reportsTo)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span>{getDepartmentName(leader.departmentId)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-semibold" data-testid={`badge-team-size-${leader.id}`}>
                                {getTeamMemberCount(leader.id)} members
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={leader.isActive ? "default" : "secondary"}
                                className={leader.isActive 
                                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" 
                                  : ""}
                                data-testid={`badge-status-${leader.id}`}
                              >
                                {leader.isActive ? 'Active' : 'Inactive'}
                              </Badge>
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

      case 'departments':
        return <DepartmentManagement />;

      case 'organogram':
        const handleViewDetails = (userId: string) => {
          const userData = allUsers.find(u => u.id === userId);
          if (userData) {
            toast({
              title: "View Details",
              description: `Viewing details for ${userData.firstName} ${userData.lastName}`,
            });
          }
        };

        const handleAddEmployee = (parentUserId: string) => {
          const parentUser = allUsers.find(u => u.id === parentUserId);
          if (parentUser) {
            toast({
              title: "Add Employee",
              description: `Adding employee under ${parentUser.firstName} ${parentUser.lastName}`,
            });
          }
        };

        const handleRemoveFromChart = (userId: string) => {
          const userData = allUsers.find(u => u.id === userId);
          if (userData) {
            toast({
              title: "Remove from Chart",
              description: `Removing ${userData.firstName} ${userData.lastName} from chart`,
              variant: "destructive",
            });
          }
        };

        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg p-4 sm:p-6 border border-orange-100 dark:border-orange-800/30">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Organizational Structure
              </h2>
              <p className="text-sm sm:text-base text-orange-600 dark:text-orange-400">View and manage organizational hierarchy</p>
            </div>
            
            <div className="h-[700px] rounded-lg border bg-card overflow-hidden">
              {allUsers.filter(u => u.isActive).length === 0 ? (
                <Card className="p-12 text-center">
                  <CardContent>
                    <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No organizational structure defined yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Users need to have reporting relationships configured in the User Access Management.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <GoJSOrganogram 
                  users={allUsers}
                  onViewDetails={handleViewDetails}
                  onAddEmployee={handleAddEmployee}
                  onRemoveFromChart={handleRemoveFromChart}
                />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full">
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
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Administration
              </h3>
              <ul className="space-y-1">
                {navigationItems.map((item) => {
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
                    Administration
                  </h3>
                  <ul className="space-y-1">
                    {navigationItems.map((item) => {
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
                            data-testid={`tab-${item.key}`}
                          >
                            <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                            {item.label}
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
                  {activeTab === 'admin' ? 'System Administration' :
                   activeTab === 'hr' ? 'HR Management' :
                   activeTab === 'contact-center' ? 'Contact Center Operations' :
                   activeTab === 'team-leader' ? 'Team Leader Management' :
                   activeTab === 'departments' ? 'Department Management' :
                   activeTab === 'organogram' ? 'Organizational Structure' :
                   'Admin Dashboard'}
                </h1>
                <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 hidden sm:block">
                  {activeTab === 'admin' ? 'Manage users, departments, and system settings' :
                   activeTab === 'hr' ? 'Manage employee lifecycle and HR operations' :
                   activeTab === 'contact-center' ? 'Monitor and manage contact center performance' :
                   activeTab === 'team-leader' ? 'Oversee all team leaders and their teams' :
                   activeTab === 'departments' ? 'Assign users to divisions, departments, and sections' :
                   activeTab === 'organogram' ? 'View and manage organizational hierarchy' :
                   'Comprehensive administration tools'}
                </p>
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationBell />

              <div className="hidden sm:flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-600">
                <div className="flex flex-col items-end justify-center">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight" data-testid="text-username">
                    {currentUser?.firstName && currentUser?.lastName 
                      ? `${currentUser.firstName} ${currentUser.lastName}` 
                      : currentUser?.username || 'Admin'}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight" data-testid="text-user-role">
                    Administrator
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-600"></div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await apiRequest("POST", "/api/logout");
                      window.location.reload();
                    } catch (error) {
                      console.error("Logout failed:", error);
                      window.location.reload();
                    }
                  }}
                  className="h-8 px-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
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
                  onClick={async () => {
                    try {
                      await apiRequest("POST", "/api/logout");
                      window.location.reload();
                    } catch (error) {
                      console.error("Logout failed:", error);
                      window.location.reload();
                    }
                  }}
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
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 bg-background">
          <div className="fade-in">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
