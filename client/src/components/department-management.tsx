import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Layers, MapPin, Users, Plus, Trash2, Edit2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { 
  User, 
  Division, 
  Department, 
  Section, 
  UserDepartmentAssignment,
  InsertUserDepartmentAssignment 
} from "@shared/schema";

// Type for section selections in the form (extends the insert type with a temp ID for UI management)
interface SectionSelection extends Omit<InsertUserDepartmentAssignment, 'userId' | 'assignedBy'> {
  tempId: string; // Temporary ID for UI management
  existingId?: string; // ID if this is an existing assignment
}

export default function DepartmentManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAssignmentDivision, setSelectedAssignmentDivision] = useState<string>("");
  const [selectedAssignmentDepartment, setSelectedAssignmentDepartment] = useState<string>("");
  const [selectedAssignmentSection, setSelectedAssignmentSection] = useState<string>("");
  const [sectionSelections, setSectionSelections] = useState<SectionSelection[]>([]);
  const [sectionsToDelete, setSectionsToDelete] = useState<string[]>([]); // Track sections to delete in edit mode
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentsToDelete, setAssignmentsToDelete] = useState<UserDepartmentAssignment[]>([]);
  const [selectedAssignmentsForDeletion, setSelectedAssignmentsForDeletion] = useState<string[]>([]);

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

  // Create assignment mutation (supports multiple sections with proper error handling)
  const createAssignment = useMutation({
    mutationFn: async (data: SectionSelection[]) => {
      const results: Array<{ success: boolean; data?: any; error?: string; section?: SectionSelection }> = [];
      
      // Create assignments sequentially to track successes and failures
      for (const section of data) {
        try {
          const response = await apiRequest("POST", "/api/user-department-assignments", {
            userId: selectedUser,
            divisionId: section.divisionId,
            departmentId: section.departmentId,
            sectionId: section.sectionId,
          });
          const result = await response.json();
          results.push({ success: true, data: result, section });
        } catch (error: any) {
          results.push({ 
            success: false, 
            error: error.message || "Unknown error", 
            section 
          });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);
      
      if (failures.length === 0) {
        toast({
          title: "Assignments Created",
          description: `Successfully assigned user to ${successes.length} section${successes.length !== 1 ? 's' : ''}.`,
        });
        setAssignmentDialogOpen(false);
        resetAssignmentForm();
      } else if (successes.length === 0) {
        toast({
          title: "Assignment Failed",
          description: `Failed to create all ${failures.length} assignment${failures.length !== 1 ? 's' : ''}. Please try again.`,
          variant: "destructive",
        });
      } else {
        // Partial success
        toast({
          title: "Partial Success",
          description: `Created ${successes.length} assignment${successes.length !== 1 ? 's' : ''}, but ${failures.length} failed. Please review and retry failed assignments.`,
          variant: "destructive",
        });
        // Remove successful sections from the form
        setSectionSelections(prev => 
          prev.filter(selection => 
            failures.some(f => f.section?.tempId === selection.tempId)
          )
        );
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignments",
        variant: "destructive",
      });
    },
  });

  // Bulk update mutation for edit mode
  const bulkUpdateAssignments = useMutation({
    mutationFn: async (data: { 
      toDelete: string[], 
      toCreate: SectionSelection[] 
    }) => {
      const results: Array<{ success: boolean; type: 'delete' | 'create'; error?: string }> = [];
      
      // Delete assignments
      for (const assignmentId of data.toDelete) {
        try {
          await apiRequest("DELETE", `/api/user-department-assignments/${assignmentId}`);
          results.push({ success: true, type: 'delete' });
        } catch (error: any) {
          results.push({ success: false, type: 'delete', error: error.message });
        }
      }
      
      // Create new assignments
      for (const section of data.toCreate) {
        try {
          const response = await apiRequest("POST", "/api/user-department-assignments", {
            userId: selectedUser,
            divisionId: section.divisionId,
            departmentId: section.departmentId,
            sectionId: section.sectionId,
          });
          await response.json();
          results.push({ success: true, type: 'create' });
        } catch (error: any) {
          results.push({ success: false, type: 'create', error: error.message });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      
      const failures = results.filter(r => !r.success);
      
      if (failures.length === 0) {
        toast({
          title: "Assignments Updated",
          description: "Successfully updated user assignments.",
        });
        setAssignmentDialogOpen(false);
        resetAssignmentForm();
      } else {
        const deleteFailures = failures.filter(f => f.type === 'delete').length;
        const createFailures = failures.filter(f => f.type === 'create').length;
        
        toast({
          title: "Update Partially Failed",
          description: `Some operations failed: ${deleteFailures} deletion${deleteFailures !== 1 ? 's' : ''}, ${createFailures} creation${createFailures !== 1 ? 's' : ''}. Please review and retry.`,
          variant: "destructive",
        });
        
        // Reset sectionsToDelete to avoid retrying stale deletions on next attempt
        setSectionsToDelete([]);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignments",
        variant: "destructive",
      });
    },
  });

  // Delete single assignment mutation
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

  // Bulk delete assignments mutation
  const bulkDeleteAssignments = useMutation({
    mutationFn: async (assignmentIds: string[]) => {
      const results = [];
      for (const id of assignmentIds) {
        try {
          await apiRequest("DELETE", `/api/user-department-assignments/${id}`);
          results.push({ success: true, id });
        } catch (error: any) {
          results.push({ success: false, id, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-department-assignments"] });
      const failures = results.filter(r => !r.success);
      if (failures.length === 0) {
        toast({
          title: "Assignments Removed",
          description: `Successfully removed ${results.length} assignment${results.length !== 1 ? 's' : ''}.`,
        });
      } else {
        toast({
          title: "Partial Deletion",
          description: `Removed ${results.length - failures.length} assignment${results.length - failures.length !== 1 ? 's' : ''}, ${failures.length} failed.`,
          variant: "destructive",
        });
      }
      setDeleteDialogOpen(false);
      setAssignmentsToDelete([]);
      setSelectedAssignmentsForDeletion([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignments",
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
    setSectionsToDelete([]);
    setEditMode(false);
  };

  const handleOpenDeleteDialog = (userId: string) => {
    const userAssignments = assignments.filter(a => a.userId === userId);
    if (userAssignments.length === 0) {
      toast({
        title: "No Assignments",
        description: "This user has no assignments to delete.",
        variant: "destructive",
      });
      return;
    }
    setAssignmentsToDelete(userAssignments);
    setSelectedAssignmentsForDeletion(userAssignments.map(a => a.id));
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedAssignmentsForDeletion.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one assignment to delete.",
        variant: "destructive",
      });
      return;
    }
    bulkDeleteAssignments.mutate(selectedAssignmentsForDeletion);
  };

  const toggleAssignmentSelection = (assignmentId: string) => {
    setSelectedAssignmentsForDeletion(prev =>
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const selectAllAssignments = () => {
    setSelectedAssignmentsForDeletion(assignmentsToDelete.map(a => a.id));
  };

  const deselectAllAssignments = () => {
    setSelectedAssignmentsForDeletion([]);
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
        tempId: crypto.randomUUID(),
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

  const handleRemoveSection = (tempId: string, existingId?: string) => {
    setSectionSelections(prev => prev.filter(s => s.tempId !== tempId));
    
    // If this was an existing assignment, mark it for deletion
    if (existingId && editMode) {
      setSectionsToDelete(prev => [...prev, existingId]);
    }
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

    // If no sections in list but user has selected division/department/section, add it automatically
    if (sectionSelections.length === 0) {
      if (selectedAssignmentDivision && selectedAssignmentDepartment && selectedAssignmentSection) {
        const newSection: SectionSelection = {
          tempId: crypto.randomUUID(),
          divisionId: selectedAssignmentDivision,
          departmentId: selectedAssignmentDepartment,
          sectionId: selectedAssignmentSection,
        };
        createAssignment.mutate([newSection]);
        return;
      } else {
        toast({
          title: "Missing Information",
          description: "Please select division, department, and section",
          variant: "destructive",
        });
        return;
      }
    }

    createAssignment.mutate(sectionSelections);
  };

  const handleEditUser = (userId: string) => {
    // Get all assignments for this user
    const userAssignments = assignments.filter(a => a.userId === userId);
    
    if (userAssignments.length === 0) {
      toast({
        title: "No Assignments",
        description: "This user has no assignments to edit. Create a new assignment instead.",
        variant: "destructive",
      });
      return;
    }
    
    setEditMode(true);
    setSelectedUser(userId);
    
    // Prepopulate ALL existing sections for this user
    const existingSections: SectionSelection[] = userAssignments.map(assignment => ({
      tempId: crypto.randomUUID(),
      existingId: assignment.id,
      divisionId: assignment.divisionId || "",
      departmentId: assignment.departmentId || "",
      sectionId: assignment.sectionId || "",
    }));
    
    setSectionSelections(existingSections);
    setSectionsToDelete([]);
    setAssignmentDialogOpen(true);
  };

  const handleUpdateAssignments = () => {
    // Allow saving even if all sections are removed (deletion only)
    if (sectionSelections.length === 0 && sectionsToDelete.length === 0) {
      toast({
        title: "No Changes",
        description: "No changes to save",
        variant: "destructive",
      });
      return;
    }

    // Separate new assignments from existing ones
    const newSections = sectionSelections.filter(s => !s.existingId);
    
    // If user removed all sections and has nothing new to add, we're deleting all
    bulkUpdateAssignments.mutate({
      toDelete: sectionsToDelete,
      toCreate: newSections,
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

    // Role filter - compare raw enum values
    const matchesRole = selectedRole === "all" || user.role === selectedRole;

    // Division filter - include unassigned users when "all" is selected
    const matchesDivision = selectedDivision === "all" || 
      userAssignments.some(a => a.divisionId === selectedDivision);

    // Department filter - include unassigned users when "all" is selected
    const matchesDepartment = selectedDepartment === "all" || 
      userAssignments.some(a => a.departmentId === selectedDepartment);

    return matchesSearch && matchesRole && matchesDivision && matchesDepartment;
  });

  // Get user details
  const getDivisionName = (divisionId: string | null) => 
    divisionId ? divisions.find(d => d.id === divisionId)?.name || "Unknown" : null;
  
  const getDepartmentName = (departmentId: string | null) => 
    departmentId ? departments.find(d => d.id === departmentId)?.name || "Unknown" : null;
  
  const getSectionName = (sectionId: string | null) => 
    sectionId ? sections.find(s => s.id === sectionId)?.name || "Unknown" : null;

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

  // Pagination logic - clamp page synchronously to handle data mutations
  const totalPages = Math.ceil(filteredUserRows.length / recordsPerPage);
  const safePage = Math.max(1, Math.min(currentPage, Math.max(totalPages, 1)));
  const startIndex = (safePage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedUserRows = filteredUserRows.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (safePage < totalPages) {
      setCurrentPage(safePage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (safePage > 1) {
      setCurrentPage(safePage - 1);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedDivision, selectedDepartment]);

  // Sync currentPage state with safePage when they diverge (after data mutations)
  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [safePage, currentPage]);

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
                <DialogTitle>{editMode ? "Edit" : "Create"} Department Assignment{editMode ? "s" : ""}</DialogTitle>
                <DialogDescription>
                  {editMode ? "Modify user's sections - add new ones or remove existing ones" : "Assign a user to one or more sections"}
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

                {/* Existing sections list */}
                {sectionSelections.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      {editMode ? "Current Sections" : "Added Sections"} ({sectionSelections.length})
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {sectionSelections.map((selection) => {
                        const division = divisions.find(d => d.id === selection.divisionId);
                        const department = departments.find(d => d.id === selection.departmentId);
                        const section = sections.find(s => s.id === selection.sectionId);
                        
                        return (
                          <div 
                            key={selection.tempId}
                            className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md"
                            data-testid={`section-item-${selection.tempId}`}
                          >
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge variant="outline" data-testid={`badge-section-${selection.tempId}`}>
                                {section?.name || "Unknown"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {division?.name} → {department?.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSection(selection.tempId, selection.existingId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                              data-testid={`button-remove-section-${selection.tempId}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add new section form */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm font-semibold">
                    {editMode ? "Add New Section" : "Select Section"}
                  </Label>
                  
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
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
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
                    onClick={editMode ? handleUpdateAssignments : handleCreateAssignment}
                    disabled={editMode ? bulkUpdateAssignments.isPending : createAssignment.isPending}
                    data-testid="button-save-assignment"
                  >
                    {editMode 
                      ? (bulkUpdateAssignments.isPending ? "Updating..." : "Save Changes")
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
            {filteredUserRows.length > 0 
              ? `Showing ${Math.min(startIndex + 1, filteredUserRows.length)} to ${Math.min(endIndex, filteredUserRows.length)} of ${filteredUserRows.length} employee${filteredUserRows.length !== 1 ? 's' : ''}`
              : 'No employees found'
            }
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
                {paginatedUserRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUserRows.map(({ user, assignments: userAssignments }) => {
                    // For users with no assignments
                    if (userAssignments.length === 0) {
                      return (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium" data-testid={`text-name-${user.id}`}>
                                {user.firstName} {user.lastName}
                              </span>
                              <span className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                                {user.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm" data-testid={`text-role-${user.id}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground" data-testid={`text-division-unassigned-${user.id}`}>
                              Not Assigned
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground" data-testid={`text-department-unassigned-${user.id}`}>
                              Not Assigned
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground" data-testid={`text-section-unassigned-${user.id}`}>
                              Not Assigned
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user.id);
                                setEditMode(false);
                                setAssignmentDialogOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              data-testid={`button-assign-${user.id}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // For users with one assignment
                    if (userAssignments.length === 1) {
                      const assignment = userAssignments[0];
                      const divisionName = getDivisionName(assignment.divisionId);
                      const departmentName = getDepartmentName(assignment.departmentId);
                      const sectionName = getSectionName(assignment.sectionId);
                      
                      return (
                        <TableRow key={`${user.id}-${assignment.id}`} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium" data-testid={`text-name-${user.id}`}>
                                {user.firstName} {user.lastName}
                              </span>
                              <span className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                                {user.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm" data-testid={`text-role-${user.id}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {divisionName ? (
                              <div className="flex items-center gap-2" data-testid={`text-division-${assignment.id}`}>
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {divisionName}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground" data-testid={`text-division-unassigned-${assignment.id}`}>
                                Not Assigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {departmentName ? (
                              <div className="flex items-center gap-2" data-testid={`text-department-${assignment.id}`}>
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                {departmentName}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground" data-testid={`text-department-unassigned-${assignment.id}`}>
                                Not Assigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {sectionName ? (
                              <div className="flex items-center gap-2" data-testid={`text-section-${assignment.id}`}>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {sectionName}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground" data-testid={`text-section-unassigned-${assignment.id}`}>
                                Not Assigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user.id)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDeleteDialog(user.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // For users with multiple assignments
                    const firstAssignment = userAssignments[0];
                    const divisionName = getDivisionName(firstAssignment.divisionId);
                    const departmentName = getDepartmentName(firstAssignment.departmentId);
                    
                    return (
                      <TableRow key={`${user.id}-multiple`} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium" data-testid={`text-name-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-role-${user.id}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {divisionName ? (
                            <div className="flex items-center gap-2" data-testid={`text-division-${user.id}`}>
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {divisionName}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground" data-testid={`text-division-unassigned-${user.id}`}>
                              Not Assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {departmentName ? (
                            <div className="flex items-center gap-2" data-testid={`text-department-${user.id}`}>
                              <Layers className="h-4 w-4 text-muted-foreground" />
                              {departmentName}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground" data-testid={`text-department-unassigned-${user.id}`}>
                              Not Assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {userAssignments.map((assignment) => {
                              const sectionName = getSectionName(assignment.sectionId);
                              return sectionName ? (
                                <div 
                                  key={assignment.id}
                                  className="flex items-center gap-2"
                                  data-testid={`text-section-${assignment.id}`}
                                >
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  {sectionName}
                                </div>
                              ) : (
                                <span 
                                  key={assignment.id}
                                  className="text-sm text-muted-foreground"
                                  data-testid={`text-section-unassigned-${assignment.id}`}
                                >
                                  Not Assigned
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user.id)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDeleteDialog(user.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t pt-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={safePage === 1}
                data-testid="button-previous-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={safePage >= totalPages || totalPages === 0}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department Assignments</AlertDialogTitle>
            <AlertDialogDescription>
              Select which assignments to remove for this user. You can select individual assignments or remove all.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 my-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-medium">Assignments to delete:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllAssignments}
                  data-testid="button-select-all-assignments"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAllAssignments}
                  data-testid="button-deselect-all-assignments"
                >
                  Deselect All
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {assignmentsToDelete.map((assignment) => {
                const division = divisions.find(d => d.id === assignment.divisionId);
                const department = departments.find(d => d.id === assignment.departmentId);
                const section = sections.find(s => s.id === assignment.sectionId);
                const isSelected = selectedAssignmentsForDeletion.includes(assignment.id);
                
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 p-3 border rounded-md hover-elevate cursor-pointer"
                    onClick={() => toggleAssignmentSelection(assignment.id)}
                    data-testid={`delete-assignment-item-${assignment.id}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleAssignmentSelection(assignment.id)}
                      data-testid={`checkbox-assignment-${assignment.id}`}
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" data-testid={`badge-section-${assignment.id}`}>
                          {section?.name || "Unknown"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {division?.name} → {department?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {selectedAssignmentsForDeletion.length} of {assignmentsToDelete.length} assignment{assignmentsToDelete.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={bulkDeleteAssignments.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              {bulkDeleteAssignments.isPending ? "Deleting..." : "Delete Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
