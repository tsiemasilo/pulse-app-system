import { Network, Plus, Edit, Trash } from "lucide-react";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrganizationalPosition } from "@shared/schema";
import { useState } from "react";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrganizationalPosition | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    parentId: "",
    division: "",
    level: "0",
    displayOrder: "0"
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/organizational-positions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions/hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-positions'] });
      toast({ title: "Position created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create position", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/organizational-positions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions/hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-positions'] });
      toast({ title: "Position updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update position", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/organizational-positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions/hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizational-positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-positions'] });
      toast({ title: "Position deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete position", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      parentId: "",
      division: "",
      level: "0",
      displayOrder: "0"
    });
    setEditingPosition(null);
  };

  const handleEdit = (position: OrganizationalPosition) => {
    setEditingPosition(position);
    setFormData({
      title: position.title,
      subtitle: position.subtitle || "",
      parentId: position.parentId || "",
      division: position.division || "",
      level: position.level.toString(),
      displayOrder: position.displayOrder.toString()
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      level: parseInt(formData.level),
      displayOrder: parseInt(formData.displayOrder),
      parentId: formData.parentId || null,
      subtitle: formData.subtitle || null,
      division: formData.division || null
    };

    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data });
    } else {
      createMutation.mutate(data);
    }
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
                  onClick={() => deleteMutation.mutate(position.id)}
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user || null} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user || null} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="title-organogram">
                Organizational Structure
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Company hierarchy and reporting structure
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-position">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          )}
        </div>

        {hierarchy.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No organizational structure defined yet</p>
            {user?.role === 'admin' && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-position">
                <Plus className="h-4 w-4 mr-2" />
                Create First Position
              </Button>
            )}
          </Card>
        ) : (
          <div className="flex justify-center overflow-x-auto pb-8">
            <div className="min-w-max">
              {hierarchy.map((position) => (
                <OrgNode key={position.id} position={position} />
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <Card className="mt-8 bg-card/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-foreground">Hierarchy Levels</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-300 dark:border-purple-700"></div>
                <span className="text-xs text-muted-foreground">Executive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-300 dark:border-blue-700"></div>
                <span className="text-xs text-muted-foreground">Department Head</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-300 dark:border-green-700"></div>
                <span className="text-xs text-muted-foreground">Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-300 dark:border-orange-700"></div>
                <span className="text-xs text-muted-foreground">Team Leader</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border border-pink-300 dark:border-pink-700"></div>
                <span className="text-xs text-muted-foreground">Agents</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Position Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-position-form">
          <DialogHeader>
            <DialogTitle>{editingPosition ? 'Edit Position' : 'Add New Position'}</DialogTitle>
            <DialogDescription>
              {editingPosition ? 'Update the position details' : 'Create a new organizational position'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Position Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Head of Operations"
                data-testid="input-position-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle (Optional)</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g., Chief Operations Officer"
                data-testid="input-position-subtitle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="division">Division (Optional)</Label>
              <Input
                id="division"
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                placeholder="e.g., RAF, UIF"
                data-testid="input-position-division"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Hierarchy Level</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                <SelectTrigger data-testid="select-position-level">
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
              <Label htmlFor="parentId">Parent Position (Optional)</Label>
              <Select value={formData.parentId} onValueChange={(value) => setFormData({ ...formData, parentId: value })}>
                <SelectTrigger data-testid="select-parent-position">
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Top Level)</SelectItem>
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
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                data-testid="input-display-order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title || createMutation.isPending || updateMutation.isPending} data-testid="button-save-position">
              {editingPosition ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
