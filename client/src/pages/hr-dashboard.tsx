import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import TransferManagement from "@/components/transfer-management";
import TerminationManagement from "@/components/termination-management";
import AssetManagement from "@/components/asset-management";
import HRAttendanceView from "@/components/hr-attendance-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, CalendarX, UserX, ArrowLeftRight, UserPlus, Laptop, Clock, Users } from "lucide-react";
import type { User, Attendance } from "@shared/schema";

export default function HRDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
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

  if (user?.role !== 'hr') {
    return <div className="text-center py-8">Access denied. HR role required.</div>;
  }

  const presentToday = attendanceRecords.filter(record => record.status === 'present').length;
  const onLeave = attendanceRecords.filter(record => record.status === 'leave').length;
  const absent = attendanceRecords.filter(record => record.status === 'absent').length;
  const totalEmployees = allUsers.filter(u => u.isActive).length;

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">HR Dashboard</h1>
        <p className="text-muted-foreground">Manage employee lifecycle and workforce operations</p>
      </div>

      {/* HR Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={UserCheck}
          iconColor="bg-green-100 text-green-600"
          testId="stat-present-today"
        />
        <StatCard
          title="On Leave"
          value={onLeave}
          icon={CalendarX}
          iconColor="bg-yellow-100 text-yellow-600"
          testId="stat-on-leave"
        />
        <StatCard
          title="Absent"
          value={absent}
          icon={UserX}
          iconColor="bg-red-100 text-red-600"
          testId="stat-absent"
        />
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          icon={ArrowLeftRight}
          iconColor="bg-blue-100 text-blue-600"
          testId="stat-total-employees"
        />
      </div>

      {/* HR Management Tabs */}
      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center">
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="terminations" className="flex items-center">
            <UserX className="h-4 w-4 mr-2" />
            Terminations
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center">
            <Laptop className="h-4 w-4 mr-2" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <HRAttendanceView />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <TransferManagement />
        </TabsContent>

        <TabsContent value="terminations" className="space-y-6">
          <TerminationManagement />
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          <AssetManagement showActions={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
