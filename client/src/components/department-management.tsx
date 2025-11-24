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

interface SectionSelection {
  id: string;
  divisionId: string;
  departmentId: string;
  sectionId: string;
}

export default function DepartmentManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAssignmentDivision, setSelectedAssignmentDivision] = useState<string>("");
  const [selectedAssignmentDepartment, setSelectedAssignmentDepartment] = useState<string>("");
  const [selectedAssignmentSection, setSelectedAssignmentSection] = useState<string>("");
  const [sectionSelections, setSectionSelections] = useState<SectionSelection[]>([]);

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

  // Create assignment mutation (now supports multiple sections)
  const createAssignment = useMutation({
    mutationFn: async (data: SectionSelection[]) => {
      // Create multiple assignments (one for each section)
      const promises = data.map(section => 
        apiRequest("POST", "/api/user-department-assignments", {
          userId: selectedUser,
          divisionId: section.divisionId,
          departmentId: section.departmentId,
          sectionId: section.sectionId,
        }).then(res => res.json())
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      toast({
        title: "Assignment Created",
        description: `User has been assigned to ${sectionSelections.length} section${sectionSelections.length !== 1 ? 's' : ''} successfully.`,
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

  // Update assignment mutation
  const updateAssignment = useMutation({
    mutationFn: async (data: {
      assignmentId: string;
      divisionId: string;
      departmentId: string;
      sectionId: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/user-department-assignments/${data.assignmentId}`, {
        divisionId: data.divisionId,
        departmentId: data.departmentId,
        sectionId: data.sectionId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      toast({
        title: "Assignment Updated",
        description: "User assignment has been updated successfully.",
      });
      setAssignmentDialogOpen(false);
      resetAssignmentForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
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
    setSectionSelections([]);
    setEditMode(false);
    setEditingAssignmentId("");
  };

  const handleAddSection = () => {
    if (!selectedAssignmentDivision || !selectedAssignmentDepartment || !selectedAssignmentSection) {
      toast({
        title: "Missing Information",
        description: "Please select division, department, and section",
        variant: "destructive",
      });
      return;
    }

    // Check if this section is already added
    const isDuplicate = sectionSelections.some(
      s => s.sectionId === selectedAssignmentSection
    );

    if (isDuplicate) {
      toast({
        title: "Duplicate Section",
        description: "This section has already been added",
        variant: "destructive",
      });
      return;
    }

    setSectionSelections([
      ...sectionSelections,
      {
        id: crypto.randomUUID(),
        divisionId: selectedAssignmentDivision,
        departmentId: selectedAssignmentDepartment,
        sectionId: selectedAssignmentSection,
      },
    ]);

    // Reset section selectors for next addition
    setSelectedAssignmentDivision("");
    setSelectedAssignmentDepartment("");
    setSelectedAssignmentSection("");
  };

  const handleRemoveSection = (id: string) => {
    setSectionSelections(sectionSelections.filter(s => s.id !== id));
  };

  const handleCreateAssignment = () => {
    if (!selectedUser) {
      toast({
        title: "Missing Information",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    if (sectionSelections.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add at least one section",
        variant: "destructive",
      });
      return;
    }

    createAssignment.mutate(sectionSelections);
  };

  const handleEditAssignment = (assignment: UserDepartmentAssignment) => {
    setEditMode(true);
    setEditingAssignmentId(assignment.id);
    setSelectedUser(assignment.userId);
    setSelectedAssignmentDivision(assignment.divisionId || "");
    setSelectedAssignmentDepartment(assignment.departmentId || "");
    setSelectedAssignmentSection(assignment.sectionId || "");
    setAssignmentDialogOpen(true);
  };

  const handleUpdateAssignment = () => {
    if (!selectedAssignmentDivision || !selectedAssignmentDepartment || !selectedAssignmentSection) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    updateAssignment.mutate({
      assignmentId: editingAssignmentId,
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

  // Get all active users with their assignments
  const getUserRows = () => {
    // Create a map of userId to their assignments
    const userAssignmentsMap = new Map<string, UserDepartmentAssignment[]>();
    assignments.forEach(assignment => {
      const existing = userAssignmentsMap.get(assignment.userId) || [];
      userAssignmentsMap.set(assignment.userId, [...existing, assignment]);
    });

    // Get all active users
    const activeUsers = users.filter(u => u.isActive);

    // Create rows for all users
    const rows = activeUsers.map(user => {
      const userAssignments = userAssignmentsMap.get(user.id) || [];
      return {
        user,
        assignments: userAssignments,
      };
    });

    return rows;
  };

  const userRows = getUserRows();

  // Filter user rows
  const filteredUserRows = userRows.filter(row => {
    const { user, assignments: userAssignments } = row;

    // Search filter
    const matchesSearch = searchQuery === "" || 
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userAssignments.some(assignment => {
        const division = divisions.find(d => d.id === assignment.divisionId);
        const department = departments.find(d => d.id === assignment.departmentId);
        const section = sections.find(s => s.id === assignment.sectionId);
        return division?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          department?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      });

    // Role filter
    const matchesRole = selectedRole === "all" || user.role === selectedRole;

    // Division filter
    const matchesDivision = selectedDivision === "all" || 
      userAssignments.some(a => a.divisionId === selectedDivision) ||
      (userAssignments.length === 0 && selectedDivision === "all");

    // Department filter
    const matchesDepartment = selectedDepartment === "all" || 
      userAssignments.some(a => a.departmentId === selectedDepartment) ||
      (userAssignments.length === 0 && selectedDepartment === "all");

    return matchesSearch && matchesRole && matchesDivision && matchesDepartment;
  });

  // Get user details
  const getDivisionName = (divisionId: string | null) => divisionId ? divisions.find(d => d.id === divisionId)?.name || "Unknown" : "Not Assigned";
  const getDepartmentName = (departmentId: string | null) => departmentId ? departments.find(d => d.id === departmentId)?.name || "Unknown" : "Not Assigned";
  const getSectionName = (sectionId: string | null) => sectionId ? sections.find(s => s.id === sectionId)?.name || "Unknown" : "Not Assigned";

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
          
          <Dialog open={assignmentDialogOpen} onOpenChange={(open) => {
            setAssignmentDialogOpen(open);
            if (!open) resetAssignmentForm();
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid="button-create-assignment">
                <Plus className="h-4 w-4" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit" : "Create"} Department Assignment</DialogTitle>
                <DialogDescription>
                  {editMode ? "Update the" : "Assign a user to"} division, department, and section{editMode ? "" : "(s)"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Employee</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser} disabled={editMode}>
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

                {!editMode && (
                  <>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={handleAddSection}
                      className="w-full"
                      data-testid="button-add-section"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>

                    {sectionSelections.length > 0 && (
                      <div className="space-y-2">
                        <Label>Added Sections ({sectionSelections.length})</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                          {sectionSelections.map((selection) => {
                            const division = divisions.find(d => d.id === selection.divisionId);
                            const department = departments.find(d => d.id === selection.departmentId);
                            const section = sections.find(s => s.id === selection.sectionId);
                            
                            return (
                              <div 
                                key={selection.id}
                                className="flex items-center justify-between p-2 bg-muted rounded-md"
                                data-testid={`section-selection-${selection.id}`}
                              >
                                <div className="flex flex-col text-sm">
                                  <span className="font-medium">{section?.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {division?.name} → {department?.name}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveSection(selection.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  data-testid={`button-remove-section-${selection.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAssignmentDialogOpen(false);
                      resetAssignmentForm();
                    }}
                    data-testid="button-cancel-assignment"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={editMode ? handleUpdateAssignment : handleCreateAssignment}
                    disabled={editMode ? updateAssignment.isPending : createAssignment.isPending}
                    data-testid="button-save-assignment"
                  >
                    {editMode 
                      ? (updateAssignment.isPending ? "Updating..." : "Update Assignment")
                      : (createAssignment.isPending ? "Creating..." : "Create Assignment")
                    }
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="filter-role" data-testid="filter-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="contact_center_manager">CC Manager</SelectItem>
                  <SelectItem value="contact_center_ops_manager">CC Ops Manager</SelectItem>
                  <SelectItem value="team_leader">Team Leader</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
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
          <CardTitle className="text-lg">Employee Assignments</CardTitle>
          <CardDescription>
            {filteredUserRows.length} employee{filteredUserRows.length !== 1 ? 's' : ''} found
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
                  <TableHead>Section(s)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUserRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUserRows.map(({ user, assignments: userAssignments }) => {
                    // For users with no assignments
                    if (userAssignments.length === 0) {
                      return (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
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
                            <Badge className={getRoleBadgeColor(user.role)} data-testid={`badge-role-${user.id}`}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">Not Assigned</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">Not Assigned</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">Not Assigned</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-muted-foreground text-sm">-</span>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // For users with one assignment
                    if (userAssignments.length === 1) {
                      const assignment = userAssignments[0];
                      return (
                        <TableRow key={`${user.id}-${assignment.id}`} data-testid={`row-user-${user.id}`}>
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
                            <Badge className={getRoleBadgeColor(user.role)} data-testid={`badge-role-${user.id}`}>
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
                            <Badge variant="outline" data-testid={`badge-section-${assignment.id}`}>
                              {getSectionName(assignment.sectionId)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAssignment(assignment)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                data-testid={`button-edit-${assignment.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
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
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // For users with multiple assignments, show first assignment with all sections as badges
                    const firstAssignment = userAssignments[0];
                    return (
                      <TableRow key={`${user.id}-multiple`} data-testid={`row-user-${user.id}`}>
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
                          <Badge className={getRoleBadgeColor(user.role)} data-testid={`badge-role-${user.id}`}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {getDivisionName(firstAssignment.divisionId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            {getDepartmentName(firstAssignment.departmentId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userAssignments.map((assignment) => (
                              <Badge 
                                key={assignment.id} 
                                variant="outline"
                                data-testid={`badge-section-${assignment.id}`}
                              >
                                {getSectionName(assignment.sectionId)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1">
                            {userAssignments.map((assignment) => (
                              <div key={assignment.id} className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditAssignment(assignment)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  data-testid={`button-edit-${assignment.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
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
                              </div>
                            ))}
                          </div>
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
