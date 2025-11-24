import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Layers, MapPin, Users, Plus, Trash2, Edit2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { User, Division, Department, Section, UserDepartmentAssignment } from "@shared/schema";

export default function DepartmentManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAssignmentDivision, setSelectedAssignmentDivision] = useState<string>("");
  const [selectedAssignmentDepartment, setSelectedAssignmentDepartment] = useState<string>("");
  const [selectedAssignmentSection, setSelectedAssignmentSection] = useState<string>("");

  // Fetch data
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: assignments = [] } = useQuery<UserDepartmentAssignment[]>({
    queryKey: ["/api/user-department-assignments"],
  });

  // Create assignment mutation
  const createAssignment = useMutation({
    mutationFn: async (data: {
      userId: string;
      divisionId: string;
      departmentId: string;
      sectionId: string;
    }) => {
      const response = await apiRequest("POST", "/api/user-department-assignments", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      toast({
        title: "Assignment Created",
        description: "User has been assigned to the department successfully.",
      });
      setAssignmentDialogOpen(false);
      resetAssignmentForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    },
  });

  // Delete assignment mutation
  const deleteAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiRequest("DELETE", `/api/user-department-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      toast({
        title: "Assignment Removed",
        description: "User assignment has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    },
  });

  const resetAssignmentForm = () => {
    setSelectedUser("");
    setSelectedAssignmentDivision("");
    setSelectedAssignmentDepartment("");
    setSelectedAssignmentSection("");
  };

  const handleCreateAssignment = () => {
    if (!selectedUser || !selectedAssignmentDivision || !selectedAssignmentDepartment || !selectedAssignmentSection) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createAssignment.mutate({
      userId: selectedUser,
      divisionId: selectedAssignmentDivision,
      departmentId: selectedAssignmentDepartment,
      sectionId: selectedAssignmentSection,
    });
  };

  // Get filtered departments based on selected division
  const filteredDepartmentsForAssignment = selectedAssignmentDivision
    ? departments.filter(d => d.divisionId === selectedAssignmentDivision)
    : [];

  // Get filtered sections based on selected department
  const filteredSectionsForAssignment = selectedAssignmentDepartment
    ? sections.filter(s => s.departmentId === selectedAssignmentDepartment)
    : [];

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const user = users.find(u => u.id === assignment.userId);
    const division = divisions.find(d => d.id === assignment.divisionId);
    const department = departments.find(d => d.id === assignment.departmentId);
    const section = sections.find(s => s.id === assignment.sectionId);

    const matchesSearch = searchQuery === "" || 
      user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      division?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      department?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivision = selectedDivision === "all" || assignment.divisionId === selectedDivision;
    const matchesDepartment = selectedDepartment === "all" || assignment.departmentId === selectedDepartment;

    return matchesSearch && matchesDivision && matchesDepartment;
  });

  // Get user details
  const getUserDetails = (userId: string) => users.find(u => u.id === userId);
  const getDivisionName = (divisionId: string | null) => divisionId ? divisions.find(d => d.id === divisionId)?.name || "Unknown" : "Unknown";
  const getDepartmentName = (departmentId: string | null) => departmentId ? departments.find(d => d.id === departmentId)?.name || "Unknown" : "Unknown";
  const getSectionName = (sectionId: string | null) => sectionId ? sections.find(s => s.id === sectionId)?.name || "Unknown" : "Unknown";

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'contact_center_manager':
      case 'contact_center_ops_manager':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'team_leader':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'hr':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      contact_center_manager: 'CC Manager',
      contact_center_ops_manager: 'CC Ops Manager',
      team_leader: 'Team Leader',
      hr: 'HR',
      agent: 'Agent',
    };
    return roleMap[role] || role;
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg p-4 sm:p-6 border border-indigo-100 dark:border-indigo-800/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Department Assignments
            </h2>
            <p className="text-sm sm:text-base text-indigo-600 dark:text-indigo-400">
              Assign employees to divisions, departments, and sections
            </p>
          </div>
          
          <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid="button-create-assignment">
                <Plus className="h-4 w-4" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Department Assignment</DialogTitle>
                <DialogDescription>
                  Assign a user to a division, department, and section
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Employee</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="user" data-testid="select-user">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.isActive).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} - {getRoleLabel(user.role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Select value={selectedAssignmentDivision} onValueChange={(value) => {
                    setSelectedAssignmentDivision(value);
                    setSelectedAssignmentDepartment("");
                    setSelectedAssignmentSection("");
                  }}>
                    <SelectTrigger id="division" data-testid="select-division">
                      <SelectValue placeholder="Select a division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={selectedAssignmentDepartment} 
                    onValueChange={(value) => {
                      setSelectedAssignmentDepartment(value);
                      setSelectedAssignmentSection("");
                    }}
                    disabled={!selectedAssignmentDivision}
                  >
                    <SelectTrigger id="department" data-testid="select-department">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDepartmentsForAssignment.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select 
                    value={selectedAssignmentSection} 
                    onValueChange={setSelectedAssignmentSection}
                    disabled={!selectedAssignmentDepartment}
                  >
                    <SelectTrigger id="section" data-testid="select-section">
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSectionsForAssignment.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAssignmentDialogOpen(false);
                      resetAssignmentForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAssignment}
                    disabled={createAssignment.isPending}
                    data-testid="button-save-assignment"
                  >
                    {createAssignment.isPending ? "Creating..." : "Create Assignment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-division">Division</Label>
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger id="filter-division" data-testid="filter-division">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-department">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger id="filter-department" data-testid="filter-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Assignments</CardTitle>
          <CardDescription>
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No assignments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => {
                    const user = getUserDetails(assignment.userId);
                    if (!user) return null;

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {getDivisionName(assignment.divisionId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            {getDepartmentName(assignment.departmentId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {getSectionName(assignment.sectionId)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAssignment.mutate(assignment.id)}
                            disabled={deleteAssignment.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            data-testid={`button-delete-${assignment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
