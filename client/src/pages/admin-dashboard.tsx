import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard-stats";
import UserManagementTable from "@/components/user-management-table";
import { Users, Building2, Laptop, AlertTriangle } from "lucide-react";
import type { User, Asset } from "@shared/schema";

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  // Redirect if not authenticated
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

  if (user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. Admin role required.</div>;
  }

  const activeUsers = allUsers.filter(u => u.isActive).length;
  const activeAssets = assets.filter(a => a.status === 'assigned').length;
  const issues = assets.filter(a => a.status === 'missing').length;

  return (
    <div className="fade-in pb-64">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">System Administration</h1>
        <p className="text-muted-foreground">Manage users, departments, and system settings</p>
      </div>

      {/* Admin Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={allUsers.length}
          icon={Users}
          cardColor="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30"
          textColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/50"
          iconColor="text-blue-600 dark:text-blue-400"
          testId="stat-total-users"
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          icon={Users}
          cardColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30"
          textColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/50"
          iconColor="text-green-600 dark:text-green-400"
          testId="stat-active-users"
        />
        <StatCard
          title="Active Assets"
          value={activeAssets}
          icon={Laptop}
          cardColor="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800/30"
          textColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/50"
          iconColor="text-purple-600 dark:text-purple-400"
          testId="stat-active-assets"
        />
        <StatCard
          title="Issues"
          value={issues}
          icon={AlertTriangle}
          cardColor="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200 dark:border-red-800/30"
          textColor="text-red-600 dark:text-red-400"
          iconBgColor="bg-red-100 dark:bg-red-900/50"
          iconColor="text-red-600 dark:text-red-400"
          testId="stat-issues"
        />
      </div>

      {/* User Management Section */}
      <UserManagementTable />
    </div>
  );
}
