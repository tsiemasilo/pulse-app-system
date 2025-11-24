import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Building2,
  UserCheck,
  UserX,
  MoreHorizontal,
  Eye
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, Department, Division, Section, UserDepartmentAssignment } from "@shared/schema";

export default function HREmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: employees = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: userDepartmentAssignments = [] } = useQuery<UserDepartmentAssignment[]>({
    queryKey: ["/api/user-department-assignments"],
  });

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !searchTerm || 
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || employee.role === filterRole;
    const matchesDepartment = filterDepartment === "all" || employee.departmentId === filterDepartment;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && employee.isActive) ||
      (filterStatus === "inactive" && !employee.isActive);

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const getRoleDisplay = (role: string | null) => {
    const roleMap: Record<string, string> = {
      'admin': 'System Admin',
      'hr': 'HR Manager',
      'contact_center_ops_manager': 'Contact Center Ops Manager',
      'contact_center_manager': 'Contact Center Manager',
      'team_leader': 'Team Leader',
      'agent': 'Agent'
    };
    return role ? roleMap[role] || role : 'No Role';
  };

  const getRoleColor = (role: string | null) => {
    const colorMap: Record<string, string> = {
      'admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'hr': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'contact_center_ops_manager': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'contact_center_manager': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'team_leader': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'agent': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return role ? colorMap[role] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
  };

  const getDepartmentInfo = (userId: string) => {
    // Get all assignments for this user
    const userAssignments = userDepartmentAssignments.filter(a => a.userId === userId);
    
    if (userAssignments.length > 0) {
      // If user has multiple assignments, show all sections
      if (userAssignments.length > 1) {
        const sectionNames = userAssignments
          .map(assignment => {
            const section = sections.find(s => s.id === assignment.sectionId);
            return section?.name;
          })
          .filter(Boolean)
          .join(', ');
        
        // Get division and department from first assignment (assuming same division/dept)
        const firstAssignment = userAssignments[0];
        const parts: string[] = [];
        
        if (firstAssignment.divisionId) {
          const division = divisions.find(d => d.id === firstAssignment.divisionId);
          if (division) parts.push(division.name);
        }
        
        if (firstAssignment.departmentId) {
          const department = departments.find(d => d.id === firstAssignment.departmentId);
          if (department) parts.push(department.name);
        }
        
        if (sectionNames) {
          parts.push(sectionNames);
        }
        
        return parts.length > 0 ? parts.join(' → ') : 'No Department';
      }
      
      // Single assignment
      const assignment = userAssignments[0];
      const parts: string[] = [];
      
      if (assignment.divisionId) {
        const division = divisions.find(d => d.id === assignment.divisionId);
        if (division) parts.push(division.name);
      }
      
      if (assignment.departmentId) {
        const department = departments.find(d => d.id === assignment.departmentId);
        if (department) parts.push(department.name);
      }
      
      if (assignment.sectionId) {
        const section = sections.find(s => s.id === assignment.sectionId);
        if (section) parts.push(section.name);
      }
      
      return parts.length > 0 ? parts.join(' → ') : 'No Department';
    }
    
    // Fall back to legacy departmentId field
    const employee = employees.find(e => e.id === userId);
    if (employee?.departmentId) {
      const department = departments.find(dept => dept.id === employee.departmentId);
      return department?.name || 'Unknown Department';
    }
    
    return 'No Department';
  };

  const getEmployeeStats = () => {
    const total = employees.length;
    const active = employees.filter(emp => emp.isActive).length;
    const inactive = total - active;
    const byRole = employees.reduce((acc, emp) => {
      const role = emp.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, active, inactive, byRole };
  };

  const stats = getEmployeeStats();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-96">Loading employees...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Employee Directory</h2>
            <p className="text-blue-600 dark:text-blue-400">Manage and view all company employees</p>
          </div>
          <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Departments</p>
                <p className="text-2xl font-bold text-purple-600">{departments.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-employees"
              />
            </div>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger data-testid="select-filter-role">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">System Admin</SelectItem>
                <SelectItem value="hr">HR Manager</SelectItem>
                <SelectItem value="contact_center_ops_manager">Contact Center Ops Manager</SelectItem>
                <SelectItem value="contact_center_manager">Contact Center Manager</SelectItem>
                <SelectItem value="team_leader">Team Leader</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger data-testid="select-filter-department">
                <SelectValue placeholder="Filter by Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="select-filter-status">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setFilterRole("all");
                setFilterDepartment("all");
                setFilterStatus("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Directory ({filteredEmployees.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                Showing {filteredEmployees.length} of {employees.length} employees
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow" data-testid={`card-employee-${employee.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{employee.username}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getRoleColor(employee.role)}`}>
                        {getRoleDisplay(employee.role)}
                      </Badge>
                    </div>

                    {employee.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Building2 className="h-4 w-4" />
                      <span>{getDepartmentInfo(employee.id)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {new Date(employee.createdAt || '').toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No employees found matching your criteria.</p>
              <p className="text-sm mt-2">Try adjusting your search or filter settings.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}