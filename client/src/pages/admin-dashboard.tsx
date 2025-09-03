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
    <div className="fade-in">
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
          iconColor="bg-primary/10 text-primary"
          testId="stat-total-users"
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          icon={Users}
          iconColor="bg-green-100 text-green-600"
          testId="stat-active-users"
        />
        <StatCard
          title="Active Assets"
          value={activeAssets}
          icon={Laptop}
          iconColor="bg-secondary/10 text-secondary"
          testId="stat-active-assets"
        />
        <StatCard
          title="Issues"
          value={issues}
          icon={AlertTriangle}
          iconColor="bg-red-100 text-red-600"
          testId="stat-issues"
        />
      </div>

      {/* User Management Section */}
      <UserManagementTable />
    </div>
  );
}
