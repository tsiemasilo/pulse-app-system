import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, Users, TrendingUp, Clock } from "lucide-react";
import type { User, Team } from "@shared/schema";

export default function ContactCenterDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: agents = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users: User[]) => users.filter(u => u.role === 'agent' && u.isActive),
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

  if (user?.role !== 'contact_center_ops_manager' && user?.role !== 'contact_center_manager' && user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Contact Center management role required.</div>;
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Contact Center Management</h1>
        <p className="text-muted-foreground">Monitor operations and team performance</p>
      </div>

      {/* CC Manager Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Agents"
          value={agents.length}
          icon={Headphones}
          cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
          textColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/50"
          iconColor="text-green-600 dark:text-green-400"
          testId="stat-active-agents"
        />
        <StatCard
          title="Teams"
          value={teams.length}
          icon={Users}
          cardColor="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30"
          textColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/50"
          iconColor="text-blue-600 dark:text-blue-400"
          testId="stat-teams"
        />
        <StatCard
          title="Avg Performance"
          value="87%"
          icon={TrendingUp}
          cardColor="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800/30"
          textColor="text-yellow-600 dark:text-yellow-400"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/50"
          iconColor="text-yellow-600 dark:text-yellow-400"
          testId="stat-avg-performance"
        />
        <StatCard
          title="Utilization"
          value="92%"
          icon={Clock}
          cardColor="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800/30"
          textColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/50"
          iconColor="text-purple-600 dark:text-purple-400"
          testId="stat-utilization"
        />
      </div>

      {/* Team Overview */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No teams found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="bg-muted p-4 rounded-lg" data-testid={`card-team-${team.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground" data-testid={`text-team-name-${team.id}`}>
                      {team.name}
                    </h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    <div>Leader: <span className="text-foreground">To be assigned</span></div>
                    <div>Agents: <span className="text-foreground">0</span></div>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mb-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground">Performance: 85%</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
