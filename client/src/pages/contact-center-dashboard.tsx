import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import TeamLeaderView from "@/components/team-leader-view";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Users, Eye } from "lucide-react";
import type { User } from "@shared/schema";

export default function ContactCenterDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.reload();
    }
  };

  // Fetch team leaders reporting to this manager
  const { data: teamLeaders = [], isLoading: isLoadingTeamLeaders } = useQuery<User[]>({
    queryKey: ["/api/managers", user?.id, "team-leaders"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/managers/${user.id}/team-leaders`);
      return await response.json() as User[];
    },
    enabled: !!user?.id && (user.role === 'contact_center_manager' || user.role === 'contact_center_ops_manager' || user.role === 'admin'),
  });

  // Auto-select the first team leader when data loads
  useEffect(() => {
    if (teamLeaders.length > 0 && !selectedTeamLeaderId) {
      setSelectedTeamLeaderId(teamLeaders[0].id);
    }
  }, [teamLeaders, selectedTeamLeaderId]);

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

  if (user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager' && user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Contact Center Manager role required.</div>;
  }

  // Show loading state while fetching team leaders
  if (isLoadingTeamLeaders) {
    return <div className="flex items-center justify-center min-h-screen">Loading team leaders...</div>;
  }

  // Show empty state if no team leaders found
  if (teamLeaders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-bold">No Team Leaders Found</h2>
              <p className="text-muted-foreground">
                You don't have any team leaders assigned to you yet. Contact your administrator to assign team leaders.
              </p>
              <Button onClick={handleLogout} className="mt-4">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedTeamLeader = teamLeaders.find(tl => tl.id === selectedTeamLeaderId);

  return (
    <div className="relative">
      {/* Header with Team Leader Switcher and Logout */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Team Leader Switcher */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Viewing:
              </span>
              <Select 
                value={selectedTeamLeaderId || undefined} 
                onValueChange={setSelectedTeamLeaderId}
              >
                <SelectTrigger className="w-full max-w-xs" data-testid="select-team-leader">
                  <SelectValue placeholder="Select a team leader" />
                </SelectTrigger>
                <SelectContent>
                  {teamLeaders.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {leader.firstName?.[0] || ''}{leader.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {leader.firstName} {leader.lastName}
                          {leader.email && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({leader.email})
                            </span>
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.role === 'contact_center_ops_manager' ? 'CC Ops Manager' : 'CC Manager'}
                </p>
              </div>
            </div>
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
      </div>

      {/* Main Content - Adjust top padding to account for fixed header */}
      <div className="pt-[60px]">
        {selectedTeamLeaderId && user && (
          <TeamLeaderView 
            leaderId={selectedTeamLeaderId} 
            isReadOnly={true} 
            currentUser={user}
          />
        )}
      </div>
    </div>
  );
}
