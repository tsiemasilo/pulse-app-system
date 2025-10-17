import { Network, Plus, UserPlus, Edit, Trash } from "lucide-react";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrganizationalPosition } from "@shared/schema";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface PositionWithChildren extends OrganizationalPosition {
  children?: PositionWithChildren[];
}

export default function Organogram() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Create Department Dialog State
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrganizationalPosition | null>(null);
  const [deptFormData, setDeptFormData] = useState({
    title: "",
    subtitle: "",
    parentId: "none",
    division: "",
    level: "0",
    displayOrder: "0"
  });

  // Add Position Dialog State
  const [isAddPositionDialogOpen, setIsAddPositionDialogOpen] = useState(false);
  const [addPositionFormData, setAddPositionFormData] = useState({
    positionTitle: "",
    subtitle: "",
    hierarchyLevel: "",
    division: "",
    userName: "",
    isPrimary: true
  });

  const { data: hierarchy = [], isLoading } = useQuery<PositionWithChildren[]>({
    queryKey: ['/api/organizational-positions/hierarchy'],
  });

  const { data: allPositions = [] } = useQuery<OrganizationalPosition[]>({
    queryKey: ['/api/organizational-positions'],
    enabled: user?.role === 'admin',
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });

  const { data: userPositions = [] } = useQuery<any[]>({
    queryKey: ['/api/user-positions'],
    enabled: user?.role === 'admin',
  });

  // Get unique values for dropdowns in Add Position dialog
  const uniqueTitles = useMemo(() => {
    return Array.from(new Set(allPositions.map(p => p.title))).sort();
  }, [allPositions]);

  const uniqueSubtitles = useMemo(() => {
    if (!addPositionFormData.positionTitle) return [];
    return Array.from(new Set(
      allPositions
        .filter(p => p.title === addPositionFormData.positionTitle && p.subtitle)
        .map(p => p.subtitle!)
    )).sort();
  }, [allPositions, addPositionFormData.positionTitle]);

  const uniqueLevels = useMemo(() => {
    if (!addPositionFormData.positionTitle) return [];
    let filtered = allPositions.filter(p => p.title === addPositionFormData.positionTitle);
    if (addPositionFormData.subtitle) {
      filtered = filtered.filter(p => p.subtitle === addPositionFormData.subtitle);
    }
    return Array.from(new Set(filtered.map(p => p.level))).sort();
  }, [allPositions, addPositionFormData.positionTitle, addPositionFormData.subtitle]);

  const uniqueDivisions = useMemo(() => {
    if (!addPositionFormData.positionTitle) return [];
    let filtered = allPositions.filter(p => p.title === addPositionFormData.positionTitle);
    if (addPositionFormData.subtitle) {
      filtered = filtered.filter(p => p.subtitle === addPositionFormData.subtitle);
    }
    if (addPositionFormData.hierarchyLevel) {
      filtered = filtered.filter(p => p.level === parseInt(addPositionFormData.hierarchyLevel));
    }
    return Array.from(new Set(
      filtered.filter(p => p.division).map(p => p.division!)
    )).sort();
  }, [allPositions, addPositionFormData.positionTitle, addPositionFormData.subtitle, addPositionFormData.hierarchyLevel]);

  // Map hierarchy levels to user roles
  const rolesByLevel: Record<number, string[]> = {
    0: ['admin'],
    1: ['hr', 'contact_center_ops_manager'],
    2: ['contact_center_manager'],
    3: ['team_leader'],
    4: ['agent']
  };

  const filteredUsers = useMemo(() => {
    if (!addPositionFormData.hierarchyLevel) return [];
    const level = parseInt(addPositionFormData.hierarchyLevel);
    const roles = rolesByLevel[level] || [];
    return users.filter(u => roles.includes(u.role));
  }, [users, addPositionFormData.hierarchyLevel]);

  const createDeptMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/organizational-positions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions/hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions'] });
      toast({ title: "Department created successfully" });
      setIsDeptDialogOpen(false);
      resetDeptForm();
    },
    onError: () => {
      toast({ title: "Failed to create department", variant: "destructive" });
    }
  });

  const updateDeptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/organizational-positions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions/hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions'] });
      toast({ title: "Department updated successfully" });
      setIsDeptDialogOpen(false);
      resetDeptForm();
    },
    onError: () => {
      toast({ title: "Failed to update department", variant: "destructive" });
    }
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/organizational-positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions/hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-positions'] });
      toast({ title: "Department deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete department", variant: "destructive" });
    }
  });

  const addPositionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/user-positions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions/hierarchy'] });
      toast({ title: "Position assigned successfully" });
      setIsAddPositionDialogOpen(false);
      resetAddPositionForm();
    },
    onError: () => {
      toast({ title: "Failed to assign position", variant: "destructive" });
    }
  });

  const resetDeptForm = () => {
    setDeptFormData({
      title: "",
      subtitle: "",
      parentId: "none",
      division: "",
      level: "0",
      displayOrder: "0"
    });
    setEditingPosition(null);
  };

  const resetAddPositionForm = () => {
    setAddPositionFormData({
      positionTitle: "",
      subtitle: "",
      hierarchyLevel: "",
      division: "",
      userName: "",
      isPrimary: true
    });
  };

  const handleEdit = (position: OrganizationalPosition) => {
    setEditingPosition(position);
    setDeptFormData({
      title: position.title,
      subtitle: position.subtitle || "",
      parentId: position.parentId || "none",
      division: position.division || "",
      level: position.level.toString(),
      displayOrder: position.displayOrder.toString()
    });
    setIsDeptDialogOpen(true);
  };

  const handleDeptSubmit = () => {
    const data = {
      ...deptFormData,
      level: parseInt(deptFormData.level),
      displayOrder: parseInt(deptFormData.displayOrder),
      parentId: deptFormData.parentId || null,
      subtitle: deptFormData.subtitle || null,
      division: deptFormData.division || null
    };

    if (editingPosition) {
      updateDeptMutation.mutate({ id: editingPosition.id, data });
    } else {
      createDeptMutation.mutate(data);
    }
  };

  const handleAddPositionSubmit = () => {
    // Find the matching organizational position
    let matchedPosition = allPositions.find(p => 
      p.title === addPositionFormData.positionTitle &&
      (addPositionFormData.subtitle ? p.subtitle === addPositionFormData.subtitle : true) &&
      (addPositionFormData.hierarchyLevel ? p.level === parseInt(addPositionFormData.hierarchyLevel) : true) &&
      (addPositionFormData.division ? p.division === addPositionFormData.division : true)
    );

    if (!matchedPosition || !addPositionFormData.userName) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
      return;
    }

    const data = {
      userId: addPositionFormData.userName,
      positionId: matchedPosition.id,
      isPrimary: addPositionFormData.isPrimary
    };

    addPositionMutation.mutate(data);
  };

  const getLevelLabel = (level: number) => {
    const labels: Record<number, string> = {
      0: "0 - Executive",
      1: "1 - Department Head",
      2: "2 - Manager",
      3: "3 - Team Leader",
      4: "4 - Agents"
    };
    return labels[level] || level.toString();
  };

  const OrgNode = ({ 
    position,
    level = 0
  }: { 
    position: PositionWithChildren;
    level?: number;
  }) => {
    const levelColors = {
      0: "bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-300 dark:border-purple-700",
      1: "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300 dark:border-blue-700",
      2: "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700",
      3: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-300 dark:border-orange-700",
      4: "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border-pink-300 dark:border-pink-700"
    };

    const assignedUsers = (userPositions || [])
      .filter((up: any) => up?.positionId === position.id)
      .map((up: any) => (users || []).find((u: any) => u?.id === up?.userId))
      .filter(Boolean);

    return (
      <div className="flex flex-col items-center">
        <Card className={`${levelColors[position.level as keyof typeof levelColors] || levelColors[0]} shadow-md hover:shadow-lg transition-shadow duration-200 group relative`}>
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-sm md:text-base text-foreground" data-testid={`org-node-${position.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {position.title}
              </h3>
              {position.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{position.subtitle}</p>
              )}
              {position.division && (
                <p className="text-xs text-muted-foreground">({position.division})</p>
              )}
              {assignedUsers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-foreground mb-1">Assigned:</p>
                  {assignedUsers.slice(0, 3).map((user: any) => (
                    <p key={user?.id} className="text-xs text-muted-foreground">
                      {user?.firstName} {user?.lastName}
                    </p>
                  ))}
                  {assignedUsers.length > 3 && (
                    <p className="text-xs text-muted-foreground italic">
                      +{assignedUsers.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </div>
            {user?.role === 'admin' && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleEdit(position)}
                  data-testid={`button-edit-${position.id}`}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => deleteDeptMutation.mutate(position.id)}
                  data-testid={`button-delete-${position.id}`}
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {position.children && position.children.length > 0 && (
          <>
            <div className="h-8 w-0.5 bg-border my-2"></div>
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-stretch justify-center">
              {position.children.map((child) => (
                <OrgNode key={child.id} position={child} level={child.level} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Navigation user={user || null} />
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6" />
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="heading-organogram">Organizational Chart</h1>
          </div>
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <Button onClick={() => setIsDeptDialogOpen(true)} data-testid="button-create-department">
                <Plus className="h-4 w-4 mr-2" />
                Create Department
              </Button>
              <Button onClick={() => setIsAddPositionDialogOpen(true)} variant="outline" data-testid="button-add-position">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Position
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : hierarchy.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No organizational structure defined yet.</p>
              {user?.role === 'admin' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Create Department" to add your first position.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto pb-8">
            <div className="min-w-max px-4">
              {hierarchy.map((rootPosition) => (
                <OrgNode key={rootPosition.id} position={rootPosition} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Department Dialog */}
      <Dialog open={isDeptDialogOpen} onOpenChange={(open) => { setIsDeptDialogOpen(open); if (!open) resetDeptForm(); }}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-department">
          <DialogHeader>
            <DialogTitle>{editingPosition ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>
              {editingPosition ? 'Update the department details below.' : 'Define a new department/position in the organizational structure.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Position Title *</Label>
              <Input
                id="title"
                value={deptFormData.title}
                onChange={(e) => setDeptFormData({ ...deptFormData, title: e.target.value })}
                placeholder="e.g., Head of Operations, Team Leader"
                data-testid="input-dept-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={deptFormData.subtitle}
                onChange={(e) => setDeptFormData({ ...deptFormData, subtitle: e.target.value })}
                placeholder="e.g., Chief Operations Officer"
                data-testid="input-dept-subtitle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Hierarchy Level *</Label>
              <Select value={deptFormData.level} onValueChange={(value) => setDeptFormData({ ...deptFormData, level: value })}>
                <SelectTrigger data-testid="select-dept-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Executive</SelectItem>
                  <SelectItem value="1">1 - Department Head</SelectItem>
                  <SelectItem value="2">2 - Manager</SelectItem>
                  <SelectItem value="3">3 - Team Leader</SelectItem>
                  <SelectItem value="4">4 - Agents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="division">Division</Label>
              <Input
                id="division"
                value={deptFormData.division}
                onChange={(e) => setDeptFormData({ ...deptFormData, division: e.target.value })}
                placeholder="e.g., RAF, UIF"
                data-testid="input-dept-division"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Position</Label>
              <Select value={deptFormData.parentId} onValueChange={(value) => setDeptFormData({ ...deptFormData, parentId: value })}>
                <SelectTrigger data-testid="select-dept-parent">
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {allPositions
                    .filter(p => p.id !== editingPosition?.id)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} {p.division ? `(${p.division})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={deptFormData.displayOrder}
                onChange={(e) => setDeptFormData({ ...deptFormData, displayOrder: e.target.value })}
                data-testid="input-dept-display-order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeptDialogOpen(false); resetDeptForm(); }} data-testid="button-cancel-dept">
              Cancel
            </Button>
            <Button onClick={handleDeptSubmit} disabled={!deptFormData.title || createDeptMutation.isPending || updateDeptMutation.isPending} data-testid="button-save-dept">
              {editingPosition ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Position Dialog */}
      <Dialog open={isAddPositionDialogOpen} onOpenChange={(open) => { setIsAddPositionDialogOpen(open); if (!open) resetAddPositionForm(); }}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-position">
          <DialogHeader>
            <DialogTitle>Add Position</DialogTitle>
            <DialogDescription>
              Assign a user to an organizational position.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="positionTitle">Position Title *</Label>
              <Select 
                value={addPositionFormData.positionTitle} 
                onValueChange={(value) => setAddPositionFormData({ 
                  ...addPositionFormData, 
                  positionTitle: value,
                  subtitle: "",
                  hierarchyLevel: "",
                  division: "",
                  userName: ""
                })}
              >
                <SelectTrigger data-testid="select-position-title">
                  <SelectValue placeholder="Select position title" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueTitles.map(title => (
                    <SelectItem key={title} value={title}>{title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addPositionFormData.positionTitle && uniqueSubtitles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Select 
                  value={addPositionFormData.subtitle} 
                  onValueChange={(value) => setAddPositionFormData({ 
                    ...addPositionFormData, 
                    subtitle: value,
                    hierarchyLevel: "",
                    division: "",
                    userName: ""
                  })}
                >
                  <SelectTrigger data-testid="select-position-subtitle">
                    <SelectValue placeholder="Select subtitle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {uniqueSubtitles.map(subtitle => (
                      <SelectItem key={subtitle} value={subtitle}>{subtitle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addPositionFormData.positionTitle && uniqueLevels.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="hierarchyLevel">Hierarchy Level *</Label>
                <Select 
                  value={addPositionFormData.hierarchyLevel} 
                  onValueChange={(value) => setAddPositionFormData({ 
                    ...addPositionFormData, 
                    hierarchyLevel: value,
                    division: "",
                    userName: ""
                  })}
                >
                  <SelectTrigger data-testid="select-position-level">
                    <SelectValue placeholder="Select hierarchy level" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueLevels.map(level => (
                      <SelectItem key={level} value={level.toString()}>{getLevelLabel(level)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addPositionFormData.hierarchyLevel && uniqueDivisions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select 
                  value={addPositionFormData.division} 
                  onValueChange={(value) => setAddPositionFormData({ 
                    ...addPositionFormData, 
                    division: value,
                    userName: ""
                  })}
                >
                  <SelectTrigger data-testid="select-position-division">
                    <SelectValue placeholder="Select division (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {uniqueDivisions.map(division => (
                      <SelectItem key={division} value={division}>{division}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addPositionFormData.hierarchyLevel && (
              <div className="space-y-2">
                <Label htmlFor="userName">Name *</Label>
                <Select 
                  value={addPositionFormData.userName} 
                  onValueChange={(value) => setAddPositionFormData({ ...addPositionFormData, userName: value })}
                >
                  <SelectTrigger data-testid="select-user-name">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddPositionDialogOpen(false); resetAddPositionForm(); }} data-testid="button-cancel-position">
              Cancel
            </Button>
            <Button 
              onClick={handleAddPositionSubmit} 
              disabled={!addPositionFormData.positionTitle || !addPositionFormData.userName || addPositionMutation.isPending} 
              data-testid="button-save-position"
            >
              Add Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
