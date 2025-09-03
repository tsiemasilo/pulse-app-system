import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import AttendanceTable from "@/components/attendance-table";
import AssetManagement from "@/components/asset-management";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Users, UserCheck, Clock, Laptop } from "lucide-react";
import type { User, Attendance, Asset } from "@shared/schema";

export default function TeamLeaderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: teamAssets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
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

  if (user?.role !== 'team_leader' && user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Team Leader role required.</div>;
  }

  // Mock team stats for demo
  const teamSize = 23;
  const presentToday = attendanceRecords.filter(record => record.status === 'present').length;
  const lateArrivals = attendanceRecords.filter(record => record.status === 'late').length;
  const assignedAssets = teamAssets.filter(asset => asset.status === 'assigned').length;

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Team Leadership</h1>
        <p className="text-muted-foreground">Manage your team's attendance, assets, and performance</p>
      </div>

      {/* TL Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Team Size"
          value={teamSize}
          icon={Users}
          iconColor="bg-primary/10 text-primary"
          testId="stat-team-size"
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={UserCheck}
          iconColor="bg-green-100 text-green-600"
          testId="stat-present-today"
        />
        <StatCard
          title="Late Arrivals"
          value={lateArrivals}
          icon={Clock}
          iconColor="bg-yellow-100 text-yellow-600"
          testId="stat-late-arrivals"
        />
        <StatCard
          title="Assets Assigned"
          value={assignedAssets}
          icon={Laptop}
          iconColor="bg-secondary/10 text-secondary"
          testId="stat-assets-assigned"
        />
      </div>

      {/* Attendance Management */}
      <div className="mb-8">
        <AttendanceTable />
      </div>
    </div>
  );
}
