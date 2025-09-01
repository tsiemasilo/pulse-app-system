import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import AssetManagement from "@/components/asset-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Clock, Calendar, Laptop, Star, LogIn, LogOut } from "lucide-react";
import type { Attendance, Asset } from "@shared/schema";

export default function AgentDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: myAssets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets/user", user?.id],
    enabled: !!user?.id,
  });

  const clockInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/attendance/clock-in"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/user", user?.id] });
      toast({
        title: "Success",
        description: "Clocked in successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to clock in",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/attendance/clock-out"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/user", user?.id] });
      toast({
        title: "Success",
        description: "Clocked out successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive",
      });
    },
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

  if (user?.role !== 'agent') {
    return <div className="text-center py-8">Access denied. Agent role required.</div>;
  }

  const todayAttendance = myAttendance.find(record => {
    const today = new Date().toDateString();
    return new Date(record.date).toDateString() === today;
  });

  const isClocked = todayAttendance?.clockIn && !todayAttendance?.clockOut;
  const todayHours = todayAttendance?.hoursWorked || 0;
  const weekHours = myAttendance.reduce((total, record) => total + (record.hoursWorked || 0), 0);

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Agent Portal</h1>
        <p className="text-muted-foreground">Your workspace and time tracking</p>
      </div>

      {/* Agent Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Today's Hours"
          value={`${todayHours}h`}
          icon={Clock}
          iconColor="bg-green-100 text-green-600"
          testId="stat-today-hours"
        />
        <StatCard
          title="This Week"
          value={`${weekHours}h`}
          icon={Calendar}
          iconColor="bg-primary/10 text-primary"
          testId="stat-week-hours"
        />
        <StatCard
          title="Assigned Assets"
          value={myAssets.length}
          icon={Laptop}
          iconColor="bg-secondary/10 text-secondary"
          testId="stat-assigned-assets"
        />
        <StatCard
          title="Performance"
          value="94%"
          icon={Star}
          iconColor="bg-purple-100 text-purple-600"
          testId="stat-performance"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Time Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span 
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    isClocked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                  data-testid="badge-clock-status"
                >
                  {isClocked ? 'Clocked In' : 'Clocked Out'}
                </span>
              </div>
              {todayAttendance?.clockIn && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Clock In Time:</span>
                  <span className="text-sm text-foreground" data-testid="text-clock-in-time">
                    {new Date(todayAttendance.clockIn).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              )}
              {isClocked ? (
                <Button 
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  variant="destructive"
                  className="w-full"
                  data-testid="button-clock-out"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </Button>
              ) : (
                <Button 
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                  className="w-full"
                  data-testid="button-clock-in"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <AssetManagement userId={user?.id} />
      </div>
    </div>
  );
}
